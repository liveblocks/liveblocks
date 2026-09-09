import type { Feed } from "@liveblocks/client";

export const THREAD_FEED_PREFIX = "thread_";

export type ThreadFeed = Feed<Liveblocks["FeedMetadata"]>;

export function getThreadFeedId(messageId: string): string {
  return `${THREAD_FEED_PREFIX}${messageId}`;
}
