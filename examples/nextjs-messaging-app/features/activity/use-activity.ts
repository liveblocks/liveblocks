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
import { AI_USER_ID } from "@/lib/database";
import {
  getActivityFeedId,
  isActivityItem,
  type ActivityItem,
  type ActivityItemData,
} from "@/lib/feeds";
import { isUnread } from "./activity";

export function useActivity() {
  const selfId = useSelf((me) => me.id);
  const { messages, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(getActivityFeedId(selfId));

  const items = useMemo(
    () =>
      messages.filter(isActivityItem).sort((a, b) => b.createdAt - a.createdAt),
    [messages]
  );
  const unreadItems = useMemo(() => items.filter(isUnread), [items]);

  return { items, unreadItems, hasFetchedAll, fetchMore, isFetchingMore };
}

export function useUnreadActivity(): ActivityItem[] {
  return useActivity().unreadItems;
}

const ensuredActivityFeeds = new Set<string>();

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
            } catch {}
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

export function useMarkActivityRead() {
  const selfId = useSelf((me) => me.id);
  const updateFeedMessage = useUpdateFeedMessage();

  return useCallback(
    async (items: ActivityItem[]) => {
      const feedId = getActivityFeedId(selfId);
      const readAt = Date.now();
      await Promise.all(
        items.filter(isUnread).map(async (item) => {
          try {
            await updateFeedMessage(feedId, item.id, {
              ...item.data,
              readAt,
            });
          } catch {}
        })
      );
    },
    [selfId, updateFeedMessage]
  );
}

export function useDismissActivity() {
  const selfId = useSelf((me) => me.id);
  const deleteFeedMessage = useDeleteFeedMessage();

  return useCallback(
    async (item: ActivityItem) => {
      try {
        await deleteFeedMessage(getActivityFeedId(selfId), item.id);
      } catch {}
    },
    [deleteFeedMessage, selfId]
  );
}
