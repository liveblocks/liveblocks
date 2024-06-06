import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ThreadData,
} from "@liveblocks/client";
import type {
  CacheState,
  CacheStore,
  ClientOptions,
  DM,
  DU,
  InboxNotificationData,
  InboxNotificationDeleteInfo,
  OpaqueClient,
  PrivateClientApi,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import { createClient, kInternal, makePoller, raise } from "@liveblocks/core";
import { nanoid } from "nanoid";
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

import { retryError } from "./lib/retry-error";
import { useInitial, useInitialUnlessFunction } from "./lib/use-initial";
import type {
  InboxNotificationsState,
  InboxNotificationsStateSuccess,
  LiveblocksContextBundle,
  RoomInfoState,
  RoomInfoStateSuccess,
  SharedContextBundle,
  UnreadInboxNotificationsCountState,
  UnreadInboxNotificationsCountStateSuccess,
  UserState,
  UserStateSuccess,
} from "./types";
import { selectedInboxNotifications } from "./comments/lib/selected-inbox-notifications";

export const ClientContext = createContext<OpaqueClient | null>(null);

const missingUserError = new Error(
  "resolveUsers didn't return anything for this user ID."
);
const missingRoomInfoError = new Error(
  "resolveRoomsInfo didn't return anything for this room ID."
);

const _extras = new WeakMap<
  OpaqueClient,
  ReturnType<typeof makeExtrasForClient>
>();
const _bundles = new WeakMap<
  OpaqueClient,
  LiveblocksContextBundle<BaseUserMeta, BaseMetadata>
>();

// export const POLLING_INTERVAL = 60 * 1000; // 1 minute
export const POLLING_INTERVAL = 5 * 1000; // 1 minute
export const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";

function selectorFor_useInboxNotifications(
  state: CacheState<BaseMetadata>
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
    inboxNotifications: selectedInboxNotifications(state),
    isLoading: false,
  };
}

function selectorFor_useInboxNotificationsSuspense(
  state: CacheState<BaseMetadata>
): InboxNotificationsStateSuccess {
  return {
    inboxNotifications: selectedInboxNotifications(state),
    isLoading: false,
  };
}

