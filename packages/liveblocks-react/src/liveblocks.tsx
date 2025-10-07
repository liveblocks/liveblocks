import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ClientOptions,
  ThreadData,
} from "@liveblocks/client";
import type {
  AiUserMessage,
  AsyncResult,
  BaseGroupInfo,
  BaseRoomInfo,
  CopilotId,
  DM,
  DU,
  LiveblocksError,
  MessageId,
  OpaqueClient,
  PartialNotificationSettings,
  Status,
  SyncStatus,
  WithRequired,
} from "@liveblocks/core";
import {
  assert,
  console,
  createClient,
  DefaultMap,
  HttpError,
  kInternal,
  makePoller,
  raise,
  shallow,
} from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { RegisterAiKnowledge, RegisterAiTool } from "./ai";
import { config } from "./config";
import {
  ClientContext,
  useClient,
  useClientOrNull,
  useIsInsideRoom,
} from "./contexts";
import { ASYNC_OK } from "./lib/AsyncResult";
import { ensureNotServerSide } from "./lib/ssr";
import { useInitial, useInitialUnlessFunction } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { use } from "./lib/use-polyfill";
import type {
  AiChatAsyncResult,
  AiChatAsyncSuccess,
  AiChatMessagesAsyncResult,
  AiChatMessagesAsyncSuccess,
  AiChatsAsyncResult,
  AiChatsAsyncSuccess,
  AiChatStatus,
  CreateAiChatOptions,
  GroupInfoAsyncResult,
  GroupInfoAsyncSuccess,
  InboxNotificationsAsyncResult,
  LiveblocksContextBundle,
  NotificationSettingsAsyncResult,
  NotificationSettingsAsyncSuccess,
  RoomInfoAsyncResult,
  RoomInfoAsyncSuccess,
  SendAiMessageOptions,
  SharedContextBundle,
  ThreadsAsyncResult,
  ThreadsAsyncSuccess,
  UnreadInboxNotificationsCountAsyncResult,
  UseAiChatsOptions,
  UseInboxNotificationsOptions,
  UserAsyncResult,
  UserAsyncSuccess,
  UseSendAiMessageOptions,
  UseSyncStatusOptions,
  UseUserThreadsOptions,
} from "./types";
import {
  makeAiChatsQueryKey,
  makeInboxNotificationsQueryKey,
  makeUserThreadsQueryKey,
  UmbrellaStore,
} from "./umbrella-store";
import { useSignal } from "./use-signal";
import { useSyncExternalStoreWithSelector } from "./use-sync-external-store-with-selector";

function missingUserError(userId: string) {
  return new Error(`resolveUsers didn't return anything for user '${userId}'`);
}

function missingRoomInfoError(roomId: string) {
  return new Error(
    `resolveRoomsInfo didn't return anything for room '${roomId}'`
  );
}

function missingGroupInfoError(groupId: string) {
  return new Error(
    `resolveGroupsInfo didn't return anything for group '${groupId}'`
  );
}

function identity<T>(x: T): T {
  return x;
}

const _umbrellaStores = new WeakMap<
  OpaqueClient,
  UmbrellaStore<BaseMetadata>
>();
const _extras = new WeakMap<
  OpaqueClient,
  ReturnType<typeof makeLiveblocksExtrasForClient>
>();
const _bundles = new WeakMap<
  OpaqueClient,
  LiveblocksContextBundle<BaseUserMeta, BaseMetadata>
>();

function selectorFor_useUnreadInboxNotificationsCount(
  result: UnreadInboxNotificationsCountAsyncResult
): UnreadInboxNotificationsCountAsyncResult {
  if (!("count" in result) || result.count === undefined) {
    // Can be loading or error states
    return result;
  }

  return ASYNC_OK("count", result.count);
}

function selectorFor_useUser<U extends BaseUserMeta>(
  state: AsyncResult<U["info"] | undefined> | undefined,
  userId: string
): UserAsyncResult<U["info"]> {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  // If this is a "success" state, but there still is no data, then it means
  // the "resolving of this user" returned undefined. In that case, still treat
  // this as an error state.
  if (!state.data) {
    return {
      isLoading: false,
      error: missingUserError(userId),
    };
  }

  return {
    isLoading: false,
    user: state.data,
  };
}

function selectorFor_useRoomInfo(
  state: AsyncResult<BaseRoomInfo | undefined> | undefined,
  roomId: string
): RoomInfoAsyncResult {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  // If this is a "success" state, but there still is no data, then it means
  // the "resolving of this room info" returned undefined. In that case, still treat
  // this as an error state.
  if (!state.data) {
    return {
      isLoading: false,
      error: missingRoomInfoError(roomId),
    };
  }

  return {
    isLoading: false,
    info: state.data,
  };
}

function selectorFor_useGroupInfo(
  state: AsyncResult<BaseGroupInfo | undefined> | undefined,
  groupId: string
): GroupInfoAsyncResult {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  // If this is a "success" state, but there still is no data, then it means
  // the "resolving of this group info" returned undefined. In that case, still treat
  // this as an error state.
  if (!state.data) {
    return {
      isLoading: false,
      error: missingGroupInfoError(groupId),
    };
  }

  return {
    isLoading: false,
    info: state.data,
  };
}

function getOrCreateContextBundle<
  U extends BaseUserMeta,
  M extends BaseMetadata,
>(client: OpaqueClient): LiveblocksContextBundle<U, M> {
  let bundle = _bundles.get(client);
  if (!bundle) {
    bundle = makeLiveblocksContextBundle(client);
    _bundles.set(client, bundle);
  }
  return bundle as LiveblocksContextBundle<U, M>;
}

/**
 * Gets or creates a unique Umbrella store for each unique client instance.
 *
 * @private
 */
export function getUmbrellaStoreForClient<M extends BaseMetadata>(
  client: OpaqueClient
): UmbrellaStore<M> {
  let store = _umbrellaStores.get(client);
  if (!store) {
    store = new UmbrellaStore(client);
    _umbrellaStores.set(client, store);
  }
  return store as unknown as UmbrellaStore<M>;
}

// TODO: Likely a better / more clear name for this helper will arise. I'll
// rename this later. All of these are implementation details to support inbox
// notifications on a per-client basis.
/** @internal Only exported for unit tests. */
export function getLiveblocksExtrasForClient<M extends BaseMetadata>(
  client: OpaqueClient
) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeLiveblocksExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: UmbrellaStore<M>;
  };
}

// Connect to the AI socket whenever this hook is called, to use in all AI-related hooks.
//
// The internal `ManagedSocket` no-ops when calling `connect()` if it is already connected,
// so we don't need any conditional logic here. And we don't call `disconnect()` in cleanup
// here because we don't want to disconnect whenever a single hook unmounts, instead we
// disconnect when `LiveblocksProvider` unmounts.
//
// This is a short-term solution to avoid always asking for an auth token on mount
// even when AI isn't used.
//
// - We maybe could disconnect whenever the last AI-related hook unmounts
// - We maybe could avoid connecting if we already have a token (from another Liveblocks feature),
//   and already know that the user doesn't have AI enabled
function useEnsureAiConnection(client: OpaqueClient) {
  useEffect(() => {
    client[kInternal].ai.connectInitially();
  }, [client]);
}

