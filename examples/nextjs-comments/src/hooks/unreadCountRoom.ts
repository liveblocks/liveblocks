// useRoomUnreadInboxNotificationsCount.ts
import { useEffect, useState } from "react";
import { InboxNotificationData } from "@liveblocks/client";
import { useInboxNotifications } from "@liveblocks/react/suspense";

/**
 * Hook to get the count of unread inbox notifications in a room.
 *
 * @param roomId The room ID.
 * @returns The count of unread inbox notifications in the room.
 */
export function useRoomUnreadInboxNotificationsCount(roomId: string) {
  const { inboxNotifications, hasFetchedAll, fetchMore, isFetchingMore } =
    useInboxNotifications();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  // Until hasFetchedAll is true, fetch more notifications
  useEffect(() => {
    if (!hasFetchedAll && !isFetchingMore) {
      fetchMore();
    }
  }, [hasFetchedAll, isFetchingMore]);

  // Calculate unread count
  useEffect(() => {
    if (hasFetchedAll) {
      const roomInboxNotifications = inboxNotifications.filter(
        (notification) => notification.roomId === roomId
      );
      const unreadCount = roomInboxNotifications.filter(
        isInboxNotificationUnread
      ).length;

      setUnreadCount(unreadCount);
    }
  }, [inboxNotifications, roomId, hasFetchedAll]);

  return unreadCount;
}

function isInboxNotificationUnread(
  inboxNotification: InboxNotificationData
): boolean {
  return (
    !inboxNotification.readAt ||
    inboxNotification.notifiedAt > inboxNotification.readAt
  );
}
