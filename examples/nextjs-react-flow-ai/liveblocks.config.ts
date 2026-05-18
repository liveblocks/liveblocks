declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };

    Presence: {
      thinking?: boolean;
    };

    ThreadMetadata: {
      attachedToNodeId?: string;
      x: number;
      y: number;
    };

    CommentMetadata: {
      feedId?: string;
      feedComplete?: boolean;
    };

    FeedMetadata: {
      type: "ai-comment-reply";
      threadId: string;
      commentId: string;
    };

    FeedMessageData:
      | {
          stage: "thinking";
          response: string;
          responsePart: string;
        }
      | {
          stage: "writing";
          response: string;
          responsePart: string;
        }
      | {
          stage: "complete";
          response: string;
          reasoning: string;
          thinkingTime: number;
        };
  }
}

export {};
