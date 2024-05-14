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

export const ContextBundle = createContext<LiveblocksContextBundle<
  BaseUserMeta,
  BaseMetadata
> | null>(null);

/**
 * @private
 *
 * This is an internal API, use "createLiveblocksContext" instead.
 */
export function useLiveblocksContextBundle() {
  return (
    useContext(ContextBundle) ??
    raise("LiveblocksProvider is missing from the React tree.")
  );
}

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

export function createLiveblocksContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TThreadMetadata extends BaseMetadata = never,
>(client: Client): LiveblocksContextBundle<TUserMeta, TThreadMetadata> {
  const shared = createSharedContext<TUserMeta>(client);

  const store = client[kInternal]
    .cacheStore as unknown as CacheStore<TThreadMetadata>;

  const notifications = client[kInternal].notifications;

  function LiveblocksProvider(props: PropsWithChildren) {
    return (
      <ContextBundle.Provider
        value={
          bundle as unknown as LiveblocksContextBundle<
            BaseUserMeta,
            BaseMetadata
          >
        }
      >
        {props.children}
      </ContextBundle.Provider>
    );
  }

  // TODO: Unify request cache
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

  const poller = makePoller(refreshThreadsAndNotifications);

  function refreshThreadsAndNotifications() {
    return notifications.getInboxNotifications({ since: lastRequestedAt }).then(
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
    );
  }

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

  function useInboxNotifications(): InboxNotificationsState {
    useSubscribeToInboxNotificationsEffect();
    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      selectorFor_useInboxNotifications
    );
  }

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

  function useUnreadInboxNotificationsCount(): UnreadInboxNotificationsCountState {
    useSubscribeToInboxNotificationsEffect();
    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      selectorFor_useUnreadInboxNotificationsCount
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

  function useMarkInboxNotificationAsRead() {
    return useCallback((inboxNotificationId: string) => {
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
    }, []);
  }

  function useMarkAllInboxNotificationsAsRead() {
    return useCallback(() => {
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
    }, []);
  }

  function useInboxNotificationThread(
    inboxNotificationId: string
  ): ThreadData<TThreadMetadata> {
    const selector = useCallback(
      (state: CacheState<TThreadMetadata>) => {
        const inboxNotification =
          state.inboxNotifications[inboxNotificationId] ??
          raise(
            `Inbox notification with ID "${inboxNotificationId}" not found`
          );

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

  const currentUserIdStore = client[kInternal].currentUserIdStore;

  function useCurrentUserId() {
    return useSyncExternalStore(
      currentUserIdStore.subscribe,
      currentUserIdStore.get,
      currentUserIdStore.get
    );
  }

  const bundle: LiveblocksContextBundle<TUserMeta, TThreadMetadata> = {
    LiveblocksProvider,

    useInboxNotifications,
    useUnreadInboxNotificationsCount,

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    useInboxNotificationThread,

    ...shared,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: useInboxNotificationsSuspense,
      useUnreadInboxNotificationsCount:
        useUnreadInboxNotificationsCountSuspense,

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,

      useInboxNotificationThread,

      ...shared.suspense,
    },

    [kInternal]: {
      useCurrentUserId,
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}