function makeLiveblocksExtrasForClient(client: OpaqueClient) {
  const store = getUmbrellaStoreForClient(client);
  // TODO                                ^ Bind to M type param here

  //
  // How pagination and delta updates work
  // =====================================
  //
  // Suppose we call fetchInboxNotifications() for the first time. Then,
  // eventually we'll see this timeline of notifications:
  //
  // <-- Newer                        Older -->
  //       |---o---------o----------o---|
  //
  //       o = an inbox notification
  //
  // In this array, there are three entries, ordered from latest to oldest.
  //
  // Now if we call fetchInboxNotifications() again (which is what the
  // periodic poller does), then the array may get updated with newer inbox
  // notifications, meaning entries will appear at the head end of the array.
  // This is a so called "delta update".
  //
  // <-- Newer                                 Older -->
  //       |--o---o-|---o---------o----------o---|
  //          delta
  //
  // Here, two new entries have appeared at the start.
  //
  // Another way to update this array is to use "pagination". Pagination will
  // update this list at the _tail_ end.
  //
  // After calling fetchMore():
  //
  // <-- Newer                                                  Older -->
  //       |--o---o-|---o---------o----------o---|--o--o-o-o-o-o--|
  //                                                   page 2
  //
  // And calling fetchMore() another time:
  //
  // <-- Newer                                                                  Older -->
  //       |--o---o-|---o---------o----------o---|--o--o-o-o-o-o--|--o-o---o---o--|
  //                                                   page 2           page 3
  //
  // In terms of HTTP requests:
  // - A delta update will perform a GET /v2/c/inbox-notifications?since=...
  // - Pagination will perform a GET /v2/c/inbox-notifications?cursor=...
  //

  const notificationsPoller = makePoller(
    async (signal) => {
      try {
        return await store.fetchNotificationsDeltaUpdate(signal);
      } catch (err) {
        console.warn(`Polling new inbox notifications failed: ${String(err)}`);
        throw err;
      }
    },
    config.NOTIFICATIONS_POLL_INTERVAL,
    { maxStaleTimeMs: config.NOTIFICATIONS_MAX_STALE_TIME }
  );

  const unreadNotificationsCountPollersByQueryKey = new DefaultMap(
    (queryKey: string) =>
      makePoller(
        async (signal) => {
          try {
            return await store.fetchUnreadNotificationsCount(queryKey, signal);
          } catch (err) {
            console.warn(
              `Polling unread inbox notifications countfailed: ${String(err)}`
            );
            throw err;
          }
        },
        config.NOTIFICATIONS_POLL_INTERVAL,
        { maxStaleTimeMs: config.NOTIFICATIONS_MAX_STALE_TIME }
      )
  );

  const userThreadsPoller = makePoller(
    async (signal) => {
      try {
        return await store.fetchUserThreadsDeltaUpdate(signal);
      } catch (err) {
        console.warn(`Polling new user threads failed: ${String(err)}`);
        throw err;
      }
    },
    config.USER_THREADS_POLL_INTERVAL,
    { maxStaleTimeMs: config.USER_THREADS_MAX_STALE_TIME }
  );

  const notificationSettingsPoller = makePoller(
    async (signal) => {
      try {
        return await store.refreshNotificationSettings(signal);
      } catch (err) {
        console.warn(
          `Polling new notification settings failed: ${String(err)}`
        );
        throw err;
      }
    },
    config.USER_NOTIFICATION_SETTINGS_INTERVAL,
    { maxStaleTimeMs: config.USER_NOTIFICATION_SETTINGS_MAX_STALE_TIME }
  );

  return {
    store,
    notificationsPoller,
    userThreadsPoller,
    notificationSettingsPoller,
    unreadNotificationsCountPollersByQueryKey,
  };
}

function makeLiveblocksContextBundle<
  U extends BaseUserMeta,
  M extends BaseMetadata,
>(client: Client<U>): LiveblocksContextBundle<U, M> {
  // Bind all hooks to the current client instance
  const useInboxNotificationThread = (inboxNotificationId: string) =>
    useInboxNotificationThread_withClient<M>(client, inboxNotificationId);

  const useMarkInboxNotificationAsRead = () =>
    useMarkInboxNotificationAsRead_withClient(client);

  const useMarkAllInboxNotificationsAsRead = () =>
    useMarkAllInboxNotificationsAsRead_withClient(client);

  const useDeleteInboxNotification = () =>
    useDeleteInboxNotification_withClient(client);

  const useDeleteAllInboxNotifications = () =>
    useDeleteAllInboxNotifications_withClient(client);

  const useUpdateNotificationSettings = () =>
    useUpdateNotificationSettings_withClient(client);

  // NOTE: This version of the LiveblocksProvider does _not_ take any props.
  // This is because we already have a client bound to it.
  function LiveblocksProvider(props: PropsWithChildren) {
    useEnsureNoLiveblocksProvider();
    return (
      <ClientContext.Provider value={client}>
        {props.children}
      </ClientContext.Provider>
    );
  }

  const shared = createSharedContext<U>(client);

  const bundle: LiveblocksContextBundle<U, M> = {
    LiveblocksProvider,

    useInboxNotifications: (options?: UseInboxNotificationsOptions) =>
      useInboxNotifications_withClient(client, identity, shallow, options),
    useUnreadInboxNotificationsCount: (
      options?: UseInboxNotificationsOptions
    ) => useUnreadInboxNotificationsCount_withClient(client, options),

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    useDeleteInboxNotification,
    useDeleteAllInboxNotifications,

    useNotificationSettings: () => useNotificationSettings_withClient(client),
    useUpdateNotificationSettings,

    useInboxNotificationThread,
    useUserThreads_experimental,

    useAiChats,
    useAiChat,
    useAiChatMessages,
    useAiChatStatus,
    useCreateAiChat,
    useDeleteAiChat,
    useSendAiMessage,

    ...shared.classic,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: (options?: UseInboxNotificationsOptions) =>
        useInboxNotificationsSuspense_withClient(client, options),
      useUnreadInboxNotificationsCount: (
        options?: UseInboxNotificationsOptions
      ) => useUnreadInboxNotificationsCountSuspense_withClient(client, options),

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,

      useDeleteInboxNotification,
      useDeleteAllInboxNotifications,

      useInboxNotificationThread,

      useNotificationSettings: () =>
        useNotificationSettingsSuspense_withClient(client),
      useUpdateNotificationSettings,

      useUserThreads_experimental: useUserThreadsSuspense_experimental,

      useAiChats: useAiChatsSuspense,
      useAiChat: useAiChatSuspense,
      useAiChatMessages: useAiChatMessagesSuspense,
      useAiChatStatus,
      useCreateAiChat,
      useDeleteAiChat,
      useSendAiMessage,

      ...shared.suspense,
    },
  };
  return bundle;
}

function useInboxNotifications_withClient<T>(
  client: OpaqueClient,
  selector: (result: InboxNotificationsAsyncResult) => T,
  isEqual: (a: T, b: T) => boolean,
  options?: UseInboxNotificationsOptions
): T {
  const { store, notificationsPoller: poller } =
    getLiveblocksExtrasForClient(client);

  const queryKey = makeInboxNotificationsQueryKey(options?.query);

  // Trigger initial loading of inbox notifications if it hasn't started
  // already, but don't await its promise.
  useEffect(
    () =>
      void store.outputs.loadingNotifications
        .getOrCreate(queryKey)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => {
      poller.dec();
    };
  }, [poller]);

  return useSignal(
    store.outputs.loadingNotifications.getOrCreate(queryKey).signal,
    selector,
    isEqual
  );
}

function useInboxNotificationsSuspense_withClient(
  client: OpaqueClient,
  options?: UseInboxNotificationsOptions
) {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const store = getLiveblocksExtrasForClient(client).store;

  const queryKey = makeInboxNotificationsQueryKey(options?.query);

  // Suspend until there are at least some inbox notifications
  use(
    store.outputs.loadingNotifications.getOrCreate(queryKey).waitUntilLoaded()
  );

  // We're in a Suspense world here, and as such, the useInboxNotifications()
  // hook is expected to only return success results when we're here.
  const result = useInboxNotifications_withClient(
    client,
    identity,
    shallow,
    options
  );
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function useUnreadInboxNotificationsCount_withClient(
  client: OpaqueClient,
  options?: UseInboxNotificationsOptions
) {
  const { store, unreadNotificationsCountPollersByQueryKey: pollers } =
    getLiveblocksExtrasForClient(client);

  const queryKey = makeInboxNotificationsQueryKey(options?.query);

  const poller = pollers.getOrCreate(queryKey);

  useEffect(
    () =>
      void store.outputs.unreadNotificationsCount
        .getOrCreate(queryKey)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => {
      poller.dec();
    };
  }, [poller]);

  return useSignal(
    store.outputs.unreadNotificationsCount.getOrCreate(queryKey).signal,
    selectorFor_useUnreadInboxNotificationsCount,
    shallow
  );
}

