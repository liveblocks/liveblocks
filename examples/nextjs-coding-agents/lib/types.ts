/**
 * "member": can start chats and talk to the agent (every run is billed to
 *           the server's Cursor key, so this is the gate that matters).
 * "viewer": signed in but not on the team; can read chats in realtime but
 *           not post.
 */
export type AccessRole = "member" | "viewer";

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

/** What `/api/repos` returns: repositories the agent can work on. */
export type ReposResponse = {
  repos: string[];
  error?: string;
};

/** What `/api/diff` returns: the agent's changes so far in a chat. */
export type ChangesInfo = {
  /** Unified diff against the chat's base branch */
  diff: string;
  /** ISO timestamp of the run that produced it */
  updatedAt: string;
  branch?: string;
  prUrl?: string;
};
