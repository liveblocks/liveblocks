import type { LiveList, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Realtime presence, shared with everyone in the room. Holds the id of
    // the feed the user is currently typing in, so "X is typing..."
    // shows up for everyone viewing that channel or thread.
    Presence: {
      typingIn: string | null;
    };

    // The channel list lives in the room's Storage: an ordered list that
    // supports realtime create, rename, delete, and drag-and-drop reordering.
    // Each channel's `id` doubles as the id of the feed holding its messages.
    Storage: {
      channels: LiveList<LiveObject<{ id: string; name: string }>>;
    };

    // Two kinds of feed message live in this app, distinguished by `kind`:
    //
    // - Chat messages (no `kind`), stored in channel, DM, and thread feeds.
    //   `content` is markdown, with mentions stored as `<@userId>` tokens.
    // - Activity items (`kind: "activity"`), stored in each user's personal
    //   `activity_<userId>` feed. They point at a chat message elsewhere and
    //   get a `readAt` timestamp once the user has seen it, so the feed is
    //   their activity history and the unread ones are their badges. See
    //   `lib/activity.ts`.
    FeedMessageData:
      | {
          kind?: undefined;
          userId: string;
          content: string;
          // True while an AI reply is still being streamed in via
          // `updateFeedMessage`. Cleared on the final update.
          streaming?: boolean;
          // Each entry records who reacted and when.
          reactions?: { emoji: string; userId: string; createdAt: number }[];
        }
      | {
          kind: "activity";
          type: "mention" | "thread_reply" | "dm";
          fromUserId: string;
          // The feed and message being pointed at
          feedId: string;
          messageId: string;
          // Set when `feedId` is a thread: the channel or DM feed it belongs
          // to, and the message the thread hangs off.
          parentFeedId?: string;
          parentMessageId?: string;
          // When the user saw it. Unset means unread.
          readAt?: number;
        };

    // Custom metadata attached to a feed. Channels and direct messages are
    // top-level feeds; threads are feeds attached to a message in one of
    // them, with `channelId` pointing at the parent feed. Activity feeds are
    // per-user unread lists.
    FeedMetadata: {
      name?: string;
      type?: "channel" | "dm" | "thread" | "activity";
      channelId?: string;
      parentMessageId?: string;
      replyCount?: string;
      participantIds?: string[];
    };
  }
}

export {};
