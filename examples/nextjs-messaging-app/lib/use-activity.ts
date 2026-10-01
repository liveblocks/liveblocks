import {
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeedMessage,
  useFeedMessages,
  useRoom,
  useSelf,
  useUpdateFeedMessage,
} from "@liveblocks/react/suspense";
import { useCallback, useMemo } from "react";
import { AI_USER_ID } from "@/app/database";
import {
  getActivityFeedId,
  isActivityItem,
  isUnread,
  type ActivityItem,
  type ActivityItemData,
} from "@/lib/activity";

// The current user's activity, newest first, with pagination for the panel.
export function useActivity() {
  const selfId = useSelf((me) => me.id);
  const { messages, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(getActivityFeedId(selfId));

  const items = useMemo(
    () =>
      messages
        .filter(isActivityItem)
        .sort((a, b) => b.createdAt - a.createdAt),
    [messages]
  );
  const unreadItems = useMemo(() => items.filter(isUnread), [items]);

  return { items, unreadItems, hasFetchedAll, fetchMore, isFetchingMore };
}

// Just the unread items, for badges and clearing.
export function useUnreadActivity(): ActivityItem[] {
  return useActivity().unreadItems;
}

// Activity feeds this client already knows exist, as `roomId/feedId`
const ensuredActivityFeeds = new Set<string>();

// Writes an activity item into each recipient's feed. The AI teammate never
// reads its activity, and nobody needs to be told about their own message.
export function useNotifyActivity() {
  const room = useRoom();
  const selfId = useSelf((me) => me.id);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();

  return useCallback(
    async (
      recipientIds: Iterable<string>,
      item: Omit<ActivityItemData, "kind" | "fromUserId">
    ) => {
      const recipients = [...new Set(recipientIds)].filter(
        (userId) => userId !== selfId && userId !== AI_USER_ID
      );

      await Promise.all(
        recipients.map(async (userId) => {
          const feedId = getActivityFeedId(userId);
          const key = `${room.id}/${feedId}`;
          if (!ensuredActivityFeeds.has(key)) {
            try {
              await createFeed(feedId, { metadata: { type: "activity" } });
            } catch {
              // The recipient's activity feed already exists.
            }
            ensuredActivityFeeds.add(key);
          }
          await createFeedMessage(feedId, {
            kind: "activity",
            fromUserId: selfId,
            ...item,
          });
        })
      );
    },
    [createFeed, createFeedMessage, room.id, selfId]
  );
}

// Stamps activity items as read once they've been seen. They stay in the
// feed as history; only the badges drop.
export function useMarkActivityRead() {
  const selfId = useSelf((me) => me.id);
  const updateFeedMessage = useUpdateFeedMessage();

  return useCallback(
    async (items: ActivityItem[]) => {
      const feedId = getActivityFeedId(selfId);
      const readAt = Date.now();
      await Promise.all(
        items
          .filter(isUnread)
          .map(async (item) => {
            try {
              await updateFeedMessage(feedId, item.id, {
                ...item.data,
                readAt,
              });
            } catch {
              // Already gone, e.g. dismissed from another tab.
            }
          })
      );
    },
    [selfId, updateFeedMessage]
  );
}

// Removes an item whose message no longer exists.
export function useDismissActivity() {
  const selfId = useSelf((me) => me.id);
  const deleteFeedMessage = useDeleteFeedMessage();

  return useCallback(
    async (item: ActivityItem) => {
      try {
        await deleteFeedMessage(getActivityFeedId(selfId), item.id);
      } catch {
        // Already removed, e.g. from another tab.
      }
    },
    [deleteFeedMessage, selfId]
  );
}
