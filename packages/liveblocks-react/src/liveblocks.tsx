import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ClientOptions,
  InboxNotificationData,
  ThreadData,
} from "@liveblocks/client";
import type {
  AsyncResult,
  BaseRoomInfo,
  DM,
  DU,
  OpaqueClient,
} from "@liveblocks/core";
import {
  assert,
  createClient,
  kInternal,
  makePoller,
  memoizeOnSuccess,
  raise,
  shallow,
  stringify,
} from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import { isStartsWith, isString } from "./lib/guards";
import { autoRetry, retryError } from "./lib/retry-error";
import { useInitial, useInitialUnlessFunction } from "./lib/use-initial";
import { use } from "./lib/use-polyfill";
import { useIsInsideRoom } from "./room";
import type {
  InboxNotificationsState,
  LiveblocksContextBundle,
  RoomInfoAsyncResult,
  RoomInfoAsyncSuccess,
  SharedContextBundle,
  ThreadsState,
  ThreadsStateSuccess,
  UnreadInboxNotificationsCountState,
  UserAsyncResult,
  UserAsyncSuccess,
  UseThreadsOptions,
  UseUserThreadsOptions,
} from "./types";
import type { UmbrellaStoreState } from "./umbrella-store";
import { applyOptimisticUpdates, UmbrellaStore } from "./umbrella-store";

/**
 * Raw access to the React context where the LiveblocksProvider stores the
 * current client. Exposed for advanced use cases only.
 *
 * @private This is a private/advanced API. Do not rely on it.
 */
export const ClientContext = createContext<OpaqueClient | null>(null);

function missingUserError(userId: string) {
  return new Error(`resolveUsers didn't return anything for user '${userId}'`);
}

function missingRoomInfoError(roomId: string) {
  return new Error(
    `resolveRoomsInfo didn't return anything for room '${roomId}'`
  );
}

const _umbrellaStores = new WeakMap<
  OpaqueClient,
  UmbrellaStore<BaseMetadata>
>();
const _extras = new WeakMap<
  OpaqueClient,
  ReturnType<typeof makeExtrasForClient>
>();
const _bundles = new WeakMap<
  OpaqueClient,
  LiveblocksContextBundle<BaseUserMeta, BaseMetadata>
>();

export const POLLING_INTERVAL = 60 * 1000; // 1 minute
export const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";
export const USER_THREADS_QUERY = "USER_THREADS";

function selectorFor_useInboxNotifications(
  state: UmbrellaStoreState<BaseMetadata>
): InboxNotificationsState {
  const query = state.queries[INBOX_NOTIFICATIONS_QUERY];

  if (query === undefined || query.isLoading) {
    return {
      isLoading: true,
    };
  }

  if (query.error !== undefined) {
    return {
      error: query.error,
      isLoading: false,
    };
  }

  return {
    inboxNotifications: selectInboxNotifications(state),
    isLoading: false,
  };
}

function selectUserThreads<M extends BaseMetadata>(
  state: UmbrellaStoreState<M>,
  options: UseThreadsOptions<M>
) {
  const result = applyOptimisticUpdates(state);

  // Filter threads to only include the non-deleted threads
  const threads = Object.values(result.threads).filter<ThreadData<M>>(
    (thread): thread is ThreadData<M> => {
      // We do not want to include threads that have been marked as deleted
      if (thread.deletedAt !== undefined) {
        return false;
      }

      const query = options.query;
      if (!query) return true;

      // If the query includes 'resolved' filter and the thread's 'resolved' value does not match the query's 'resolved' value, exclude the thread
      if (query.resolved !== undefined && thread.resolved !== query.resolved) {
        return false;
      }

      for (const key in query.metadata) {
        const metadataValue = thread.metadata[key];
        const filterValue = query.metadata[key];

        if (isStartsWith(filterValue) && isString(metadataValue)) {
          if (metadataValue.startsWith(filterValue.startsWith)) {
            return true;
          }
        }

        if (metadataValue !== filterValue) {
          return false;
        }
      }

      return true;
    }
  );

  // Sort threads by updated date (newest first) and then created date
  return threads.sort(
    (a, b) =>
      (b.updatedAt ?? b.createdAt).getTime() -
      (a.updatedAt ?? a.createdAt).getTime()
  );
}