function useUnreadInboxNotificationsCountSuspense_withClient(
  client: OpaqueClient,
  options?: UseInboxNotificationsOptions
) {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const store = getLiveblocksExtrasForClient(client).store;

  const queryKey = makeInboxNotificationsQueryKey(options?.query);

  // Suspend until there are at least some unread inbox notifications count
  use(
    store.outputs.unreadNotificationsCount
      .getOrCreate(queryKey)
      .waitUntilLoaded()
  );

  const result = useUnreadInboxNotificationsCount_withClient(client, options);
  assert(!result.isLoading, "Did not expect loading");
  assert(!result.error, "Did not expect error");
  return result;
}

function useMarkInboxNotificationAsRead_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store, unreadNotificationsCountPollersByQueryKey } =
        getLiveblocksExtrasForClient(client);

      const readAt = new Date();
      const optimisticId = store.optimisticUpdates.add({
        type: "mark-inbox-notification-as-read",
        inboxNotificationId,
        readAt,
      });

      client.markInboxNotificationAsRead(inboxNotificationId).then(
        () => {
          // Replace the optimistic update by the real thing
          store.markInboxNotificationRead(
            inboxNotificationId,
            readAt,
            optimisticId
          );

          // Force a re-fetch of the unread notifications count
          for (const poller of unreadNotificationsCountPollersByQueryKey.values()) {
            poller.markAsStale();
            poller.pollNowIfStale();
          }
        },
        (err: Error) => {
          store.optimisticUpdates.remove(optimisticId);
          // XXX_vincent Add unit test for this error
          client[kInternal].emitError(
            {
              type: "MARK_INBOX_NOTIFICATION_AS_READ_ERROR",
              inboxNotificationId,
            },
            err
          );
        }
      );
    },
    [client]
  );
}

function useMarkAllInboxNotificationsAsRead_withClient(client: OpaqueClient) {
  return useCallback(() => {
    const { store, unreadNotificationsCountPollersByQueryKey } =
      getLiveblocksExtrasForClient(client);
    const readAt = new Date();
    const optimisticId = store.optimisticUpdates.add({
      type: "mark-all-inbox-notifications-as-read",
      readAt,
    });

    client.markAllInboxNotificationsAsRead().then(
      () => {
        // Replace the optimistic update by the real thing
        store.markAllInboxNotificationsRead(optimisticId, readAt);

        // Force a re-fetch of the unread notifications count
        for (const poller of unreadNotificationsCountPollersByQueryKey.values()) {
          poller.markAsStale();
          poller.pollNowIfStale();
        }
      },
      (err: Error) => {
        store.optimisticUpdates.remove(optimisticId);
        client[kInternal].emitError(
          // No roomId, threadId, commentId to include for this error
          { type: "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR" },
          err
        );
      }
    );
  }, [client]);
}

function useDeleteInboxNotification_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store, unreadNotificationsCountPollersByQueryKey } =
        getLiveblocksExtrasForClient(client);

      const deletedAt = new Date();
      const optimisticId = store.optimisticUpdates.add({
        type: "delete-inbox-notification",
        inboxNotificationId,
        deletedAt,
      });

      client.deleteInboxNotification(inboxNotificationId).then(
        () => {
          // Replace the optimistic update by the real thing
          store.deleteInboxNotification(inboxNotificationId, optimisticId);

          // Force a re-fetch of the unread notifications count
          for (const poller of unreadNotificationsCountPollersByQueryKey.values()) {
            poller.markAsStale();
            poller.pollNowIfStale();
          }
        },
        (err: Error) => {
          store.optimisticUpdates.remove(optimisticId);
          // XXX_vincent Add unit test for this error
          client[kInternal].emitError(
            { type: "DELETE_INBOX_NOTIFICATION_ERROR", inboxNotificationId },
            err
          );
        }
      );
    },
    [client]
  );
}

function useDeleteAllInboxNotifications_withClient(client: OpaqueClient) {
  return useCallback(() => {
    const { store, unreadNotificationsCountPollersByQueryKey } =
      getLiveblocksExtrasForClient(client);
    const deletedAt = new Date();
    const optimisticId = store.optimisticUpdates.add({
      type: "delete-all-inbox-notifications",
      deletedAt,
    });

    client.deleteAllInboxNotifications().then(
      () => {
        // Replace the optimistic update by the real thing
        store.deleteAllInboxNotifications(optimisticId);

        // Force a re-fetch of the unread notifications count
        for (const poller of unreadNotificationsCountPollersByQueryKey.values()) {
          poller.markAsStale();
          poller.pollNowIfStale();
        }
      },
      (err: Error) => {
        store.optimisticUpdates.remove(optimisticId);
        // XXX_vincent Add unit test for this error
        client[kInternal].emitError(
          { type: "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR" },
          err
        );
      }
    );
  }, [client]);
}

function useInboxNotificationThread_withClient<M extends BaseMetadata>(
  client: OpaqueClient,
  inboxNotificationId: string
): ThreadData<M> {
  const { store } = getLiveblocksExtrasForClient<M>(client);
  return useSignal(
    store.outputs.threadifications,
    useCallback(
      (state) => {
        const inboxNotification =
          state.notificationsById[inboxNotificationId] ??
          raise(
            `Inbox notification with ID "${inboxNotificationId}" not found`
          );

        if (inboxNotification.kind !== "thread") {
          raise(
            `Inbox notification with ID "${inboxNotificationId}" is not of kind "thread"`
          );
        }

        const thread =
          state.threadsDB.get(inboxNotification.threadId) ??
          raise(
            `Thread with ID "${inboxNotification.threadId}" not found, this inbox notification might not be of kind "thread"`
          );

        return thread;
      },
      [inboxNotificationId]
    )
  );
}

function useUpdateNotificationSettings_withClient(
  client: OpaqueClient
): (settings: PartialNotificationSettings) => void {
  return useCallback(
    (settings: PartialNotificationSettings): void => {
      const { store } = getLiveblocksExtrasForClient(client);
      const optimisticUpdateId = store.optimisticUpdates.add({
        type: "update-notification-settings",
        settings,
      });

      client.updateNotificationSettings(settings).then(
        (settings) => {
          // Replace the optimistic update by the real thing
          store.updateNotificationSettings_confirmOptimisticUpdate(
            settings,
            optimisticUpdateId
          );
        },
        (err: Error) => {
          // Remove optimistic update when it fails
          store.optimisticUpdates.remove(optimisticUpdateId);
          // Check if the error is an HTTP error
          if (err instanceof HttpError) {
            if (err.status === 422) {
              const msg = [err.details?.error, err.details?.reason]
                .filter(Boolean)
                .join("\n");
              console.error(msg);
            }

            client[kInternal].emitError(
              {
                type: "UPDATE_NOTIFICATION_SETTINGS_ERROR",
              },
              err
            );
          }
          // A non-HTTP error is unexpected and must be considered as a bug.
          // We should fix it and do not notify users about it.
          else {
            throw err;
          }
        }
      );
    },
    [client]
  );
}

