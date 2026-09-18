import type {
  RunStatus,
  RunTrigger,
  NodeResultData,
} from "./app/workflow/runs";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };

    // Realtime presence. Live cursors are handled by `@liveblocks/react-flow`.
    Presence: {
      // Id of the run currently selected in this user's side panel, so others
      // can see what their collaborators are looking at.
      selectedRunId: string | null;
    };

    // Every workflow run is a feed. The feed id is the run id. Feed metadata
    // values must be strings, so timestamps are stored as ms strings.
    FeedMetadata: {
      status: RunStatus;
      trigger: RunTrigger;
      // The text the run started with, truncated for display in the run list.
      input: string;
      startedAt: string;
      completedAt?: string;
      error?: string;
    };

    // One message per executed node, written server-side and streamed via
    // `updateFeedMessage` while LLM output arrives.
    FeedMessageData: NodeResultData;
  }
}

export {};