function selectUnreadInboxNotificationsCount(
  state: UmbrellaStoreState<BaseMetadata>
) {
  let count = 0;

  for (const notification of selectInboxNotifications(state)) {
    if (
      notification.readAt === null ||
      notification.readAt < notification.notifiedAt
    ) {
      count++;
    }
  }

  return count;
}

function selectorFor_useUnreadInboxNotificationsCount(
  state: UmbrellaStoreState<BaseMetadata>
): UnreadInboxNotificationsCountState {
  const query = state.queries[INBOX_NOTIFICATIONS_QUERY];

  if (query === undefined || query.isLoading) {
    return {
      isLoading: true,
    };
  }

  if (query.error !== undefined) {
    return {
      error: query.error,
      isLoading: false,
    };
  }

  return {
    isLoading: false,
    count: selectUnreadInboxNotificationsCount(state),
  };
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
  // the "resolving of this user" returned undefined. In that case, still treat
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

export function selectInboxNotifications<M extends BaseMetadata>(
  state: UmbrellaStoreState<M>
): InboxNotificationData[] {
  const result = applyOptimisticUpdates(state);

  return Object.values(result.inboxNotifications).sort(
    // Sort so that the most recent notifications are first
    (a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime()
  );
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
    store = new UmbrellaStore();
    _umbrellaStores.set(client, store);
  }
  return store as unknown as UmbrellaStore<M>;
}

// TODO: Likely a better / more clear name for this helper will arise. I'll
// rename this later. All of these are implementation details to support inbox
// notifications on a per-client basis.
/** @internal Only exported for unit tests. */
export function getExtrasForClient<M extends BaseMetadata>(
  client: OpaqueClient
) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: UmbrellaStore<M>;
  };
}

function makeExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  const store = getUmbrellaStoreForClient(client);
  // TODO                                ^ Bind to M type param here

  let lastRequestedAt: Date | undefined;

  /**
   * Performs one network fetch, and updates the store and last requested at
   * date if successful. If unsuccessful, will throw.
   */
  async function fetchInboxNotifications() {
    // If inbox notifications have not been fetched yet, we get all of them
    // Else, we fetch only what changed since the last request
    if (lastRequestedAt === undefined) {
      const result = await client.getInboxNotifications();

      store.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications,
        [],
        [],
        INBOX_NOTIFICATIONS_QUERY
      );

      lastRequestedAt = result.requestedAt;
    } else {
      const result = await client.getInboxNotificationsSince({
        since: lastRequestedAt,
      });

      store.updateThreadsAndNotifications(
        result.threads.updated,
        result.inboxNotifications.updated,
        result.threads.deleted,
        result.inboxNotifications.deleted,
        INBOX_NOTIFICATIONS_QUERY
      );

      if (lastRequestedAt < result.requestedAt) {
        lastRequestedAt = result.requestedAt;
      }
    }
  }

  let pollerSubscribers = 0;
  const poller = makePoller(async () => {
    try {
      await waitUntilInboxNotificationsLoaded();
      await fetchInboxNotifications();
    } catch (err) {
      // When polling, we don't want to throw errors, ever
      console.warn(`Polling new inbox notifications failed: ${String(err)}`);
    }
  });

  /**
   * Will trigger an initial fetch of inbox notifications if this hasn't
   * already happened. Will resolve once there is initial data. Will retry
   * a few times automatically in case fetching fails, with incremental backoff
   * delays. Will throw eventually only if all retries fail.
   */
  const waitUntilInboxNotificationsLoaded = memoizeOnSuccess(async () => {
    store.setQueryLoading(INBOX_NOTIFICATIONS_QUERY);

    try {
      await autoRetry(
        () => fetchInboxNotifications(),
        5,
        [5000, 5000, 10000, 15000]
      );
    } catch (err) {
      // Store the error in the cache as a side-effect, for non-Suspense
      store.setQueryError(INBOX_NOTIFICATIONS_QUERY, err as Error);

      // Rethrow it for Suspense, where this promise must fail
      throw err;
    }
  });

  /**
   * Triggers an initial fetch of inbox notifications if this hasn't
   * already happened.
   */
  function loadInboxNotifications(): void {
    void waitUntilInboxNotificationsLoaded().catch(() => {
      // Deliberately catch and ignore any errors here
    });
  }

  /**
   * Enables polling for inbox notifications when the component mounts. Stops
   * polling on unmount.
   *
   * Safe to be called multiple times from different components. The first
   * component to mount starts the polling. The last component to unmount stops
   * the polling.
   */
  function useEnableInboxNotificationsPolling() {
    useEffect(() => {
      // Increment
      pollerSubscribers++;
      poller.start(POLLING_INTERVAL);

      return () => {
        // Decrement
        if (pollerSubscribers <= 0) {
          console.warn(
            `Internal unexpected behavior. Cannot decrease subscriber count for query "${INBOX_NOTIFICATIONS_QUERY}"`
          );
          return;
        }

        pollerSubscribers--;
        if (pollerSubscribers <= 0) {
          poller.stop();
        }
      };
    }, []);
  }

  const userThreadsPoller = makePoller(refreshUserThreads);

  let isFetchingUserThreadsUpdates = false;

  async function refreshUserThreads() {
    const since = userThreadslastRequestedAt;

    if (since === undefined || isFetchingUserThreadsUpdates) {
      return;
    }
    try {
      isFetchingUserThreadsUpdates = true;
      const updates = await client[kInternal].getThreadsSince({
        since,
      });
      isFetchingUserThreadsUpdates = false;
      store.updateThreadsAndNotifications(
        updates.threads.updated,
        [],
        updates.threads.deleted,
        [],
        USER_THREADS_QUERY
      );

      userThreadslastRequestedAt = updates.requestedAt;
    } catch (err) {
      isFetchingUserThreadsUpdates = false;
      return;
    }
  }

  const userThreadsSubscribersByQuery = new Map<string, number>();
  const userThreadsRequestsByQuery = new Map<string, Promise<unknown>>();

  function incrementUserThreadsQuerySubscribers(queryKey: string) {
    const subscribers = userThreadsSubscribersByQuery.get(queryKey) ?? 0;
    userThreadsSubscribersByQuery.set(queryKey, subscribers + 1);

    userThreadsPoller.start(POLLING_INTERVAL);

    // Decrement in the unsub function
    return () => {
      const subscribers = userThreadsSubscribersByQuery.get(queryKey);

      if (subscribers === undefined || subscribers <= 0) {
        console.warn(
          `Internal unexpected behavior. Cannot decrease subscriber count for query "${queryKey}"`
        );
        return;
      }

      userThreadsSubscribersByQuery.set(queryKey, subscribers - 1);

      let totalSubscribers = 0;
      for (const subscribers of userThreadsSubscribersByQuery.values()) {
        totalSubscribers += subscribers;
      }

      if (totalSubscribers <= 0) {
        userThreadsPoller.stop();
      }
    };
  }

  let userThreadslastRequestedAt: Date | undefined;

  async function getUserThreads(
    queryKey: string,
    options: UseUserThreadsOptions<M>,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = userThreadsRequestsByQuery.get(queryKey);

    // If a request was already made for the query, we do not make another request and return the existing promise of the request
    if (existingRequest !== undefined) return existingRequest;

    const request = client[kInternal].getThreads(options);

    // Store the promise of the request for the query so that we do not make another request for the same query
    userThreadsRequestsByQuery.set(queryKey, request);

    store.setQueryLoading(queryKey);

    try {
      const result = await request;

      store.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications,
        [],
        [],
        queryKey
      );

      /**
       * We set the `userThreadslastRequestedAt` value to the timestamp returned by the current request if:
       * 1. The `userThreadslastRequestedAt` value has not been set
       * OR
       * 2. The `userThreadslastRequestedAt` value is older than the timestamp returned by the current request
       */
      if (
        userThreadslastRequestedAt === undefined ||
        userThreadslastRequestedAt < result.requestedAt
      ) {
        userThreadslastRequestedAt = result.requestedAt;
      }

      userThreadsPoller.start(POLLING_INTERVAL);
    } catch (err) {
      userThreadsRequestsByQuery.delete(queryKey);

      // Retry the action using the exponential backoff algorithm
      retryError(() => {
        void getUserThreads(queryKey, options, {
          retryCount: retryCount + 1,
        });
      }, retryCount);

      // Set the query state to the error state
      store.setQueryError(queryKey, err as Error);
    }

    return;
  }

  return {
    store,
    useEnableInboxNotificationsPolling,
    waitUntilInboxNotificationsLoaded,
    loadInboxNotifications,
    incrementUserThreadsQuerySubscribers,
    getUserThreads,
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

    useInboxNotifications: () => useInboxNotifications_withClient(client),
    useUnreadInboxNotificationsCount: () =>
      useUnreadInboxNotificationsCount_withClient(client),

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    useDeleteInboxNotification,
    useDeleteAllInboxNotifications,

    useInboxNotificationThread,
    useUserThreads_experimental,

    ...shared.classic,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: () =>
        useInboxNotificationsSuspense_withClient(client),
      useUnreadInboxNotificationsCount: () =>
        useUnreadInboxNotificationsCountSuspense_withClient(client),

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,

      useDeleteInboxNotification,
      useDeleteAllInboxNotifications,

      useInboxNotificationThread,

      useUserThreads_experimental: useUserThreadsSuspense_experimental,

      ...shared.suspense,
    },
  };
  return bundle;
}

