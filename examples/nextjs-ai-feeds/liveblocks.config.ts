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

    // The shape of every message stored in a feed. Because feeds hold
    // arbitrary JSON, we enrich assistant replies with reasoning, sources,
    // and follow-up suggestions to showcase more AI Elements components.
    FeedMessageData: {
      role: "user" | "assistant";
      content: string;
      model?: string;
      reasoning?: string;
      sources?: { title: string; url: string }[];
      suggestions?: string[];
    };

    // Custom metadata attached to a feed
    FeedMetadata: {
      title?: string;
    };
  }
}

export {};
