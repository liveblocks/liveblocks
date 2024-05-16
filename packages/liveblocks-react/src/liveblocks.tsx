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

import { selectedInboxNotifications } from "./comments/lib/selected-inbox-notifications";
import { retryError } from "./lib/retry-error";
import { useInitial } from "./lib/use-initial";
import { createSharedContext } from "./shared";
import type {
  InboxNotificationsState,
  InboxNotificationsStateSuccess,
  LiveblocksContextBundle,
  UnreadInboxNotificationsCountState,
  UnreadInboxNotificationsCountStateSuccess,
} from "./types";

const ClientContext = createContext<Client | null>(null);

const _extras = new WeakMap<Client, ReturnType<typeof makeExtrasForClient>>();
const _bundles = new WeakMap<
  Client,
  LiveblocksContextBundle<BaseUserMeta, BaseMetadata>
>();

export const POLLING_INTERVAL = 60 * 1000; // 1 minute
export const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";

// --- Selector helpers ------------------------------------------------- {{{

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

// ---------------------------------------------------------------------- }}}
// --- Private APIs ----------------------------------------------------- {{{

function getOrCreateContextBundle<
  TUserMeta extends BaseUserMeta,
  TThreadMetadata extends BaseMetadata,
>(client: Client): LiveblocksContextBundle<TUserMeta, TThreadMetadata> {
  let bundle = _bundles.get(client);
  if (!bundle) {
    bundle = makeLiveblocksContextBundle(client);
    _bundles.set(client, bundle);
  }
  return bundle as LiveblocksContextBundle<TUserMeta, TThreadMetadata>;
}

function getExtrasForClient<TThreadMetadata extends BaseMetadata>(
  client: Client
) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: CacheStore<TThreadMetadata>;
  };
}

function makeExtrasForClient<TThreadMetadata extends BaseMetadata>(
  client: Client
) {
  const store = client[kInternal]
    .cacheStore as unknown as CacheStore<TThreadMetadata>;
  const notifications = client[kInternal].notifications;

  let fetchInboxNotificationsRequest: Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<TThreadMetadata>[];
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
  TUserMeta extends BaseUserMeta,
  TThreadMetadata extends BaseMetadata,
>(client: Client): LiveblocksContextBundle<TUserMeta, TThreadMetadata> {
  const {
    store,
    fetchInboxNotifications,
    useSubscribeToInboxNotificationsEffect,
  } = getExtrasForClient<TThreadMetadata>(client);

  function useInboxNotificationsSuspense(): InboxNotificationsStateSuccess {
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

  function useUnreadInboxNotificationsCountSuspense(): UnreadInboxNotificationsCountStateSuccess {
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

  function LiveblocksProvider(props: PropsWithChildren) {
    return (
      <ClientContext.Provider value={client}>
        {props.children}
      </ClientContext.Provider>
    );
  }

  // Bind all hooks to the current client instance
  const useInboxNotificationThread = (inboxNotificationId: string) =>
    useInboxNotificationThread_withClient<TThreadMetadata>(
      client,
      inboxNotificationId
    );

  const useMarkInboxNotificationAsRead = () =>
    useMarkInboxNotificationAsRead_withClient(client);

  const useMarkAllInboxNotificationsAsRead = () =>
    useMarkAllInboxNotificationsAsRead_withClient(client);

  const shared = createSharedContext<TUserMeta>(client);
  const bundle: LiveblocksContextBundle<TUserMeta, TThreadMetadata> = {
    LiveblocksProvider,

    useInboxNotifications: () => useInboxNotifications_withClient(client),
    useUnreadInboxNotificationsCount: () =>
      useUnreadInboxNotificationsCount_withClient(client),

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    useInboxNotificationThread,

    ...shared,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: useInboxNotificationsSuspense, // XXX Convert
      useUnreadInboxNotificationsCount:
        useUnreadInboxNotificationsCountSuspense, // XXX Convert

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

// ---------------------------------------------------------------------- }}}
// --- Private useXxx_withClient() helpers ------------------------------ {{{

function useInboxNotifications_withClient(client: Client) {
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

function useUnreadInboxNotificationsCount_withClient(client: Client) {
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

function useMarkInboxNotificationAsRead_withClient(client: Client) {
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

function useMarkAllInboxNotificationsAsRead_withClient(client: Client) {
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

function useInboxNotificationThread_withClient<
  TThreadMetadata extends BaseMetadata,
>(client: Client, inboxNotificationId: string): ThreadData<TThreadMetadata> {
  const { store } = getExtrasForClient<TThreadMetadata>(client);

  const selector = useCallback(
    (state: CacheState<TThreadMetadata>) => {
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

function useCurrentUserId_withClient(client: Client) {
  const currentUserIdStore = client[kInternal].currentUserIdStore;
  return useSyncExternalStore(
    currentUserIdStore.subscribe,
    currentUserIdStore.get,
    currentUserIdStore.get
  );
}

// ---------------------------------------------------------------------- }}}
// --- Public APIs ------------------------------------------------------ {{{

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
  props: PropsWithChildren<{ client: Client }>
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
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TThreadMetadata extends BaseMetadata = never,
>(client: Client): LiveblocksContextBundle<TUserMeta, TThreadMetadata> {
  return getOrCreateContextBundle<TUserMeta, TThreadMetadata>(client);
}

// ---------------------------------------------------------------------- }}}