function useInboxNotifications_withClient(client: OpaqueClient) {
  const { loadInboxNotifications, store, useEnableInboxNotificationsPolling } =
    getExtrasForClient(client);

  // Trigger initial loading of inbox notifications if it hasn't started
  // already, but don't await its promise.
  useEffect(() => {
    loadInboxNotifications();
  }, [loadInboxNotifications]);

  useEnableInboxNotificationsPolling();
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useInboxNotifications,
    shallow
  );
}

function useInboxNotificationsSuspense_withClient(client: OpaqueClient) {
  const { waitUntilInboxNotificationsLoaded } = getExtrasForClient(client);

  // Suspend until there are at least some inbox notifications
  use(waitUntilInboxNotificationsLoaded());

  // We're in a Suspense world here, and as such, the useInboxNotifications()
  // hook is expected to only return success results when we're here.
  const result = useInboxNotifications_withClient(client);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function useUnreadInboxNotificationsCount_withClient(client: OpaqueClient) {
  const { store, loadInboxNotifications, useEnableInboxNotificationsPolling } =
    getExtrasForClient(client);

  // Trigger initial loading of inbox notifications if it hasn't started
  // already, but don't await its promise.
  useEffect(() => {
    loadInboxNotifications();
  }, [loadInboxNotifications]);

  useEnableInboxNotificationsPolling();
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useUnreadInboxNotificationsCount,
    shallow
  );
}

function useUnreadInboxNotificationsCountSuspense_withClient(
  client: OpaqueClient
) {
  const { waitUntilInboxNotificationsLoaded } = getExtrasForClient(client);

  // Suspend until there are at least some inbox notifications
  use(waitUntilInboxNotificationsLoaded());

  const result = useUnreadInboxNotificationsCount_withClient(client);
  assert(!result.isLoading, "Did not expect loading");
  assert(!result.error, "Did not expect error");
  return result;
}