function selectUnreadInboxNotificationsCount(state: CacheState<BaseMetadata>) {
  let count = 0;

  for (const notification of selectedInboxNotifications(state)) {
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
  state: CacheState<BaseMetadata>
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

function selectorFor_useUnreadInboxNotificationsCountSuspense(
  state: CacheState<BaseMetadata>
): UnreadInboxNotificationsCountStateSuccess {
  return {
    isLoading: false,
    count: selectUnreadInboxNotificationsCount(state),
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

// TODO: Likely a better / more clear name for this helper will arise. I'll
// rename this later. All of these are implementation details to support inbox
// notifications on a per-client basis.
function getExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: CacheStore<M>;
  };
}

function makeExtrasForClient<U extends BaseUserMeta, M extends BaseMetadata>(
  client: OpaqueClient
) {
  const internals = client[kInternal] as PrivateClientApi<U, M>;
  const store = internals.cacheStore;
  const notifications = internals.notifications;

  let fetchInboxNotificationsRequest: Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<M>[];
    deletedThreads: ThreadDeleteInfo[];
    deletedInboxNotifications: InboxNotificationDeleteInfo[];
    meta: {
      requestedAt: Date;
    };
  }> | null = null;

  let lastRequestedAt: Date | undefined;

  const poller = makePoller(() =>
    notifications.getInboxNotifications({ since: lastRequestedAt }).then(
      (result) => {
        lastRequestedAt = result.meta.requestedAt;

        store.updateThreadsAndNotifications(
          result.threads,
          result.inboxNotifications,
          result.deletedThreads,
          result.deletedInboxNotifications,
          INBOX_NOTIFICATIONS_QUERY
        );
      },
      () => {
        // TODO: Error handling
      }
    )
  );

  async function fetchInboxNotifications(
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    if (fetchInboxNotificationsRequest !== null) {
      return fetchInboxNotificationsRequest;
    }

    store.setQueryState(INBOX_NOTIFICATIONS_QUERY, {
      isLoading: true,
    });

    try {
      fetchInboxNotificationsRequest = notifications.getInboxNotifications();

      const result = await fetchInboxNotificationsRequest;

      store.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications,
        result.deletedThreads,
        result.deletedInboxNotifications,
        INBOX_NOTIFICATIONS_QUERY
      );

      /**
       * We set the `lastRequestedAt` to the timestamp returned by the current request if:
       * 1. The `lastRequestedAt`has not been set
       * OR
       * 2. The current `lastRequestedAt` is older than the timestamp returned by the current request
       */
      if (
        lastRequestedAt === undefined ||
        lastRequestedAt > result.meta.requestedAt
      ) {
        lastRequestedAt = result.meta.requestedAt;
      }

      poller.start(POLLING_INTERVAL);
    } catch (er) {
      fetchInboxNotificationsRequest = null;

      // Retry the action using the exponential backoff algorithm
      retryError(() => {
        void fetchInboxNotifications({
          retryCount: retryCount + 1,
        });
      }, retryCount);

      store.setQueryState(INBOX_NOTIFICATIONS_QUERY, {
        isLoading: false,
        error: er as Error,
      });
    }
    return;
  }

  let inboxNotificationsSubscribers = 0;

  function useSubscribeToInboxNotificationsEffect(options?: {
    autoFetch: boolean;
  }) {
    const autoFetch = useInitial(options?.autoFetch ?? true);
    useEffect(() => {
      if (autoFetch) {
        void fetchInboxNotifications();
      }

      // Increment
      inboxNotificationsSubscribers++;
      poller.start(POLLING_INTERVAL);

      return () => {
        // Decrement
        if (inboxNotificationsSubscribers <= 0) {
          console.warn(
            `Internal unexpected behavior. Cannot decrease subscriber count for query "${INBOX_NOTIFICATIONS_QUERY}"`
          );
          return;
        }

        inboxNotificationsSubscribers--;
        if (inboxNotificationsSubscribers <= 0) {
          poller.stop();
        }
      };
    }, [autoFetch]);
  }

  return {
    store,
    notifications,
    fetchInboxNotifications,
    useSubscribeToInboxNotificationsEffect,
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

  // NOTE: This version of the LiveblocksProvider does _not_ take any props.
  // This is because we already have a client bound to it.
  function LiveblocksProvider(props: PropsWithChildren) {
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

    useInboxNotificationThread,

    ...shared.classic,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: () =>
        useInboxNotificationsSuspense_withClient(client),
      useUnreadInboxNotificationsCount: () =>
        useUnreadInboxNotificationsCountSuspense_withClient(client),

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,

      useInboxNotificationThread,

      ...shared.suspense,
    },
  };
  return bundle;
}

function useInboxNotifications_withClient(client: OpaqueClient) {
  const { store, useSubscribeToInboxNotificationsEffect } =
    getExtrasForClient(client);

  useSubscribeToInboxNotificationsEffect();
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useInboxNotifications
  );
}

function useInboxNotificationsSuspense_withClient(client: OpaqueClient) {
  const {
    store,
    fetchInboxNotifications,
    useSubscribeToInboxNotificationsEffect,
  } = getExtrasForClient(client);

  const query = store.get().queries[INBOX_NOTIFICATIONS_QUERY];

  if (query === undefined || query.isLoading) {
    throw fetchInboxNotifications();
  }

  if (query.error !== undefined) {
    throw query.error;
  }

  useSubscribeToInboxNotificationsEffect({ autoFetch: false });
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useInboxNotificationsSuspense
  );
}

function useUnreadInboxNotificationsCount_withClient(client: OpaqueClient) {
  const { store, useSubscribeToInboxNotificationsEffect } =
    getExtrasForClient(client);

  useSubscribeToInboxNotificationsEffect();
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useUnreadInboxNotificationsCount
  );
}

