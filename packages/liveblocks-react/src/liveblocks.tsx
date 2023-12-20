import type { BaseMetadata, BaseUserMeta, Client } from "@liveblocks/client";
import type { InboxNotificationData } from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import React, { createContext, useCallback, useContext } from "react";

import type { LiveblocksContextBundle } from "./types";

const ContextBundle = createContext<LiveblocksContextBundle<
  BaseUserMeta,
  BaseMetadata
> | null>(null);

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

// [comments-unread] TODO: Add `resolveUsers` option (share cache/deduplication with the room-based `resolveUsers` option)
export function createLiveblocksContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TThreadMetadata extends BaseMetadata = never,
>(client: Client): LiveblocksContextBundle<TUserMeta, TThreadMetadata> {
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

  // [comments-unread] TODO: Share with room.ts' `useUser`
  function useUser() {
    return {
      user: {} as TUserMeta,
      isLoading: false,
    } as const;
  }

  // [comments-unread] TODO: Share with room.ts' `useUserSuspense`
  function useUserSuspense() {
    return {
      user: {} as TUserMeta,
      isLoading: false,
    } as const;
  }

  // [comments-unread] TODO: Implement using `client.getInboxNotifications`
  function useInboxNotifications() {
    return {
      inboxNotifications: [] as InboxNotificationData[],
      isLoading: false,
      loadMore: () => {},
    } as const;
  }

  // [comments-unread] TODO: Implement using `client.getInboxNotifications`
  function useInboxNotificationsSuspense() {
    return {
      inboxNotifications: [] as InboxNotificationData[],
      isLoading: false,
      loadMore: () => {},
    } as const;
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

  const bundle: LiveblocksContextBundle<TUserMeta, TThreadMetadata> = {
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
  };

  return bundle;
}
