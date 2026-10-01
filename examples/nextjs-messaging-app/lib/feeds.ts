import type { Feed } from "@liveblocks/client";

export const DM_FEED_PREFIX = "dm_";
export const THREAD_FEED_PREFIX = "thread_";
export const ACTIVITY_FEED_PREFIX = "activity_";

type FeedMessageData = Liveblocks["FeedMessageData"];

export type FeedMessage<D = FeedMessageData> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: D;
};

export type ChatMessageData = Extract<FeedMessageData, { kind?: undefined }>;
export type ActivityItemData = Extract<FeedMessageData, { kind: "activity" }>;
export type ActivityType = ActivityItemData["type"];

export type ChatMessage = FeedMessage<ChatMessageData>;
export type ActivityItem = FeedMessage<ActivityItemData>;

export type ThreadFeed = Feed<Liveblocks["FeedMetadata"]>;

export function isChatMessage(
  message: FeedMessage<FeedMessageData>
): message is ChatMessage {
  return message.data.kind === undefined;
}

export function isActivityItem(
  message: FeedMessage<FeedMessageData>
): message is ActivityItem {
  return message.data.kind === "activity";
}

function toFeedIdSegment(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function getDmFeedId(userIdA: string, userIdB: string): string {
  const [first, second] = [userIdA, userIdB].sort();
  return `${DM_FEED_PREFIX}${toFeedIdSegment(first)}__${toFeedIdSegment(second)}`;
}

export function isDmFeedId(feedId: string): boolean {
  return feedId.startsWith(DM_FEED_PREFIX);
}

export function getThreadFeedId(messageId: string): string {
  return `${THREAD_FEED_PREFIX}${messageId}`;
}

export function isThreadFeedId(feedId: string): boolean {
  return feedId.startsWith(THREAD_FEED_PREFIX);
}

export function getActivityFeedId(userId: string): string {
  return `${ACTIVITY_FEED_PREFIX}${toFeedIdSegment(userId)}`;
}