function useUnreadInboxNotificationsCountSuspense_withClient(
  client: OpaqueClient
) {
  const {
    store,
    fetchInboxNotifications,
    useSubscribeToInboxNotificationsEffect,
  } = getExtrasForClient(client);

  const query = store.get().queries[INBOX_NOTIFICATIONS_QUERY];

  if (query === undefined || query.isLoading) {
    throw fetchInboxNotifications();
  }

  useSubscribeToInboxNotificationsEffect({ autoFetch: false });
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selectorFor_useUnreadInboxNotificationsCountSuspense
  );
}

function useMarkInboxNotificationAsRead_withClient(client: OpaqueClient) {
  return useCallback(
    (inboxNotificationId: string) => {
      const { store, notifications } = getExtrasForClient(client);

      const optimisticUpdateId = nanoid();
      const readAt = new Date();
      store.pushOptimisticUpdate({
        type: "mark-inbox-notification-as-read",
        id: optimisticUpdateId,
        inboxNotificationId,
        readAt,
      });

      notifications.markInboxNotificationAsRead(inboxNotificationId).then(
        () => {
          store.set((state) => {
            const existingNotification =
              state.inboxNotifications[inboxNotificationId];

            // If existing notification has been deleted, we return the existing state
            if (existingNotification === undefined) {
              return {
                ...state,
                optimisticUpdates: state.optimisticUpdates.filter(
                  (update) => update.id !== optimisticUpdateId
                ),
              };
            }

            return {
              ...state,
              inboxNotifications: {
                ...state.inboxNotifications,
                [inboxNotificationId]: {
                  ...existingNotification,
                  readAt,
                },
              },
              optimisticUpdates: state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              ),
            };
          });
        },
        () => {
          // TODO: Broadcast errors to client
          store.set((state) => ({
            ...state,
            optimisticUpdates: state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            ),
          }));
        }
      );
    },
    [client]
  );
}

