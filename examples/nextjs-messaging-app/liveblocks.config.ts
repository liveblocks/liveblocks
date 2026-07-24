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
    // the channel the user is currently typing in, so "X is typing..."
    // shows up for everyone viewing that channel.
    Presence: {
      typingIn: string | null;
    };

    // The channel list lives in the room's Storage: an ordered list that
    // supports realtime create, rename, delete, and drag-and-drop reordering.
    // Each channel's `id` doubles as the id of the feed holding its messages.
    Storage: {
      channels: LiveList<LiveObject<{ id: string; name: string }>>;
    };

    // The shape of every message stored in a channel's feed. `content` is
    // markdown, with mentions stored as `<@userId>` tokens.
    FeedMessageData: {
      userId: string;
      content: string;
      // True while an AI reply is still being streamed in via
      // `updateFeedMessage`. Cleared on the final update.
      streaming?: boolean;
    };

    // Custom metadata attached to a feed
    FeedMetadata: {
      name?: string;
    };
  }
}

export {};
