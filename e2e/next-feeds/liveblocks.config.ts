declare global {
  interface Liveblocks {
    // Feed metadata (used for Feed.metadata from useFeeds)
    FeedMetadata: {
      agentName?: string;
      model?: string;
      temperature?: string;
      created?: string;
      updated?: string;
      name?: string;
      /** Channel feeds use `"true"`; thread feeds use `"false"`. */
      channel?: string;
      /** Kitchen-sink demo: random tag for metadata filter examples. */
      sinkTag?: string;
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
