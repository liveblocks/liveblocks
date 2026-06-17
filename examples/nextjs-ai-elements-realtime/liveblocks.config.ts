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

    // Realtime presence, shared with everyone in the room. Holds the id of the
    // feed (chat) the user is currently prompting the AI in, so the live
    // "AI is thinking…" status shows in the right chat for everyone.
    Presence: {
      promptingFeedId: string | null;
    };

    // The shape of every message stored in a feed. Because feeds hold
    // arbitrary JSON, we store the author (so everyone sees who sent what) and
    // enrich assistant replies with reasoning, sources, and follow-up
    // suggestions to showcase more AI Elements components.
    FeedMessageData: {
      role: "user" | "assistant";
      content: string;
      userId?: string;
      name?: string;
      avatar?: string;
      model?: string;
      reasoning?: string;
      sources?: { title: string; url: string }[];
      suggestions?: string[];
      // Step-by-step plan, rendered with the AI Elements `ChainOfThought`.
      chainOfThought?: {
        label: string;
        description?: string;
        status?: "complete" | "active" | "pending";
        search?: string[];
      }[];
      // A tool the assistant "called", rendered with `Tool` (+ `CodeBlock`).
      tool?: {
        name: string;
        input: Record<string, string | number>;
        output?: string;
      };
      // Token usage, rendered with the `Context` component.
      usedTokens?: number;
      maxTokens?: number;
      // True while the assistant message is still being streamed in via
      // `updateFeedMessage`. Cleared on the final update.
      streaming?: boolean;
    };

    // Custom metadata attached to a feed
    FeedMetadata: {
      title?: string;
    };
  }
}

export {};