function useMarkAllInboxNotificationsAsRead_withClient(client: OpaqueClient) {
  return useCallback(() => {
    const { store, notifications } = getExtrasForClient(client);
    const optimisticUpdateId = nanoid();
    const readAt = new Date();
    store.pushOptimisticUpdate({
      type: "mark-inbox-notifications-as-read",
      id: optimisticUpdateId,
      readAt,
    });

    notifications.markAllInboxNotificationsAsRead().then(
      () => {
        store.set((state) => ({
          ...state,
          inboxNotifications: Object.fromEntries(
            Array.from(Object.entries(state.inboxNotifications)).map(
              ([id, inboxNotification]) => [
                id,
                { ...inboxNotification, readAt },
              ]
            )
          ),
          optimisticUpdates: state.optimisticUpdates.filter(
            (update) => update.id !== optimisticUpdateId
          ),
        }));
      },
      () => {
        // TODO: Broadcast errors to client
        store.set((state) => ({
          ...state,
          optimisticUpdates: state.optimisticUpdates.filter(
            (update) => update.id !== optimisticUpdateId
          ),
        }));
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
    (state: CacheState<M>) => {
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
): UserState<U["info"]> {
  const usersStore = client[kInternal].usersStore;

  const getUserState = useCallback(
    () => usersStore.getState(userId),
    [usersStore, userId]
  );

  useEffect(() => {
    void usersStore.get(userId);
  }, [usersStore, userId]);

  const state = useSyncExternalStore(
    usersStore.subscribe,
    getUserState,
    getUserState
  );

  return state
    ? ({
        isLoading: state.isLoading,
        user: state.data,
        // Return an error if `undefined` was returned by `resolveUsers` for this user ID
        error:
          !state.isLoading && !state.data && !state.error
            ? missingUserError
            : state.error,
      } as UserState<U["info"]>)
    : { isLoading: true };
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
    throw missingUserError;
  }

  const state = useSyncExternalStore(
    usersStore.subscribe,
    getUserState,
    getUserState
  );

  return {
    isLoading: false,
    user: state?.data,
    error: state?.error,
  } as UserStateSuccess<U["info"]>;
}

function useRoomInfo_withClient(
  client: OpaqueClient,
  roomId: string
): RoomInfoState {
  const roomsInfoStore = client[kInternal].roomsInfoStore;

  const getRoomInfoState = useCallback(
    () => roomsInfoStore.getState(roomId),
    [roomsInfoStore, roomId]
  );

  useEffect(() => {
    void roomsInfoStore.get(roomId);
  }, [roomsInfoStore, roomId]);

  const state = useSyncExternalStore(
    roomsInfoStore.subscribe,
    getRoomInfoState,
    getRoomInfoState
  );

  return state
    ? ({
        isLoading: state.isLoading,
        info: state.data,
        // Return an error if `undefined` was returned by `resolveRoomsInfo` for this room ID
        error:
          !state.isLoading && !state.data && !state.error
            ? missingRoomInfoError
            : state.error,
      } as RoomInfoState)
    : { isLoading: true };
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
    throw missingRoomInfoError;
  }

  const state = useSyncExternalStore(
    roomsInfoStore.subscribe,
    getRoomInfoState,
    getRoomInfoState
  );

  return {
    isLoading: false,
    info: state?.data,
    error: state?.error,
  } as RoomInfoStateSuccess;
}

/** @internal */
export function createSharedContext<U extends BaseUserMeta>(
  client: Client<U>
): SharedContextBundle<U> {
  return {
    classic: {
      useUser: (userId: string) => useUser_withClient(client, userId),
      useRoomInfo: (roomId: string) => useRoomInfo_withClient(client, roomId),
    },
    suspense: {
      useUser: (userId: string) => useUserSuspense_withClient(client, userId),
      useRoomInfo: (roomId: string) =>
        useRoomInfoSuspense_withClient(client, roomId),
    },
  };
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
 * @private
 */
export function LiveblocksProviderWithClient(
  props: PropsWithChildren<{ client: OpaqueClient }>
) {
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  );
}

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

export function createLiveblocksContext<
  U extends BaseUserMeta = DU,
  M extends BaseMetadata = DM,
>(client: OpaqueClient): LiveblocksContextBundle<U, M> {
  return getOrCreateContextBundle<U, M>(client);
}

function useInboxNotifications() {
  return useInboxNotifications_withClient(useClient());
}

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

function useMarkAllInboxNotificationsAsRead() {
  return useMarkAllInboxNotificationsAsRead_withClient(useClient());
}

function useMarkInboxNotificationAsRead() {
  return useMarkInboxNotificationAsRead_withClient(useClient());
}

function useUnreadInboxNotificationsCount() {
  return useUnreadInboxNotificationsCount_withClient(useClient());
}

function useUnreadInboxNotificationsCountSuspense() {
  return useUnreadInboxNotificationsCountSuspense_withClient(useClient());
}

function useUser<U extends BaseUserMeta>(userId: string) {
  const client = useClient<U>();
  return useUser_withClient(client, userId);
}

function useUserSuspense<U extends BaseUserMeta>(userId: string) {
  const client = useClient<U>();
  return useUserSuspense_withClient(client, userId);
}

function useRoomInfo(roomId: string) {
  return useRoomInfo_withClient(useClient(), roomId);
}

function useRoomInfoSuspense(roomId: string) {
  return useRoomInfoSuspense_withClient(useClient(), roomId);
}

// TODO in 2.0 Copy/paste all the docstrings onto these global hooks :(
const __1: LiveblocksContextBundle<DU, DM>["useInboxNotificationThread"] =
  useInboxNotificationThread;
const __2: LiveblocksContextBundle<DU, DM>["useUser"] = useUser;
const __3: LiveblocksContextBundle<DU, DM>["suspense"]["useUser"] =
  useUserSuspense;

// eslint-disable-next-line simple-import-sort/exports
export {
  __1 as useInboxNotificationThread,
  __2 as useUser,
  __3 as useUserSuspense,
  useInboxNotifications,
  useInboxNotificationsSuspense,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useRoomInfo,
  useRoomInfoSuspense,
  useUnreadInboxNotificationsCount,
  useUnreadInboxNotificationsCountSuspense,
};
