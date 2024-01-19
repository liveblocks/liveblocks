import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  ThreadData,
} from "@liveblocks/client";
import type { CacheStore, InboxNotificationData } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import { createSharedContext } from "./shared";
import type {
  InboxNotificationsState,
  InboxNotificationsStateSuccess,
  LiveblocksContextBundle,
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
  const {
    useUser,
    suspense: { useUser: useUserSuspense },
  } = createSharedContext<TUserMeta>(client);

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

  const INBOX_NOTIFICATIONS_QUERY = "INBOX_NOTIFICATIONS";

  async function fetchInboxNotifications() {
    if (fetchInboxNotificationsRequest) {
      return fetchInboxNotificationsRequest;
    }

    store.setQueryState(INBOX_NOTIFICATIONS_QUERY, {
      isLoading: true,
    });

    fetchInboxNotificationsRequest = client.getInboxNotifications();

    try {
      const { inboxNotifications, threads } =
        await fetchInboxNotificationsRequest;

      store.updateThreadsAndNotifications(
        threads,
        inboxNotifications,
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
    });

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        if (
          state.queries[INBOX_NOTIFICATIONS_QUERY] === undefined ||
          state.queries[INBOX_NOTIFICATIONS_QUERY].isLoading
        ) {
          return {
            isLoading: true,
            loadMore: () => {}, // TODO
          };
        }

        return {
          inboxNotifications: Array.from(
            Object.values(state.inboxNotifications)
          ), // TODO: Optimistic update
          isLoading: false,
          loadMore: () => {}, // TODO
        };
      }
    );
  }

  function useInboxNotificationsSuspense(): InboxNotificationsStateSuccess {
    if (
      store.get().queries[INBOX_NOTIFICATIONS_QUERY] === undefined ||
      store.get().queries[INBOX_NOTIFICATIONS_QUERY].isLoading
    ) {
      throw fetchInboxNotifications();
    }

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        return {
          inboxNotifications: Array.from(
            Object.values(state.inboxNotifications)
          ), // TODO: Optimistic update
          isLoading: false,
          loadMore: () => {},
        };
      }
    );
  }

  // [comments-unread] TODO: Implement using `client.getUnreadInboxNotificationsCount`
  function useUnreadInboxNotificationsCount() {
    return 0;
  }

  // [comments-unread] TODO: Implement using `client.getUnreadInboxNotificationsCount`
  function useUnreadInboxNotificationsCountSuspense() {
    return 0;
  }

  function useMarkInboxNotificationAsRead() {
    // [comments-unread] TODO: Optimistically update the cached notification and the unread count
    const markInboxNotificationAsRead = useCallback(
      (inboxNotificationId: string) => {
        void client.markInboxNotificationAsRead(inboxNotificationId);
      },
      []
    );

    return markInboxNotificationAsRead;
  }

  function useMarkAllInboxNotificationsAsRead() {
    // [comments-unread] TODO: Optimistically update all cached notifications and the unread count
    const markAllInboxNotificationsAsRead = useCallback(() => {
      void client.markAllInboxNotificationsAsRead();
    }, []);

    return markAllInboxNotificationsAsRead;
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

  const bundle: LiveblocksContextBundle<TUserMeta> = {
    LiveblocksProvider,

    useUser,

    useInboxNotifications,
    useUnreadInboxNotificationsCount,

    useMarkInboxNotificationAsRead,
    useMarkAllInboxNotificationsAsRead,

    suspense: {
      LiveblocksProvider,

      useUser: useUserSuspense,

      useInboxNotifications: useInboxNotificationsSuspense,
      useUnreadInboxNotificationsCount:
        useUnreadInboxNotificationsCountSuspense,

      useMarkInboxNotificationAsRead,
      useMarkAllInboxNotificationsAsRead,
    },

    [kInternal]: {
      useThreadFromCache,
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}
