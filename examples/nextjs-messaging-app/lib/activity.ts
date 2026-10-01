// Each user has a personal `activity_<userId>` feed holding one item per
// notification: DMs sent to them, messages they were tagged in, and replies
// in threads they take part in. Items point at the real message rather than
// copying it, and are stamped with `readAt` once seen, so the same feed is
// both the activity history and the unread list. Hooks live in
// `lib/use-activity.ts`.

export const ACTIVITY_FEED_PREFIX = "activity_";

type FeedMessageData = Liveblocks["FeedMessageData"];

// The shape `useFeedMessages` returns, narrowed to one kind of data
type FeedMessage<D> = {
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

// Feed ids end up in URLs, so keep them to a safe character set.
export function getActivityFeedId(userId: string): string {
  return `${ACTIVITY_FEED_PREFIX}${userId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

const MENTION_PATTERN = /<@([^>]+)>/g;

export function getMentionedUserIds(content: string): string[] {
  return [...new Set([...content.matchAll(MENTION_PATTERN)].map((m) => m[1]))];
}

// The conversation (channel or DM feed) an activity item ultimately lives in.
export function getActivityRootFeedId(item: ActivityItem): string {
  return item.data.parentFeedId ?? item.data.feedId;
}

export function isUnread(item: ActivityItem): boolean {
  return item.data.readAt === undefined;
}

// Everyone involved in a thread: whoever posted in it, plus whoever was
// tagged in it. These are the people notified about new replies.
export function getThreadParticipantIds(
  messages: { userId: string; content: string }[]
): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    ids.add(message.userId);
    for (const userId of getMentionedUserIds(message.content)) {
      ids.add(userId);
    }
  }
  return [...ids];
}