function useMarkInboxNotificationAsRead_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store } = getExtrasForClient(client);

      const readAt = new Date();
      const optimisticUpdateId = store.addOptimisticUpdate({
        type: "mark-inbox-notification-as-read",
        inboxNotificationId,
        readAt,
      });

      client.markInboxNotificationAsRead(inboxNotificationId).then(
        () => {
          // Replace the optimistic update by the real thing
          store.updateInboxNotification(
            inboxNotificationId,
            optimisticUpdateId,
            (inboxNotification) => ({ ...inboxNotification, readAt })
          );
        },
        () => {
          // TODO: Broadcast errors to client
          store.removeOptimisticUpdate(optimisticUpdateId);
        }
      );
    },
    [client]
  );
}

function useMarkAllInboxNotificationsAsRead_withClient(client: OpaqueClient) {
  return useCallback(() => {
    const { store } = getExtrasForClient(client);
    const readAt = new Date();
    const optimisticUpdateId = store.addOptimisticUpdate({
      type: "mark-all-inbox-notifications-as-read",
      readAt,
    });

    client.markAllInboxNotificationsAsRead().then(
      () => {
        // Replace the optimistic update by the real thing
        store.updateAllInboxNotifications(
          optimisticUpdateId,
          (inboxNotification) => ({ ...inboxNotification, readAt })
        );
      },
      () => {
        // TODO: Broadcast errors to client
        store.removeOptimisticUpdate(optimisticUpdateId);
      }
    );
  }, [client]);
}

function useDeleteInboxNotification_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store } = getExtrasForClient(client);

      const deletedAt = new Date();
      const optimisticUpdateId = store.addOptimisticUpdate({
        type: "delete-inbox-notification",
        inboxNotificationId,
        deletedAt,
      });

      client.deleteInboxNotification(inboxNotificationId).then(
        () => {
          // Replace the optimistic update by the real thing
          store.deleteInboxNotification(
            inboxNotificationId,
            optimisticUpdateId
          );
        },
        () => {
          // TODO: Broadcast errors to client
          store.removeOptimisticUpdate(optimisticUpdateId);
        }
      );
    },
    [client]
  );
}

function useDeleteAllInboxNotifications_withClient(client: OpaqueClient) {
  return useCallback(() => {
    const { store } = getExtrasForClient(client);
    const deletedAt = new Date();
    const optimisticUpdateId = store.addOptimisticUpdate({
      type: "delete-all-inbox-notifications",
      deletedAt,
    });

    client.deleteAllInboxNotifications().then(
      () => {
        // Replace the optimistic update by the real thing
        store.deleteAllInboxNotifications(optimisticUpdateId);
      },
      () => {
        // TODO: Broadcast errors to client
        store.removeOptimisticUpdate(optimisticUpdateId);
      }
    );
  }, [client]);
}

function useInboxNotificationThread_withClient<M extends BaseMetadata>(
  client: OpaqueClient,
  inboxNotificationId: string
): ThreadData<M> {
  const { store } = getExtrasForClient<M>(client);

  const selector = useCallback(
    (state: UmbrellaStoreState<M>) => {
      const inboxNotification =
        state.inboxNotifications[inboxNotificationId] ??
        raise(`Inbox notification with ID "${inboxNotificationId}" not found`);

      if (inboxNotification.kind !== "thread") {
        raise(
          `Inbox notification with ID "${inboxNotificationId}" is not of kind "thread"`
        );
      }

      const thread =
        state.threads[inboxNotification.threadId] ??
        raise(
          `Thread with ID "${inboxNotification.threadId}" not found, this inbox notification might not be of kind "thread"`
        );

      return thread;
    },
    [inboxNotificationId]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );
}

