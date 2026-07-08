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
    // "AI is thinking..." status shows in the right chat for everyone.
    Presence: {
      promptingFeedId: string | null;
      cursor: { x: number; y: number } | null;
      cursorSlideId: string | null;
      selection: { slideId: string; path: number[] } | null;
    };

    // Comment pins are positioned as percentages of the 16:9 slide surface so
    // they stay attached to the same point as the preview resizes.
    ThreadMetadata: {
      x: number;
      y: number;
      zIndex: number;
      slideId: string;
    };

    // The shape of every message stored in a feed. Assistant replies can include
    // complete slide HTML proposals that anyone in the room can apply or reject.
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
      // Slide edits proposed by the assistant. `slideId` is an existing slide's id,
      // or "new" to append a new slide to the deck.
      proposals?: { slideId: string; html: string }[];
      proposalStatus?: "pending" | "applied" | "rejected";
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
