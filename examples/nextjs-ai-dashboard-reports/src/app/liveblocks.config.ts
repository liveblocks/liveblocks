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

    CommentMetadata: {
      feedId?: string;
      feedComplete?: boolean;
      pathname?: string;
    };

    ThreadMetadata: {
      pathname?: string;
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
