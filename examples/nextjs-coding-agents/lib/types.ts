export type MessageRole = "user" | "agent";

export type MessageStatus = "running" | "done" | "error";

// One agent message per burst of runs. Its `parts` are appended to while the
// Cursor agent works and streamed to every client via `updateFeedMessage`.
export type AgentPart =
  | { type: "text"; text: string }
  | {
      type: "tool";
      callId: string;
      name: string;
      status: "running" | "completed" | "error";
      // One-line human-readable summary, e.g. a file path or a command
      summary: string;
    }
  | { type: "status"; text: string }
  // Separates runs inside one burst, e.g. "Also handling Tatum's request"
  | { type: "divider"; text: string }
  | { type: "error"; text: string };

export type ChatFeedMetadata = Liveblocks["FeedMetadata"];

export type ChatMessageData = Liveblocks["FeedMessageData"];

export type ChatMessage = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: ChatMessageData;
};

export type ChatFeed = {
  feedId: string;
  createdAt: number;
  updatedAt: number;
  metadata: ChatFeedMetadata;
};

/** What `/api/pr` returns for the pull request opened by the agent. */
export type PullRequestInfo = {
  url: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  branch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** Unified diff of the whole pull request */
  diff: string;
};
