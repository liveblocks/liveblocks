import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ThreadData,
} from "@liveblocks/client";
import type {
  CacheState,
  CacheStore,
  InboxNotificationData,
  InboxNotificationDeleteInfo,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import { kInternal, makePoller, raise } from "@liveblocks/core";
import { nanoid } from "nanoid";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import { retryError } from "./lib/retry-error";
import { useInitial } from "./lib/use-initial";
import type { DU } from "./shared";
import { createSharedContext } from "./shared";
import type {
  InboxNotificationsState,
  InboxNotificationsStateSuccess,
  LiveblocksContextBundle,
  UnreadInboxNotificationsCountState,
  UnreadInboxNotificationsCountStateSuccess,
} from "./types";

type OpaqueClient = Client<BaseUserMeta>;

const ClientContext = createContext<OpaqueClient | null>(null);

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
  client: OpaqueClient,
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
    inboxNotifications:
      client[kInternal].comments.selectedInboxNotifications(state),
    isLoading: false,
  };
}

function selectorFor_useInboxNotificationsSuspense(
  client: OpaqueClient,
  state: CacheState<BaseMetadata>
): InboxNotificationsStateSuccess {
  return {
    inboxNotifications:
      client[kInternal].comments.selectedInboxNotifications(state),
    isLoading: false,
  };
}

function selectUnreadInboxNotificationsCount(
  client: OpaqueClient,
  state: CacheState<BaseMetadata>
) {
  let count = 0;

  for (const notification of client[
    kInternal
  ].comments.selectedInboxNotifications(state)) {
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
  client: OpaqueClient,
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
    count: selectUnreadInboxNotificationsCount(client, state),
  };
}

function selectorFor_useUnreadInboxNotificationsCountSuspense(
  client: OpaqueClient,
  state: CacheState<BaseMetadata>
): UnreadInboxNotificationsCountStateSuccess {
  return {
    isLoading: false,
    count: selectUnreadInboxNotificationsCount(client, state),
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

function makeExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  const store = client[kInternal].cacheStore as unknown as CacheStore<M>;
  const notifications = client[kInternal].notifications;

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

    [kInternal]: {
      useCurrentUserId: () => useCurrentUserId_withClient(client),
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}

function useInboxNotifications_withClient(client: OpaqueClient) {
  const { store, useSubscribeToInboxNotificationsEffect } =
    getExtrasForClient(client);

  useSubscribeToInboxNotificationsEffect();
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    () => selectorFor_useInboxNotifications(client, store.get())
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
    () => selectorFor_useInboxNotificationsSuspense(client, store.get())
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
    () => selectorFor_useUnreadInboxNotificationsCount(client, store.get())
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
    () =>
      selectorFor_useUnreadInboxNotificationsCountSuspense(client, store.get())
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

function useCurrentUserId_withClient(client: OpaqueClient) {
  const currentUserIdStore = client[kInternal].currentUserIdStore;
  return useSyncExternalStore(
    currentUserIdStore.subscribe,
    currentUserIdStore.get,
    currentUserIdStore.get
  );
}

/**
 * @private This is an internal API.
 */
export function useClientOrNull() {
  return useContext(ClientContext);
}

/**
 * @beta This is an internal API for now, but it will become public eventually.
 */
export function useClient() {
  return (
    useClientOrNull() ??
    raise("LiveblocksProvider is missing from the React tree.")
  );
}

/**
 * @beta This is an internal API for now, but it will become public eventually.
 */
export function LiveblocksProvider(
  props: PropsWithChildren<{ client: OpaqueClient }>
) {
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  );
}

/**
 * @private
 *
 * This is an internal API, use "createLiveblocksContext" instead.
 */
export function useLiveblocksContextBundleOrNull() {
  const client = useClientOrNull();
  return client !== null ? getOrCreateContextBundle(client) : null;
}

/**
 * @private
 *
 * This is an internal API, use "createLiveblocksContext" instead.
 */
export function useLiveblocksContextBundle() {
  const client = useClient();
  return getOrCreateContextBundle(client);
}

export function createLiveblocksContext<
  U extends BaseUserMeta = DU,
  M extends BaseMetadata = never, // TODO Change this to DM for 2.0
>(client: OpaqueClient): LiveblocksContextBundle<U, M> {
  return getOrCreateContextBundle<U, M>(client);
}
