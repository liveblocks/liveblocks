declare global {
  interface Liveblocks {
    // Feed metadata (used for Feed.metadata from useFeeds)
    FeedMetadata: {
      agentName?: string;
      model?: string;
      temperature?: number;
      created?: string;
      updated?: string;
      name?: string;
      channel?: boolean;
    };

    // Feed message data (used for FeedMessage.data from useFeedMessages)
    FeedMessageData: {
      role: "user" | "assistant" | "system";
      content: string;
      tokens?: number;
      feedThreadId?: string;
    };
  }
}

export {};
