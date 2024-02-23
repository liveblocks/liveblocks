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
  Store,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import { kInternal, makePoller } from "@liveblocks/core";
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
import { createSharedContext } from "./shared";
import type {
  InboxNotificationsState,
  InboxNotificationsStateSuccess,
  LiveblocksContextBundle,
  UnreadInboxNotificationsCountState,
  UnreadInboxNotificationsCountStateSuccess,
} from "./types";

export const ContextBundle =
  createContext<LiveblocksContextBundle<BaseUserMeta> | null>(null);

/**
 * @private
 *
 * This is an internal API, use "createLiveblocksContext" instead.
 */
export function useLiveblocksContextBundle() {
  const bundle = useContext(ContextBundle);
  if (bundle === null) {
    throw new Error("LiveblocksProvider is missing from the React tree.");
  }
  return bundle;
}

export const POLLING_INTERVAL = 60 * 1000; // 1 minute
export const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";

export function createLiveblocksContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TThreadMetadata extends BaseMetadata = never,
>(client: Client<TUserMeta>): LiveblocksContextBundle<TUserMeta> {
  const shared = createSharedContext<TUserMeta>(client);

  const store = client[kInternal]
    .cacheStore as unknown as CacheStore<TThreadMetadata>;

  const notifications = client[kInternal].notifications;

  function LiveblocksProvider(props: PropsWithChildren) {
    return (
      <ContextBundle.Provider
        value={bundle as unknown as LiveblocksContextBundle<BaseUserMeta>}
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
  let inboxNotificationsSubscribers = 0;
  let lastRequestedAt: Date | undefined;

  const poller = makePoller(refreshThreadsAndNotifications);

  function refreshThreadsAndNotifications() {
    console.log("Refreshing threads and notifications");
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

  function incrementInboxNotificationsSubscribers() {
    inboxNotificationsSubscribers++;

    poller.start(POLLING_INTERVAL);
  }

  function decrementInboxNotificationsSubscribers() {
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

  function useInboxNotificationsSelectorCallback(
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

  function useInboxNotifications(): InboxNotificationsState {
    useEffect(() => {
      void fetchInboxNotifications();
      incrementInboxNotificationsSubscribers();

      return () => decrementInboxNotificationsSubscribers();
    }, []);

    const result = useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      useInboxNotificationsSelectorCallback
    );

    return result;
  }

  function useInboxNotificationsSuspenseSelector(
    state: CacheState<BaseMetadata>
  ): InboxNotificationsStateSuccess {
    return {
      inboxNotifications: selectedInboxNotifications(state),
      isLoading: false,
    };
  }

  function useInboxNotificationsSuspense(): InboxNotificationsStateSuccess {
    const query = store.get().queries[INBOX_NOTIFICATIONS_QUERY];

    if (query === undefined || query.isLoading) {
      throw fetchInboxNotifications();
    }

    if (query.error !== undefined) {
      throw query.error;
    }

    React.useEffect(() => {
      incrementInboxNotificationsSubscribers();

      return () => {
        decrementInboxNotificationsSubscribers();
      };
    }, []);

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      useInboxNotificationsSuspenseSelector
    );
  }

  function selectUnreadInboxNotificationsCount(
    state: CacheState<BaseMetadata>
  ) {
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

  function useUnreadInboxNotificationsCountSelector(
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

  function useUnreadInboxNotificationsCount(): UnreadInboxNotificationsCountState {
    useEffect(() => {
      void fetchInboxNotifications();
      incrementInboxNotificationsSubscribers();

      return () => decrementInboxNotificationsSubscribers();
    }, []);

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      useUnreadInboxNotificationsCountSelector
    );
  }

  function useUnreadInboxNotificationsCountSuspenseSelector(
    state: CacheState<BaseMetadata>
  ): UnreadInboxNotificationsCountStateSuccess {
    return {
      isLoading: false,
      count: selectUnreadInboxNotificationsCount(state),
    };
  }

  function useUnreadInboxNotificationsCountSuspense(): UnreadInboxNotificationsCountStateSuccess {
    const query = store.get().queries[INBOX_NOTIFICATIONS_QUERY];

    if (query === undefined || query.isLoading) {
      throw fetchInboxNotifications();
    }

    React.useEffect(() => {
      incrementInboxNotificationsSubscribers();

      return () => {
        decrementInboxNotificationsSubscribers();
      };
    }, []);

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      useUnreadInboxNotificationsCountSuspenseSelector
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

  function useThreadFromCache(threadId: string): ThreadData<BaseMetadata> {
    const selector = useCallback(
      (state: CacheState<BaseMetadata>) => {
        const thread = state.threads[threadId];

        if (thread === undefined) {
          throw new Error(
            `Internal error: thread with id "${threadId}" not found in cache`
          );
        }

        return thread;
      },
      [threadId]
    );

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      selector
    );
  }

  const currentUserIdStore = client[kInternal]
    .currentUserIdStore as unknown as Store<string | null>;

  function useCurrentUserId() {
    return useSyncExternalStore(
      currentUserIdStore.subscribe,
      currentUserIdStore.get,
      currentUserIdStore.get
    );
  }

  const bundle: LiveblocksContextBundle<TUserMeta> = {
    LiveblocksProvider,

    useInboxNotifications,
    useUnreadInboxNotificationsCount,

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    ...shared,

    suspense: {
      LiveblocksProvider,

      useInboxNotifications: useInboxNotificationsSuspense,
      useUnreadInboxNotificationsCount:
        useUnreadInboxNotificationsCountSuspense,

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,

      ...shared.suspense,
    },

    [kInternal]: {
      useThreadFromCache,
      useCurrentUserId,
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}
