import type { Channel } from "@/lib/workspaces";

export const DM_FEED_PREFIX = "dm_";

// What the user has selected in the sidebar
export type Selection =
  | { type: "channel"; channelId: string }
  | { type: "dm"; userId: string };

// A resolved selection, ready to render. `feedId` is the id of the feed
// holding the conversation's messages.
export type Conversation =
  | { type: "channel"; feedId: string; channel: Channel }
  | { type: "dm"; feedId: string; user: Liveblocks["UserMeta"] };

// Feed ids end up in URLs, so keep them to a safe character set.
function toFeedIdSegment(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

// Both participants derive the same feed id regardless of who opens the DM
// first, so there's no lookup step: the id *is* the conversation.
export function getDmFeedId(userIdA: string, userIdB: string): string {
  const [first, second] = [userIdA, userIdB].sort();
  return `${DM_FEED_PREFIX}${toFeedIdSegment(first)}__${toFeedIdSegment(second)}`;
}

export function isDmFeedId(feedId: string): boolean {
  return feedId.startsWith(DM_FEED_PREFIX);
}