function useUser_withClient<U extends BaseUserMeta>(
  client: Client<U>,
  userId: string
): UserAsyncResult<U["info"]> {
  const usersStore = client[kInternal].usersStore;

  const getUserState = useCallback(
    () => usersStore.getState(userId),
    [usersStore, userId]
  );

  useEffect(() => {
    // NOTE: .get() will trigger any actual fetches, whereas .getState() will not
    void usersStore.get(userId);
  }, [usersStore, userId]);

  const selector = useCallback(
    (state: ReturnType<typeof getUserState>) =>
      selectorFor_useUser(state, userId),
    [userId]
  );

  return useSyncExternalStoreWithSelector(
    usersStore.subscribe,
    getUserState,
    getUserState,
    selector,
    shallow
  );
}

function useUserSuspense_withClient<U extends BaseUserMeta>(
  client: Client<U>,
  userId: string
) {
  const usersStore = client[kInternal].usersStore;

  const getUserState = useCallback(
    () => usersStore.getState(userId),
    [usersStore, userId]
  );
  const userState = getUserState();

  if (!userState || userState.isLoading) {
    throw usersStore.get(userId);
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
    () => roomsInfoStore.getState(roomId),
    [roomsInfoStore, roomId]
  );

  const selector = useCallback(
    (state: ReturnType<typeof getRoomInfoState>) =>
      selectorFor_useRoomInfo(state, roomId),
    [roomId]
  );

  useEffect(() => {
    void roomsInfoStore.get(roomId);
  }, [roomsInfoStore, roomId]);

  return useSyncExternalStoreWithSelector(
    roomsInfoStore.subscribe,
    getRoomInfoState,
    getRoomInfoState,
    selector,
    shallow
  );
}

