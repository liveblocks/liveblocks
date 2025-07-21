import { useEffect, useState } from "react";
import { InboxNotificationData } from "@liveblocks/client";
import { useInboxNotifications } from "@liveblocks/react/suspense";

type NotificationKind = InboxNotificationData["kind"];

interface UseRoomInboxNotificationsOptions {
  kind?: NotificationKind;
  // Add more options to your liking here
}

interface UseRoomInboxNotificationsResult {
  notifications: InboxNotificationData[];
  unreadCount: number;
  isLoading: boolean;
}

/**
 * Hook to get inbox notifications for a specific room with optional filtering by kind.
 *
 * @param roomId The room ID to filter notifications for
 * @param options.kind Optional notification kind to filter by
 * @returns Object containing filtered notifications, unread count, and loading state
 */
export function useRoomInboxNotifications(
  roomId: string,
  { kind }: UseRoomInboxNotificationsOptions
): UseRoomInboxNotificationsResult {
  const { inboxNotifications, hasFetchedAll, fetchMore, isFetchingMore } =
    useInboxNotifications();
  const [notifications, setNotifications] = useState<InboxNotificationData[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch more notifications until we have all of them
  useEffect(() => {
    if (!hasFetchedAll && !isFetchingMore) {
      fetchMore();
    }
  }, [hasFetchedAll, isFetchingMore, fetchMore]);

  // Filter notifications and calculate unread count
  useEffect(() => {
    if (hasFetchedAll) {
      let filteredNotifications = inboxNotifications.filter(
        (notification) => notification.roomId === roomId
      );

      if (kind) {
        filteredNotifications = filteredNotifications.filter(
          (notification) => notification.kind === kind
        );
      }

      const unreadNotifications = filteredNotifications.filter(
        isInboxNotificationUnread
      );

      setNotifications(filteredNotifications);
      setUnreadCount(unreadNotifications.length);
    }
  }, [inboxNotifications, roomId, kind, hasFetchedAll]);

  return {
    notifications,
    unreadCount,
    isLoading: !hasFetchedAll || isFetchingMore,
  };
}

function isInboxNotificationUnread(
  inboxNotification: InboxNotificationData
): boolean {
  return (
    !inboxNotification.readAt ||
    inboxNotification.notifiedAt > inboxNotification.readAt
  );
}