function useNotificationSettings_withClient(
  client: OpaqueClient
): [
  NotificationSettingsAsyncResult,
  (settings: PartialNotificationSettings) => void,
] {
  const updateNotificationSettings =
    useUpdateNotificationSettings_withClient(client);

  const { store, notificationSettingsPoller: poller } =
    getLiveblocksExtrasForClient(client);

  useEffect(() => {
    void store.outputs.notificationSettings.waitUntilLoaded();
    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  });

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => {
      poller.dec();
    };
  }, [poller]);

  const result = useSignal(store.outputs.notificationSettings.signal);

  return useMemo(() => {
    return [result, updateNotificationSettings];
  }, [result, updateNotificationSettings]);
}

function useNotificationSettingsSuspense_withClient(
  client: OpaqueClient
): [
  NotificationSettingsAsyncSuccess,
  (settings: PartialNotificationSettings) => void,
] {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const store = getLiveblocksExtrasForClient(client).store;

  // Suspend until there are at least some notification settings
  use(store.outputs.notificationSettings.waitUntilLoaded());

  // We're in a Suspense world here, and as such, the useNotificationSettings()
  // hook is expected to only return success results when we're here.
  const [result, updateNotificationSettings] =
    useNotificationSettings_withClient(client);

  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");

  return useMemo(() => {
    return [result, updateNotificationSettings];
  }, [result, updateNotificationSettings]);
}

function useUser_withClient<U extends BaseUserMeta>(
  client: Client<U>,
  userId: string
): UserAsyncResult<U["info"]> {
  const usersStore = client[kInternal].usersStore;

  const getUserState = useCallback(
    () => usersStore.getItemState(userId),
    [usersStore, userId]
  );

  const selector = useCallback(
    (state: ReturnType<typeof getUserState>) =>
      selectorFor_useUser(state, userId),
    [userId]
  );

  const result = useSyncExternalStoreWithSelector(
    usersStore.subscribe,
    getUserState,
    getUserState,
    selector,
    shallow
  );

  // Trigger a fetch if we don't have any data yet (whether initially or after an invalidation)
  useEffect(
    () => void usersStore.enqueue(userId)

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call usersStore.enqueue on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger evaluation
    //    of the userId.
    // 2. All other subsequent renders now are a no-op (from the implementation
    //    of .enqueue)
    // 3. If ever the userId gets invalidated, the user would be fetched again.
  );

  return result;
}

function useUserSuspense_withClient<U extends BaseUserMeta>(
  client: Client<U>,
  userId: string
) {
  const usersStore = client[kInternal].usersStore;

  const getUserState = useCallback(
    () => usersStore.getItemState(userId),
    [usersStore, userId]
  );
  const userState = getUserState();

  if (!userState || userState.isLoading) {
    throw usersStore.enqueue(userId);
  }

  if (userState.error) {
    throw userState.error;
  }

  // Throw an error if `undefined` was returned by `resolveUsers` for this user ID
  if (!userState.data) {
    throw missingUserError(userId);
  }

  const state = useSyncExternalStore(
    usersStore.subscribe,
    getUserState,
    getUserState
  );
  assert(state !== undefined, "Unexpected missing state");
  assert(!state.isLoading, "Unexpected loading state");
  assert(!state.error, "Unexpected error state");
  return {
    isLoading: false,
    user: state.data,
    error: undefined,
  } as const;
}

function useRoomInfo_withClient(
  client: OpaqueClient,
  roomId: string
): RoomInfoAsyncResult {
  const roomsInfoStore = client[kInternal].roomsInfoStore;

  const getRoomInfoState = useCallback(
    () => roomsInfoStore.getItemState(roomId),
    [roomsInfoStore, roomId]
  );

  const selector = useCallback(
    (state: ReturnType<typeof getRoomInfoState>) =>
      selectorFor_useRoomInfo(state, roomId),
    [roomId]
  );

  const result = useSyncExternalStoreWithSelector(
    roomsInfoStore.subscribe,
    getRoomInfoState,
    getRoomInfoState,
    selector,
    shallow
  );

  // Trigger a fetch if we don't have any data yet (whether initially or after an invalidation)
  useEffect(
    () => void roomsInfoStore.enqueue(roomId)

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call roomsInfoStore.enqueue on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger evaluation
    //    of the roomId.
    // 2. All other subsequent renders now are a no-op (from the implementation
    //    of .enqueue)
    // 3. If ever the roomId gets invalidated, the room info would be fetched again.
  );

  return result;
}

function useRoomInfoSuspense_withClient(client: OpaqueClient, roomId: string) {
  const roomsInfoStore = client[kInternal].roomsInfoStore;

  const getRoomInfoState = useCallback(
    () => roomsInfoStore.getItemState(roomId),
    [roomsInfoStore, roomId]
  );
  const roomInfoState = getRoomInfoState();

  if (!roomInfoState || roomInfoState.isLoading) {
    throw roomsInfoStore.enqueue(roomId);
  }

  if (roomInfoState.error) {
    throw roomInfoState.error;
  }

  // Throw an error if `undefined` was returned by `resolveRoomsInfo` for this room ID
  if (!roomInfoState.data) {
    throw missingRoomInfoError(roomId);
  }

  const state = useSyncExternalStore(
    roomsInfoStore.subscribe,
    getRoomInfoState,
    getRoomInfoState
  );
  assert(state !== undefined, "Unexpected missing state");
  assert(!state.isLoading, "Unexpected loading state");
  assert(!state.error, "Unexpected error state");
  assert(state.data !== undefined, "Unexpected missing room info data");
  return {
    isLoading: false,
    info: state.data,
    error: undefined,
  } as const;
}

function useGroupInfo_withClient(
  client: OpaqueClient,
  groupId: string
): GroupInfoAsyncResult {
  const groupsInfoStore = client[kInternal].groupsInfoStore;

  const getGroupInfoState = useCallback(
    () => groupsInfoStore.getItemState(groupId),
    [groupsInfoStore, groupId]
  );

  const selector = useCallback(
    (state: ReturnType<typeof getGroupInfoState>) =>
      selectorFor_useGroupInfo(state, groupId),
    [groupId]
  );

  const result = useSyncExternalStoreWithSelector(
    groupsInfoStore.subscribe,
    getGroupInfoState,
    getGroupInfoState,
    selector,
    shallow
  );

  // Trigger a fetch if we don't have any data yet (whether initially or after an invalidation)
  useEffect(
    () => void groupsInfoStore.enqueue(groupId)

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call groupsInfoStore.enqueue on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger evaluation
    //    of the groupId.
    // 2. All other subsequent renders now are a no-op (from the implementation
    //    of .enqueue)
    // 3. If ever the groupId gets invalidated, the group info would be fetched again.
  );

  return result;
}

function useGroupInfoSuspense_withClient(
  client: OpaqueClient,
  groupId: string
) {
  const groupsInfoStore = client[kInternal].groupsInfoStore;

  const getGroupInfoState = useCallback(
    () => groupsInfoStore.getItemState(groupId),
    [groupsInfoStore, groupId]
  );
  const groupInfoState = getGroupInfoState();

  if (!groupInfoState || groupInfoState.isLoading) {
    throw groupsInfoStore.enqueue(groupId);
  }

  if (groupInfoState.error) {
    throw groupInfoState.error;
  }

  // Throw an error if `undefined` was returned by `resolveGroupsInfo` for this group ID
  if (!groupInfoState.data) {
    throw missingGroupInfoError(groupId);
  }

  const state = useSyncExternalStore(
    groupsInfoStore.subscribe,
    getGroupInfoState,
    getGroupInfoState
  );
  assert(state !== undefined, "Unexpected missing state");
  assert(!state.isLoading, "Unexpected loading state");
  assert(!state.error, "Unexpected error state");
  assert(state.data !== undefined, "Unexpected missing group info data");
  return {
    isLoading: false,
    info: state.data,
    error: undefined,
  } as const;
}

