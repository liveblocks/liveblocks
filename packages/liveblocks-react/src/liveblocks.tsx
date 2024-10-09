import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ClientOptions,
  ThreadData,
} from "@liveblocks/client";
import type {
  AsyncResult,
  BaseRoomInfo,
  DM,
  DU,
  InboxNotificationData,
  OpaqueClient,
} from "@liveblocks/core";
import {
  assert,
  createClient,
  kInternal,
  makePoller,
  raise,
  shallow,
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

import { useIsInsideRoom } from "./contexts";
import { shallow2 } from "./lib/shallow2";
import { useInitial, useInitialUnlessFunction } from "./lib/use-initial";
import { use } from "./lib/use-polyfill";
import type {
  InboxNotificationsAsyncResult,
  LiveblocksContextBundle,
  RoomInfoAsyncResult,
  RoomInfoAsyncSuccess,
  SharedContextBundle,
  ThreadsAsyncResult,
  ThreadsAsyncSuccess,
  UnreadInboxNotificationsCountAsyncResult,
  UserAsyncResult,
  UserAsyncSuccess,
  UseUserThreadsOptions,
} from "./types";
import { UmbrellaStore } from "./umbrella-store";

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

export const POLLING_INTERVAL = 60 * 1000; // every minute

function selectUnreadInboxNotificationsCount(
  inboxNotifications: readonly InboxNotificationData[]
) {
  let count = 0;

  for (const notification of inboxNotifications) {
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
  result: InboxNotificationsAsyncResult
): UnreadInboxNotificationsCountAsyncResult {
  if (!result.inboxNotifications) {
    // Can be loading or error states
    return result;
  }

  // OK state
  return {
    isLoading: false,
    count: selectUnreadInboxNotificationsCount(result.inboxNotifications),
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

function makeDeltaPoller_Notifications(store: UmbrellaStore<BaseMetadata>) {
  const poller = makePoller(async () => {
    try {
      await store.waitUntilNotificationsLoaded();
      await store.fetchNotificationsDeltaUpdate();
    } catch (err) {
      // When polling, we don't want to throw errors, ever
      console.warn(`Polling new inbox notifications failed: ${String(err)}`);
    }
  }, POLLING_INTERVAL);

  // Keep track of the number of subscribers
  let pollerSubscribers = 0;

  return () => {
    pollerSubscribers++;

    // NIMESH - We should wait until the lastRequestedAt date is known using a promise and then
    // in the `then` body, check again if the number of subscribers if more than 0, and only then
    // if those conditions hold, start the poller
    poller.enable(pollerSubscribers > 0);

    return () => {
      pollerSubscribers--;

      // NIMESH - When stopping the poller, we should also ideally abort its
      // poller function, maybe using an AbortController? This functionality
      // should be automatic and handled by the Poller abstraction, not here!
      poller.enable(pollerSubscribers > 0);
    };
  };
}

// NIMESH - DRY up these makeDeltaPoller_* abstractions, now that the symmetry has become clear!
function makeDeltaPoller_UserThreads(store: UmbrellaStore<BaseMetadata>) {
  const poller = makePoller(async () => {
    try {
      await store.fetchUserThreadsDeltaUpdate();
    } catch (err) {
      // When polling, we don't want to throw errors, ever
      console.warn(`Polling new user threads failed: ${String(err)}`);
    }
  }, POLLING_INTERVAL);

  // Keep track of the number of subscribers
  let pollerSubscribers = 0;

  return () => {
    pollerSubscribers++;

    // NIMESH - We should wait until the lastRequestedAt date is known using a promise and then
    // in the `then` body, check again if the number of subscribers if more than 0, and only then
    // if those conditions hold, start the poller
    // promise.then(() => { if (subscribers > 0 ) initialPoller() else: do nothing })
    poller.enable(pollerSubscribers > 0);

    return () => {
      pollerSubscribers--;

      // NIMESH - When stopping the poller, we should also ideally abort its
      // poller function, maybe using an AbortController? This functionality
      // should be automatic and handled by the Poller abstraction, not here!
      poller.enable(pollerSubscribers > 0);
    };
  };
}

// NIMESH - DRY up these makeDeltaPoller_* abstractions, now that the symmetry has become clear!
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

  return {
    store,
    /**
     * Sub/unsub pair to start the process of watching for new incoming inbox
     * notifications through a stream of delta updates. Call the unsub function
     * returned to stop this subscription when unmounting. Currently
     * implemented by a periodic poller.
     */
    subscribeToNotificationsDeltaUpdates: makeDeltaPoller_Notifications(store),
    /**
     * Sub/unsub pair to start the process of watching for new user threads
     * through a stream of delta updates. Call the unsub function returned to
     * stop this subscription when unmounting. Currently implemented by
     * a periodic poller.
     */
    subscribeToUserThreadsDeltaUpdates: makeDeltaPoller_UserThreads(store),
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

    useInboxNotifications: () =>
      useInboxNotifications_withClient(client, identity, shallow),
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

function useInboxNotifications_withClient<T>(
  client: OpaqueClient,
  selector: (result: InboxNotificationsAsyncResult) => T,
  isEqual: (a: T, b: T) => boolean
): T {
  const {
    store,
    subscribeToNotificationsDeltaUpdates: subscribeToDeltaUpdates,
  } = getLiveblocksExtrasForClient(client);

  // Trigger initial loading of inbox notifications if it hasn't started
  // already, but don't await its promise.
  useEffect(() => {
    // NIMESH - Verify that we need the catch or not
    void store.waitUntilNotificationsLoaded().catch(() => {
      // Deliberately catch and ignore any errors here
    });
    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  });

  useEffect(subscribeToDeltaUpdates, [subscribeToDeltaUpdates]);

  return useSyncExternalStoreWithSelector(
    store.subscribeThreadsOrInboxNotifications,
    store.getInboxNotificationsAsync,
    store.getInboxNotificationsAsync,
    selector,
    isEqual
  );
}

function useInboxNotificationsSuspense_withClient(client: OpaqueClient) {
  const store = getLiveblocksExtrasForClient(client).store;

  // Suspend until there are at least some inbox notifications
  use(store.waitUntilNotificationsLoaded());

  // We're in a Suspense world here, and as such, the useInboxNotifications()
  // hook is expected to only return success results when we're here.
  const result = useInboxNotifications_withClient(client, identity, shallow);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function useUnreadInboxNotificationsCount_withClient(client: OpaqueClient) {
  return useInboxNotifications_withClient(
    client,
    selectorFor_useUnreadInboxNotificationsCount,
    shallow
  );
}

function useUnreadInboxNotificationsCountSuspense_withClient(
  client: OpaqueClient
) {
  const store = getLiveblocksExtrasForClient(client).store;

  // Suspend until there are at least some inbox notifications
  use(store.waitUntilNotificationsLoaded());

  const result = useUnreadInboxNotificationsCount_withClient(client);
  assert(!result.isLoading, "Did not expect loading");
  assert(!result.error, "Did not expect error");
  return result;
}

function useMarkInboxNotificationAsRead_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store } = getLiveblocksExtrasForClient(client);

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
    const { store } = getLiveblocksExtrasForClient(client);
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
      const { store } = getLiveblocksExtrasForClient(client);

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
    const { store } = getLiveblocksExtrasForClient(client);
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
  const { store } = getLiveblocksExtrasForClient<M>(client);

  const getter = store.getFullState;

  const selector = useCallback(
    (state: ReturnType<typeof getter>) => {
      const inboxNotification =
        state.notificationsById[inboxNotificationId] ??
        raise(`Inbox notification with ID "${inboxNotificationId}" not found`);

      if (inboxNotification.kind !== "thread") {
        raise(
          `Inbox notification with ID "${inboxNotificationId}" is not of kind "thread"`
        );
      }

      const thread =
        // XXX Check with Marc. Should this be .getEvenIfDeleted? This is not what the return type is saying!
        state.threadsDB.getEvenIfDeleted(inboxNotification.threadId) ??
        raise(
          `Thread with ID "${inboxNotification.threadId}" not found, this inbox notification might not be of kind "thread"`
        );

      return thread;
    },
    [inboxNotificationId]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribeThreadsOrInboxNotifications, // Re-evaluate if we need to update any time the notification changes over time
    getter,
    getter,
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
  options: UseUserThreadsOptions<M> = {
    query: {
      metadata: {},
    },
  }
): ThreadsAsyncResult<M> {
  const client = useClient<M>();

  const { store, subscribeToUserThreadsDeltaUpdates: subscribeToDeltaUpdates } =
    getLiveblocksExtrasForClient<M>(client);

  useEffect(
    () => {
      // NIMESH - Verify that we need the catch or not
      void store.waitUntilUserThreadsLoaded(options.query).catch(() => {
        // Deliberately catch and ignore any errors here
      });
    }
    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(subscribeToDeltaUpdates, [subscribeToDeltaUpdates]);

  const getter = useCallback(
    () => store.getUserThreadsAsync(options.query),
    [store, options.query]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribeUserThreads,
    getter,
    getter,
    identity,
    shallow2 // NOTE: Using 2-level-deep shallow check here, because the result of selectThreads() is not stable!
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
  options: UseUserThreadsOptions<M> = {
    query: {
      metadata: {},
    },
  }
): ThreadsAsyncSuccess<M> {
  const client = useClient<M>();

  const { store } = getLiveblocksExtrasForClient<M>(client);

  use(store.waitUntilUserThreadsLoaded(options.query));

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
function useInboxNotifications() {
  return useInboxNotifications_withClient(useClient(), identity, shallow);
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