function useRoomInfoSuspense_withClient(client: OpaqueClient, roomId: string) {
  const roomsInfoStore = client[kInternal].roomsInfoStore;

  const getRoomInfoState = useCallback(
    () => roomsInfoStore.getState(roomId),
    [roomsInfoStore, roomId]
  );
  const roomInfoState = getRoomInfoState();

  if (!roomInfoState || roomInfoState.isLoading) {
    throw roomsInfoStore.get(roomId);
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

/** @internal */
export function createSharedContext<U extends BaseUserMeta>(
  client: Client<U>
): SharedContextBundle<U> {
  const useClient = () => client;
  return {
    classic: {
      useClient,
      useUser: (userId: string) => useUser_withClient(client, userId),
      useRoomInfo: (roomId: string) => useRoomInfo_withClient(client, roomId),
      useIsInsideRoom,
    },
    suspense: {
      useClient,
      useUser: (userId: string) => useUserSuspense_withClient(client, userId),
      useRoomInfo: (roomId: string) =>
        useRoomInfoSuspense_withClient(client, roomId),
      useIsInsideRoom,
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
 * @private This is an internal API.
 */
export function useClientOrNull<U extends BaseUserMeta>() {
  return useContext(ClientContext) as Client<U> | null;
}

/**
 * Obtains a reference to the current Liveblocks client.
 */
export function useClient<U extends BaseUserMeta>() {
  return (
    useClientOrNull<U>() ??
    raise("LiveblocksProvider is missing from the React tree.")
  );
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
    unstable_fallbackToHTTP: useInitial(o.unstable_fallbackToHTTP),
    unstable_streamData: useInitial(o.unstable_streamData),

    authEndpoint: useInitialUnlessFunction(o.authEndpoint),
    resolveMentionSuggestions: useInitialUnlessFunction(
      o.resolveMentionSuggestions
    ),
    resolveUsers: useInitialUnlessFunction(o.resolveUsers),
    resolveRoomsInfo: useInitialUnlessFunction(o.resolveRoomsInfo),

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
 * Do not use unless explicitely recommended by the Liveblocks team.
 */
function useUserThreads_experimental<M extends BaseMetadata>(
  options: UseUserThreadsOptions<M> = {
    query: {
      metadata: {},
    },
  }
): ThreadsState<M> {
  const queryKey = React.useMemo(
    () => makeUserThreadsQueryKey(options.query),
    [options]
  );

  const client = useClient<M>();

  const { store, incrementUserThreadsQuerySubscribers, getUserThreads } =
    getExtrasForClient<M>(client);

  useEffect(() => {
    void getUserThreads(queryKey, options);
    return incrementUserThreadsQuerySubscribers(queryKey);
  }, [queryKey, incrementUserThreadsQuerySubscribers, getUserThreads, options]);

  const selector = useCallback(
    (state: UmbrellaStoreState<M>): ThreadsState<M> => {
      const query = state.queries[queryKey];

      if (query === undefined || query.isLoading) {
        return {
          isLoading: true,
        };
      }

      if (query.error !== undefined) {
        return {
          threads: [],
          error: query.error,
          isLoading: false,
        };
      }

      return {
        threads: selectUserThreads(state, options),
        isLoading: false,
      };
    },
    [queryKey, options]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector,
    shallow
  );
}

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitely recommended by the Liveblocks team.
 */
function useUserThreadsSuspense_experimental<M extends BaseMetadata>(
  options: UseUserThreadsOptions<M> = {
    query: {
      metadata: {},
    },
  }
): ThreadsStateSuccess<M> {
  const queryKey = React.useMemo(
    () => makeUserThreadsQueryKey(options.query),
    [options]
  );

  const client = useClient<M>();

  const { store, getUserThreads } = getExtrasForClient<M>(client);

  React.useEffect(() => {
    const { incrementUserThreadsQuerySubscribers } = getExtrasForClient(client);
    return incrementUserThreadsQuerySubscribers(queryKey);
  }, [client, queryKey]);

  const query = store.get().queries[queryKey];

  if (query === undefined || query.isLoading) {
    throw getUserThreads(queryKey, options);
  }

  if (query.error) {
    throw query.error;
  }

  const selector = useCallback(
    (state: UmbrellaStoreState<M>): ThreadsStateSuccess<M> => {
      return {
        threads: selectUserThreads(state, options),
        isLoading: false,
      };
    },
    [options]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector,
    shallow
  );
}

/**
 * Returns the inbox notifications for the current user.
 *
 * @example
 * const { inboxNotifications, error, isLoading } = useInboxNotifications();
 */
function useInboxNotifications() {
  return useInboxNotifications_withClient(useClient());
}

/**
 * Returns the inbox notifications for the current user.
 *
 * @example
 * const { inboxNotifications } = useInboxNotifications();
 */
function useInboxNotificationsSuspense() {
  return useInboxNotificationsSuspense_withClient(useClient());
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
function useUnreadInboxNotificationsCount() {
  return useUnreadInboxNotificationsCount_withClient(useClient());
}

/**
 * Returns the number of unread inbox notifications for the current user.
 *
 * @example
 * const { count } = useUnreadInboxNotificationsCount();
 */
function useUnreadInboxNotificationsCountSuspense() {
  return useUnreadInboxNotificationsCountSuspense_withClient(useClient());
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
 * Do not use unless explicitely recommended by the Liveblocks team.
 */
const _useUserThreads_experimental: TypedBundle["useUserThreads_experimental"] =
  useUserThreads_experimental;

/**
 * @experimental
 *
 * This hook is experimental and could be removed or changed at any time!
 * Do not use unless explicitely recommended by the Liveblocks team.
 */
const _useUserThreadsSuspense_experimental: TypedBundle["suspense"]["useUserThreads_experimental"] =
  useUserThreadsSuspense_experimental;

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
  useRoomInfo,
  useRoomInfoSuspense,
  useUnreadInboxNotificationsCount,
  useUnreadInboxNotificationsCountSuspense,
  _useUserThreads_experimental as useUserThreads_experimental,
  _useUserThreadsSuspense_experimental as useUserThreadsSuspense_experimental,
};

const makeUserThreadsQueryKey = (options: UseUserThreadsOptions<DM>["query"]) =>
  `${USER_THREADS_QUERY}:${stringify(options)}`;