/**
 * @private
 * Internal API, do not rely on it.
 *
 * Gets the status of the AI WebSocket connection.
 * */
export function useAiWebSocketStatus(): Status {
  const client = useClient();

  const subscribe = client[kInternal].ai.events.status.subscribe;
  const getSnapshot = client[kInternal].ai.getStatus;
  const getServerSnapshot = client[kInternal].ai.getStatus;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * (Private beta)  Returns the chats for the current user.
 *
 * @example
 * const { chats } = useAiChats();
 */
function useAiChats(options?: UseAiChatsOptions): AiChatsAsyncResult {
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  const queryKey = makeAiChatsQueryKey(options?.query);

  useEnsureAiConnection(client);

  useEffect(
    () => void store.outputs.aiChats.getOrCreate(queryKey).waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  return useSignal(
    store.outputs.aiChats.getOrCreate(queryKey).signal,
    identity,
    shallow
  );
}

function useAiChatsSuspense(options?: UseAiChatsOptions): AiChatsAsyncSuccess {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  const queryKey = makeAiChatsQueryKey(options?.query);

  use(store.outputs.aiChats.getOrCreate(queryKey).waitUntilLoaded());

  const result = useAiChats(options);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function useAiChatMessages(
  chatId: string,
  /** @internal */
  options?: { branchId?: MessageId }
): AiChatMessagesAsyncResult {
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  useEffect(
    () =>
      void store.outputs.messagesByChatId
        .getOrCreate(chatId)
        .getOrCreate(options?.branchId ?? null)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  return useSignal(
    store.outputs.messagesByChatId
      .getOrCreate(chatId)
      .getOrCreate(options?.branchId ?? null).signal
  );
}

function useAiChatMessagesSuspense(
  chatId: string,
  /** @internal */
  options?: { branchId?: MessageId }
): AiChatMessagesAsyncSuccess {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  use(
    store.outputs.messagesByChatId
      .getOrCreate(chatId)
      .getOrCreate(options?.branchId ?? null)
      .waitUntilLoaded()
  );

  const result = useAiChatMessages(chatId, options);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function useAiChat(chatId: string): AiChatAsyncResult {
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  useEffect(
    () => void store.outputs.aiChatById.getOrCreate(chatId).waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  return useSignal(store.outputs.aiChatById.getOrCreate(chatId).signal);
}

function useAiChatSuspense(chatId: string): AiChatAsyncSuccess {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  use(store.outputs.aiChatById.getOrCreate(chatId).waitUntilLoaded());

  const result = useAiChat(chatId);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

/**
 * Returns a function that creates an AI chat.
 *
 * If you do not pass a title for the chat, it will be automatically computed
 * after the first AI response.
 *
 * @example
 * const createAiChat = useCreateAiChat();
 *
 * // Create a chat with an automatically generated title
 * createAiChat("ai-chat-id");
 *
 * // Create a chat with a custom title
 * createAiChat({ id: "ai-chat-id", title: "My AI chat" });
 */
function useCreateAiChat(): {
  (chatId: string): void;
  (options: CreateAiChatOptions): void;
} {
  const client = useClient();

  return useCallback(
    (options: string | CreateAiChatOptions) => {
      if (typeof options === "string") {
        options = { id: options };
      }

      client[kInternal].ai
        .getOrCreateChat(options.id, {
          title: options.title,
          metadata: options.metadata,
        })
        .catch((err) => {
          console.error(
            `Failed to create chat with ID "${options.id}": ${String(err)}`
          );
        });
    },
    [client]
  );
}

/**
 * Returns a function that deletes the AI chat with the specified id.
 *
 * @example
 * const deleteAiChat = useDeleteAiChat();
 * deleteAiChat("ai-chat-id");
 */
function useDeleteAiChat() {
  const client = useClient();

  return useCallback(
    (chatId: string) => {
      client[kInternal].ai.deleteChat(chatId).catch((err) => {
        console.error(
          `Failed to delete chat with ID "${chatId}": ${String(err)}`
        );
      });
    },
    [client]
  );
}

const LOADING = Object.freeze({ status: "loading" });
const IDLE = Object.freeze({ status: "idle" });

/**
 * Returns the status of an AI chat, indicating whether it's idle or actively
 * generating content. This is a convenience hook that derives its state from
 * the latest assistant message in the chat.
 *
 * Re-renders whenever any of the relevant fields change.
 *
 * @param chatId - The ID of the chat to monitor
 * @returns The current status of the AI chat
 *
 * @example
 * ```tsx
 * import { useAiChatStatus } from "@liveblocks/react";
 *
 * function ChatStatus() {
 *   const { status, partType, toolName } = useAiChatStatus("my-chat");
 *   console.log(status);          // "loading" | "idle" | "generating"
 *   console.log(status.partType); // "text" | "tool-invocation" | ...
 *   console.log(status.toolName); // string | undefined
 * }
 * ```
 */
function useAiChatStatus(
  chatId: string,
  /** @internal */
  branchId?: MessageId
): AiChatStatus {
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);

  useEnsureAiConnection(client);

  useEffect(
    () =>
      void store.outputs.messagesByChatId
        .getOrCreate(chatId)
        .getOrCreate(branchId ?? null)
        .waitUntilLoaded()
  );

  return useSignal(
    // Signal
    store.outputs.messagesByChatId
      .getOrCreate(chatId)
      .getOrCreate(branchId ?? null).signal,

    // Selector
    (result) => {
      if (result.isLoading) return LOADING;
      if (result.error) return IDLE;

      const messages = result.messages;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.role !== "assistant") return IDLE;
      if (
        lastMessage.status !== "generating" &&
        lastMessage.status !== "awaiting-tool"
      )
        return IDLE;

      const contentSoFar = lastMessage.contentSoFar;
      const lastPart = contentSoFar[contentSoFar.length - 1];

      if (lastPart?.type === "tool-invocation") {
        return {
          status: "generating",
          partType: "tool-invocation",
          toolName: lastPart.name,
        };
      } else {
        return { status: "generating", partType: lastPart?.type };
      }
    },

    // Consider { status: "generating", partType: "text" } and { status: "generating", partType: "text" } equal
    shallow
  );
}

/**
 * Returns a function to send a message in an AI chat.
 *
 * @example
 * const sendAiMessage = useSendAiMessage("chat-id");
 * sendAiMessage("Hello, Liveblocks AI!");
 *
 * You can set options related to the message being sent, such as the copilot ID to use.
 *
 * @example
 * const sendAiMessage = useSendAiMessage("chat-id", { copilotId: "co_xxx" });
 * sendAiMessage("Hello, Liveblocks AI!");
 *
 * @example
 * const sendAiMessage = useSendAiMessage("chat-id", { copilotId: "co_xxx" });
 * sendAiMessage({ text: "Hello, Liveblocks AI!", copilotId: "co_yyy" });
 */
function useSendAiMessage(
  chatId: string,
  options?: UseSendAiMessageOptions
): {
  (text: string): AiUserMessage;
  (options: SendAiMessageOptions): AiUserMessage;
};

/**
 * Returns a function to send a message in an AI chat.
 *
 * @example
 * const sendAiMessage = useSendAiMessage();
 * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!" });
 *
 * You can set options related to the message being sent, such as the copilot ID to use.
 *
 * @example
 * const sendAiMessage = useSendAiMessage();
 * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!", copilotId: "co_xxx" });
 */
function useSendAiMessage(): (
  options: WithRequired<SendAiMessageOptions, "chatId">
) => AiUserMessage;

/**
 * Returns a function to send a message in an AI chat.
 *
 * @example
 * const sendAiMessage = useSendAiMessage(chatId);
 * sendAiMessage("Hello, Liveblocks AI!");
 *
 * You can set options related to the message being sent, such as the copilot ID to use.
 *
 * @example
 * const sendAiMessage = useSendAiMessage(chatId, { copilotId: "co_xxx" });
 * sendAiMessage("Hello, Liveblocks AI!");
 *
 * You can also pass the chat ID dynamically if it's not known when calling the hook.
 *
 * @example
 * const sendAiMessage = useSendAiMessage();
 * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!" });
 *
 * @example
 * const sendAiMessage = useSendAiMessage();
 * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!", copilotId: "co_xxx" });
 */
function useSendAiMessage(
  chatId?: string,
  options?: UseSendAiMessageOptions
): {
  (text: string): AiUserMessage;
  (options: SendAiMessageOptions): AiUserMessage;
  (options: WithRequired<SendAiMessageOptions, "chatId">): AiUserMessage;
} {
  const client = useClient();

  return useCallback(
    (message: string | SendAiMessageOptions) => {
      const {
        text: messageText,
        chatId: messageOptionsChatId,
        copilotId: messageOptionsCopilotId,
        ...messageOptions
      } = typeof message === "string" ? { text: message } : message;
      const resolvedChatId =
        messageOptionsChatId ??
        chatId ??
        // The `useSendAiMessage` overloads prevent this scenario from happening
        // at the type level, and this error prevents it from happening at runtime.
        raise(
          "chatId must be provided to either `useSendAiMessage` or its returned function."
        );

      const messages = client[kInternal].ai.signals
        .getChatMessagesForBranchΣ(resolvedChatId)
        .get();

      if (
        process.env.NODE_ENV !== "production" &&
        !messageOptionsCopilotId &&
        !options?.copilotId
      ) {
        console.warn(
          `No copilot ID was provided to useSendAiMessage when sending the message "${messageText.slice(
            0,
            20
          )}…". As a result, the message will use the chat's previous copilot ID, which could lead to unexpected behavior.\nTo ensure the correct copilot ID is used, specify it either through the hook as 'useSendAiMessage("${resolvedChatId}", { copilotId: "co_xxx" })' or via the function as 'sendAiMessage({ text: "${messageText.slice(
            0,
            20
          )}…", copilotId: "co_xxx" })'`
        );
      }
      const resolvedCopilotId = (messageOptionsCopilotId ??
        options?.copilotId ??
        client[kInternal].ai.getLastUsedCopilotId(resolvedChatId)) as
        | CopilotId
        | undefined;

      const lastMessageId = messages[messages.length - 1]?.id ?? null;

      const content = [{ type: "text" as const, text: messageText }];
      const newMessageId = client[kInternal].ai[
        kInternal
      ].context.messagesStore.createOptimistically(
        resolvedChatId,
        "user",
        lastMessageId,
        content
      );
      const newMessage = client[kInternal].ai[
        kInternal
      ].context.messagesStore.getMessageById(newMessageId) as AiUserMessage;

      const targetMessageId = client[kInternal].ai[
        kInternal
      ].context.messagesStore.createOptimistically(
        resolvedChatId,
        "assistant",
        newMessageId,
        resolvedCopilotId as CopilotId
      );

      void client[kInternal].ai.askUserMessageInChat(
        resolvedChatId,
        { id: newMessageId, parentMessageId: lastMessageId, content },
        targetMessageId,
        {
          stream: messageOptions.stream ?? options?.stream,
          copilotId: resolvedCopilotId,
          timeout: messageOptions.timeout ?? options?.timeout,
        }
      );

      return newMessage;
    },
    [client, chatId, options?.copilotId, options?.stream, options?.timeout]
  );
}

/** @internal */
export function createSharedContext<U extends BaseUserMeta>(
  client: Client<U>
): SharedContextBundle<U> {
  const useClient = () => client;

  function useSyncStatus(options?: UseSyncStatusOptions) {
    return useSyncStatus_withClient(client, options);
  }

  return {
    classic: {
      useClient,
      useUser: (userId: string) => useUser_withClient(client, userId),
      useRoomInfo: (roomId: string) => useRoomInfo_withClient(client, roomId),
      useGroupInfo: (groupId: string) =>
        useGroupInfo_withClient(client, groupId),
      useIsInsideRoom,
      useErrorListener,
      useSyncStatus,
      RegisterAiKnowledge,
      RegisterAiTool,
    },
    suspense: {
      useClient,
      useUser: (userId: string) => useUserSuspense_withClient(client, userId),
      useRoomInfo: (roomId: string) =>
        useRoomInfoSuspense_withClient(client, roomId),
      useGroupInfo: (groupId: string) =>
        useGroupInfoSuspense_withClient(client, groupId),
      useIsInsideRoom,
      useErrorListener,
      useSyncStatus,
      RegisterAiKnowledge,
      RegisterAiTool,
    },
  };
}

/**
 * @private This is an internal API.
 */
function useEnsureNoLiveblocksProvider(options?: { allowNesting?: boolean }) {
  const existing = useClientOrNull();
  if (!options?.allowNesting && existing !== null) {
    throw new Error(
      "You cannot nest multiple LiveblocksProvider instances in the same React tree."
    );
  }
}

/**
 * @private This is a private API.
 */
export function LiveblocksProviderWithClient(
  props: PropsWithChildren<{
    client: OpaqueClient;

    // Private flag, used only to skip the nesting check if this is
    // a LiveblocksProvider created implicitly by a factory-bound RoomProvider.
    allowNesting?: boolean;
  }>
) {
  useEnsureNoLiveblocksProvider(props);
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  );
}

/**
 * Sets up a client for connecting to Liveblocks, and is the recommended way to do
 * this for React apps. You must define either `authEndpoint` or `publicApiKey`.
 * Resolver functions should be placed inside here, and a number of other options
 * are available, which correspond with those passed to `createClient`.
 * Unlike `RoomProvider`, `LiveblocksProvider` doesn’t call Liveblocks servers when mounted,
 * and it should be placed higher in your app’s component tree.
 */
export function LiveblocksProvider<U extends BaseUserMeta = DU>(
  props: PropsWithChildren<ClientOptions<U>>
) {
  const { children, ...o } = props;

  // It's important that the static options remain stable, otherwise we'd be
  // creating new client instances on every render.
  const options = {
    publicApiKey: useInitial(o.publicApiKey),
    throttle: useInitial(o.throttle),
    lostConnectionTimeout: useInitial(o.lostConnectionTimeout),
    backgroundKeepAliveTimeout: useInitial(o.backgroundKeepAliveTimeout),
    polyfills: useInitial(o.polyfills),
    largeMessageStrategy: useInitial(o.largeMessageStrategy),
    unstable_streamData: useInitial(o.unstable_streamData),
    preventUnsavedChanges: useInitial(o.preventUnsavedChanges),

    authEndpoint: useInitialUnlessFunction(o.authEndpoint),
    resolveMentionSuggestions: useInitialUnlessFunction(
      o.resolveMentionSuggestions
    ),
    resolveUsers: useInitialUnlessFunction(o.resolveUsers),
    resolveRoomsInfo: useInitialUnlessFunction(o.resolveRoomsInfo),
    resolveGroupsInfo: useInitialUnlessFunction(o.resolveGroupsInfo),

    baseUrl: useInitial(
      // @ts-expect-error - Hidden config options
      o.baseUrl as string | undefined
    ),
    enableDebugLogging: useInitial(
      // @ts-expect-error - Hidden config options
      o.enableDebugLogging as boolean | undefined
    ),
  } as ClientOptions<U>;

  // NOTE: Deliberately not passing any deps here, because we'll _never_ want
  // to recreate a client instance after the first render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => createClient<U>(options), []);

  // The AI socket is connected to via `useEnsureAiConnection` whenever at least one
  // AI-related hook is used. We only handle disconnecting here when `LiveblocksProvider` unmounts.
  useEffect(() => {
    return () => {
      client[kInternal].ai.disconnect();
    };
  }, [client]);

  return (
    <LiveblocksProviderWithClient client={client}>
      {children}
    </LiveblocksProviderWithClient>
  );
}

/**
 * Creates a LiveblocksProvider and a set of typed hooks. Note that any
 * LiveblocksProvider created in this way takes no props, because it uses
 * settings from the given client instead.
 */
export function createLiveblocksContext<
  U extends BaseUserMeta = DU,
  M extends BaseMetadata = DM,
>(client: OpaqueClient): LiveblocksContextBundle<U, M> {
  return getOrCreateContextBundle<U, M>(client);
}

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitly recommended by the Liveblocks team.
 *
 * WARNING:
 * Please note that this hook currently returns all threads by most recently
 * updated threads first. This is inconsistent with the default sort order of
 * the useThreads() hook, which returns them in chronological order (by
 * creation date). In the final version, we will make these hooks behave
 * consistently, so expect that in the final version, you'll have to explicitly
 * specify the sort order to be by most recently updated first somehow.
 * The final API for that is still TBD.
 *
 */
function useUserThreads_experimental<M extends BaseMetadata>(
  options: UseUserThreadsOptions<M> = {}
): ThreadsAsyncResult<M> {
  const client = useClient();
  const { store, userThreadsPoller: poller } =
    getLiveblocksExtrasForClient<M>(client);
  const queryKey = makeUserThreadsQueryKey(options.query);

  useEffect(
    () =>
      void store.outputs.loadingUserThreads
        .getOrCreate(queryKey)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => {
      poller.dec();
    };
  }, [poller]);

  return useSignal(
    store.outputs.loadingUserThreads.getOrCreate(queryKey).signal
  );
}

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitly recommended by the Liveblocks team.
 *
 * WARNING:
 * Please note that this hook currently returns all threads by most recently
 * updated threads first. This is inconsistent with the default sort order of
 * the useThreads() hook, which returns them in chronological order (by
 * creation date). In the final version, we will make these hooks behave
 * consistently, so expect that in the final version, you'll have to explicitly
 * specify the sort order to be by most recently updated first somehow.
 * The final API for that is still TBD.
 */
function useUserThreadsSuspense_experimental<M extends BaseMetadata>(
  options: UseUserThreadsOptions<M> = {}
): ThreadsAsyncSuccess<M> {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const { store } = getLiveblocksExtrasForClient<M>(client);
  const queryKey = makeUserThreadsQueryKey(options.query);

  use(store.outputs.loadingUserThreads.getOrCreate(queryKey).waitUntilLoaded());

  const result = useUserThreads_experimental(options);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

/**
 * Returns the inbox notifications for the current user.
 *
 * @example
 * const { inboxNotifications, error, isLoading } = useInboxNotifications();
 */
function useInboxNotifications(options?: UseInboxNotificationsOptions) {
  return useInboxNotifications_withClient(
    useClient(),
    identity,
    shallow,
    options
  );
}

/**
 * Returns the inbox notifications for the current user.
 *
 * @example
 * const { inboxNotifications } = useInboxNotifications();
 */
function useInboxNotificationsSuspense(options?: UseInboxNotificationsOptions) {
  return useInboxNotificationsSuspense_withClient(useClient(), options);
}

function useInboxNotificationThread<M extends BaseMetadata>(
  inboxNotificationId: string
) {
  return useInboxNotificationThread_withClient<M>(
    useClient(),
    inboxNotificationId
  );
}

/**
 * Returns a function that marks all of the current user's inbox notifications as read.
 *
 * @example
 * const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
 * markAllInboxNotificationsAsRead();
 */
function useMarkAllInboxNotificationsAsRead() {
  return useMarkAllInboxNotificationsAsRead_withClient(useClient());
}

/**
 * Returns a function that marks an inbox notification as read for the current user.
 *
 * @example
 * const markInboxNotificationAsRead = useMarkInboxNotificationAsRead();
 * markInboxNotificationAsRead("in_xxx");
 */
function useMarkInboxNotificationAsRead() {
  return useMarkInboxNotificationAsRead_withClient(useClient());
}

/**
 * Returns a function that deletes all of the current user's inbox notifications.
 *
 * @example
 * const deleteAllInboxNotifications = useDeleteAllInboxNotifications();
 * deleteAllInboxNotifications();
 */
function useDeleteAllInboxNotifications() {
  return useDeleteAllInboxNotifications_withClient(useClient());
}

/**
 * Returns a function that deletes an inbox notification for the current user.
 *
 * @example
 * const deleteInboxNotification = useDeleteInboxNotification();
 * deleteInboxNotification("in_xxx");
 */
function useDeleteInboxNotification() {
  return useDeleteInboxNotification_withClient(useClient());
}

/**
 * Returns the number of unread inbox notifications for the current user.
 *
 * @example
 * const { count, error, isLoading } = useUnreadInboxNotificationsCount();
 */
function useUnreadInboxNotificationsCount(
  options?: UseInboxNotificationsOptions
) {
  return useUnreadInboxNotificationsCount_withClient(useClient(), options);
}

/**
 * Returns the number of unread inbox notifications for the current user.
 *
 * @example
 * const { count } = useUnreadInboxNotificationsCount();
 */
function useUnreadInboxNotificationsCountSuspense(
  options?: UseInboxNotificationsOptions
) {
  return useUnreadInboxNotificationsCountSuspense_withClient(
    useClient(),
    options
  );
}

/**
 * Returns notification settings for the current user.
 *
 * @example
 * const [{ settings }, updateNotificationSettings] = useNotificationSettings()
 */
function useNotificationSettings() {
  return useNotificationSettings_withClient(useClient());
}

/**
 * Returns notification settings for the current user.
 *
 * @example
 * const [{ settings }, updateNotificationSettings] = useNotificationSettings()
 */
function useNotificationSettingsSuspense() {
  return useNotificationSettingsSuspense_withClient(useClient());
}

/**
 * Returns a function that updates the user's notification
 * settings for a project.
 *
 * @example
 * const updateNotificationSettings = useUpdateNotificationSettings()
 */
function useUpdateNotificationSettings() {
  return useUpdateNotificationSettings_withClient(useClient());
}

function useUser<U extends BaseUserMeta>(userId: string) {
  const client = useClient<U>();
  return useUser_withClient(client, userId);
}

function useUserSuspense<U extends BaseUserMeta>(
  userId: string
): UserAsyncSuccess<U["info"]> {
  const client = useClient<U>();
  return useUserSuspense_withClient(client, userId);
}

/**
 * Returns room info from a given room ID.
 *
 * @example
 * const { info, error, isLoading } = useRoomInfo("room-id");
 */
function useRoomInfo(roomId: string): RoomInfoAsyncResult {
  return useRoomInfo_withClient(useClient(), roomId);
}

/**
 * Returns room info from a given room ID.
 *
 * @example
 * const { info } = useRoomInfo("room-id");
 */
function useRoomInfoSuspense(roomId: string): RoomInfoAsyncSuccess {
  return useRoomInfoSuspense_withClient(useClient(), roomId);
}

/**
 * Returns group info from a given group ID.
 *
 * @example
 * const { info, error, isLoading } = useGroupInfo("group-id");
 */
function useGroupInfo(groupId: string): GroupInfoAsyncResult {
  return useGroupInfo_withClient(useClient(), groupId);
}

/**
 * Returns group info from a given group ID.
 *
 * @example
 * const { info } = useGroupInfo("group-id");
 */
function useGroupInfoSuspense(groupId: string): GroupInfoAsyncSuccess {
  return useGroupInfoSuspense_withClient(useClient(), groupId);
}

type TypedBundle = LiveblocksContextBundle<DU, DM>;

/**
 * Returns the thread associated with a `"thread"` inbox notification.
 *
 * It can **only** be called with IDs of `"thread"` inbox notifications,
 * so we recommend only using it when customizing the rendering or in other
 * situations where you can guarantee the kind of the notification.
 *
 * When `useInboxNotifications` returns `"thread"` inbox notifications,
 * it also receives the associated threads and caches them behind the scenes.
 * When you call `useInboxNotificationThread`, it simply returns the cached thread
 * for the inbox notification ID you passed to it, without any fetching or waterfalls.
 *
 * @example
 * const thread = useInboxNotificationThread("in_xxx");
 */
const _useInboxNotificationThread: TypedBundle["useInboxNotificationThread"] =
  useInboxNotificationThread;

/**
 * Returns user info from a given user ID.
 *
 * @example
 * const { user, error, isLoading } = useUser("user-id");
 */
const _useUser: TypedBundle["useUser"] = useUser;

/**
 * Returns user info from a given user ID.
 *
 * @example
 * const { user } = useUser("user-id");
 */
const _useUserSuspense: TypedBundle["suspense"]["useUser"] = useUserSuspense;

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitly recommended by the Liveblocks team.
 *
 * WARNING:
 * Please note that this hook currently returns all threads by most recently
 * updated threads first. This is inconsistent with the default sort order of
 * the useThreads() hook, which returns them in chronological order (by
 * creation date). In the final version, we will make these hooks behave
 * consistently, so expect that in the final version, you'll have to explicitly
 * specify the sort order to be by most recently updated first somehow.
 * The final API for that is still TBD.
 */
const _useUserThreads_experimental: TypedBundle["useUserThreads_experimental"] =
  useUserThreads_experimental;

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitly recommended by the Liveblocks team.
 *
 * WARNING:
 * Please note that this hook currently returns all threads by most recently
 * updated threads first. This is inconsistent with the default sort order of
 * the useThreads() hook, which returns them in chronological order (by
 * creation date). In the final version, we will make these hooks behave
 * consistently, so expect that in the final version, you'll have to explicitly
 * specify the sort order to be by most recently updated first somehow.
 * The final API for that is still TBD.
 */
const _useUserThreadsSuspense_experimental: TypedBundle["suspense"]["useUserThreads_experimental"] =
  useUserThreadsSuspense_experimental;

/**
 * (Private beta)  Returns the chats for the current user.
 *
 * @example
 * const { chats, error, isLoading } = useAiChats();
 */
const _useAiChats: TypedBundle["useAiChats"] = useAiChats;

/**
 * (Private beta)  Returns the chats for the current user.
 *
 * @example
 * const { chats, error, isLoading } = useAiChats();
 */
const _useAiChatsSuspense: TypedBundle["suspense"]["useAiChats"] =
  useAiChatsSuspense;

/**
 * (Private beta)  Returns the information of the given chat.
 *
 * @example
 * const { chat, error, isLoading } = useAiChat("my-chat");
 */
const _useAiChat: TypedBundle["useAiChat"] = useAiChat;

/**
 * (Private beta)  Returns the information of the given chat.
 *
 * @example
 * const { chat, error, isLoading } = useAiChat("my-chat");
 */
const _useAiChatSuspense: TypedBundle["suspense"]["useAiChat"] =
  useAiChatSuspense;

/**
 * (Private beta)  Returns the messages in the given chat.
 *
 * @example
 * const { messages, error, isLoading } = useAiChatMessages("my-chat");
 */
const _useAiChatMessages: TypedBundle["useAiChatMessages"] = useAiChatMessages;

/**
 * (Private beta)  Returns the messages in the given chat.
 *
 * @example
 * const { messages, error, isLoading } = useAiChatMessages("my-chat");
 */
const _useAiChatMessagesSuspense: TypedBundle["suspense"]["useAiChatMessages"] =
  useAiChatMessagesSuspense;

function useSyncStatus_withClient(
  client: OpaqueClient,
  options?: UseSyncStatusOptions
): SyncStatus {
  // Normally the Rules of Hooks™ dictate that you should not call hooks
  // conditionally. In this case, we're good here, because the same code path
  // will always be taken on every subsequent render here, because we've frozen
  // the value.
  /* eslint-disable react-hooks/rules-of-hooks */
  const smooth = useInitial(options?.smooth ?? false);
  if (smooth) {
    return useSyncStatusSmooth_withClient(client);
  } else {
    return useSyncStatusImmediate_withClient(client);
  }
  /* eslint-enable react-hooks/rules-of-hooks */
}

function useSyncStatusImmediate_withClient(client: OpaqueClient): SyncStatus {
  return useSyncExternalStore(
    client.events.syncStatus.subscribe,
    client.getSyncStatus,
    client.getSyncStatus
  );
}

function useSyncStatusSmooth_withClient(client: OpaqueClient): SyncStatus {
  const getter = client.getSyncStatus;
  const [status, setStatus] = useState(getter);
  const oldStatus = useLatest(getter());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const unsub = client.events.syncStatus.subscribe(() => {
      const newStatus = getter();
      if (
        oldStatus.current === "synchronizing" &&
        newStatus === "synchronized"
      ) {
        // Delay delivery of the "synchronized" event
        timeoutId = setTimeout(() => setStatus(newStatus), config.SMOOTH_DELAY);
      } else {
        clearTimeout(timeoutId);
        setStatus(newStatus);
      }
    });

    // Clean up
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [client, getter, oldStatus]);

  return status;
}

/**
 * Returns the current Liveblocks sync status, and triggers a re-render
 * whenever it changes. Can be used to render a "Saving..." indicator, or for
 * preventing that a browser tab can be closed until all changes have been
 * synchronized with the server.
 *
 * @example
 * const syncStatus = useSyncStatus();  // "synchronizing" | "synchronized"
 * const syncStatus = useSyncStatus({ smooth: true });
 */
function useSyncStatus(options?: UseSyncStatusOptions): SyncStatus {
  return useSyncStatus_withClient(useClient(), options);
}

/**
 * useErrorListener is a React hook that allows you to respond to any
 * Liveblocks error, for example room connection errors, errors
 * creating/editing/deleting threads, etc.
 *
 * @example
 * useErrorListener(err => {
 *   console.error(err);
 * })
 */
function useErrorListener(callback: (err: LiveblocksError) => void): void {
  const client = useClient();
  const savedCallback = useLatest(callback);
  useEffect(
    () => client.events.error.subscribe((e) => savedCallback.current(e)),
    [client, savedCallback]
  );
}

// eslint-disable-next-line simple-import-sort/exports
export {
  _useInboxNotificationThread as useInboxNotificationThread,
  _useUser as useUser,
  _useUserSuspense as useUserSuspense,
  useInboxNotifications,
  useInboxNotificationsSuspense,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useDeleteAllInboxNotifications,
  useDeleteInboxNotification,
  useErrorListener,
  useRoomInfo,
  useRoomInfoSuspense,
  useGroupInfo,
  useGroupInfoSuspense,
  useSyncStatus,
  useUnreadInboxNotificationsCount,
  useUnreadInboxNotificationsCountSuspense,
  useNotificationSettings,
  useNotificationSettingsSuspense,
  useUpdateNotificationSettings,
  _useUserThreads_experimental as useUserThreads_experimental,
  _useUserThreadsSuspense_experimental as useUserThreadsSuspense_experimental,
  _useAiChats as useAiChats,
  _useAiChatsSuspense as useAiChatsSuspense,
  _useAiChat as useAiChat,
  _useAiChatSuspense as useAiChatSuspense,
  _useAiChatMessages as useAiChatMessages,
  _useAiChatMessagesSuspense as useAiChatMessagesSuspense,
  useAiChatStatus,
  useCreateAiChat,
  useDeleteAiChat,
  useSendAiMessage,
};
