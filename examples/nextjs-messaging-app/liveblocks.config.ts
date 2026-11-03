import type { LiveList, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    Presence: {
      typingIn: string | null;
      status?: {
        emoji: string | null;
        text: string;
        away: boolean;
      };
    };

    Storage: {
      channels: LiveList<LiveObject<{ id: string; name: string }>>;
    };

    FeedMessageData:
      | {
          kind?: undefined;
          userId: string;
          content: string;
          streaming?: boolean;
          reactions?: { emoji: string; userId: string; createdAt: number }[];
        }
      | {
          kind: "activity";
          type: "mention" | "thread_reply" | "dm";
          fromUserId: string;
          feedId: string;
          messageId: string;
          parentFeedId?: string;
          parentMessageId?: string;
          readAt?: number;
        };

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
