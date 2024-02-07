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
  Store,
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

export function createLiveblocksContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TThreadMetadata extends BaseMetadata = never,
>(client: Client<TUserMeta>): LiveblocksContextBundle<TUserMeta> {
  const shared = createSharedContext<TUserMeta>(client);

  const store = client[kInternal]
    .cacheStore as unknown as CacheStore<TThreadMetadata>;

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
    threads: ThreadData<never>[];
  }> | null = null;
  let inboxNotificationsSubscribers = 0;

  const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";

  const POLLING_INTERVAL = 60 * 1000;
  const poller = makePoller(refreshThreadsAndNotifications);

  function refreshThreadsAndNotifications() {
    return client.getInboxNotifications().then(
      ({ threads, inboxNotifications }) => {
        store.updateThreadsAndNotifications(
          threads,
          inboxNotifications,
          [],
          [],
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

  async function fetchInboxNotifications() {
    if (fetchInboxNotificationsRequest) {
      return fetchInboxNotificationsRequest;
    }

    store.setQueryState(INBOX_NOTIFICATIONS_QUERY, {
      isLoading: true,
    });

    try {
      fetchInboxNotificationsRequest = client.getInboxNotifications();

      const { inboxNotifications, threads } =
        await fetchInboxNotificationsRequest;

      store.updateThreadsAndNotifications(
        threads,
        inboxNotifications,
        [],
        [],
        INBOX_NOTIFICATIONS_QUERY
      );
    } catch (er) {
      store.setQueryState(INBOX_NOTIFICATIONS_QUERY, {
        isLoading: false,
        error: er as Error,
      });
    }
    return;
  }

  function useInboxNotifications(): InboxNotificationsState {
    useEffect(() => {
      void fetchInboxNotifications();
      incrementInboxNotificationsSubscribers();

      return () => decrementInboxNotificationsSubscribers();
    });

    const selector = useCallback(
      (state: CacheState<BaseMetadata>): InboxNotificationsState => {
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
      },
      []
    );

    const result = useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      selector
    );

    return result;
  }

  function useInboxNotificationsSuspense(): InboxNotificationsStateSuccess {
    if (
      store.get().queries[INBOX_NOTIFICATIONS_QUERY] === undefined ||
      store.get().queries[INBOX_NOTIFICATIONS_QUERY].isLoading
    ) {
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
      (state) => {
        return {
          inboxNotifications: selectedInboxNotifications(state),
          isLoading: false,
        };
      }
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

  function useUnreadInboxNotificationsCount(): UnreadInboxNotificationsCountState {
    useEffect(() => {
      void fetchInboxNotifications();
      incrementInboxNotificationsSubscribers();

      return () => decrementInboxNotificationsSubscribers();
    });

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        const query = store.get().queries[INBOX_NOTIFICATIONS_QUERY];

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
    );
  }

  function useUnreadInboxNotificationsCountSuspense(): UnreadInboxNotificationsCountStateSuccess {
    if (
      store.get().queries[INBOX_NOTIFICATIONS_QUERY] === undefined ||
      store.get().queries[INBOX_NOTIFICATIONS_QUERY].isLoading
    ) {
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
      (state) => {
        return {
          isLoading: false,
          count: selectUnreadInboxNotificationsCount(state),
        };
      }
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

      client.markInboxNotificationAsRead(inboxNotificationId).then(
        () => {
          store.set((state) => ({
            ...state,
            inboxNotifications: {
              ...state.inboxNotifications,
              [inboxNotificationId]: {
                // TODO: Handle potential deleted inbox notification
                ...state.inboxNotifications[inboxNotificationId],
                readAt,
              },
            },
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

  function useMarkAllInboxNotificationsAsRead() {
    return useCallback(() => {
      const optimisticUpdateId = nanoid();
      const readAt = new Date();
      store.pushOptimisticUpdate({
        type: "mark-inbox-notifications-as-read",
        id: optimisticUpdateId,
        readAt,
      });

      client.markAllInboxNotificationsAsRead().then(
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
    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        const thread = state.threads[threadId];

        if (thread === undefined) {
          throw new Error(
            `Internal error: thread with id "${threadId}" not found in cache`
          );
        }

        return thread;
      }
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
