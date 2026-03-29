declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    CommentMetadata: {
      feedId?: string;
    };

    FeedMetadata: {
      type: "ai-comment-reply";
      threadId: string;
      commentId: string;
    };

    FeedMessageData: {
      stage: "thinking" | "writing" | "complete";
      response?: string;
    };
  }
}

export {};
