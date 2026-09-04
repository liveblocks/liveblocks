import type { AgentPart, MessageRole, MessageStatus } from "@/lib/types";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Realtime presence, shared with everyone in the room. Holds the id of
    // the chat the user is currently typing in, so "X is typing..." shows
    // up for everyone viewing that chat.
    Presence: {
      typingIn: string | null;
    };

    // Each chat is a feed. Feed metadata only supports strings and string
    // arrays, so timestamps are stored as ISO strings.
    FeedMetadata: {
      type: "chat";
      title: string;
      createdBy: string;
      repoUrl: string;
      repoRef: string;
      // Cursor model id used for every run in this chat
      model: string;
      // "idle" or "running", written by the server-side workflow
      agentStatus: "idle" | "running";
      // When the current burst of runs started, used to recover from
      // workflows that died without cleaning up
      runningSince?: string;
      // The durable Cursor cloud agent backing this chat, set on first run
      cursorAgentId?: string;
      // Set once the agent has pushed a branch / opened a pull request
      branch?: string;
      prUrl?: string;
      // Everyone who has posted in this chat; they get notified on completion
      participantIds: string[];
    };

    // The shape of every message stored in a chat's feed. Human messages
    // hold markdown `content`; agent messages hold structured `parts`
    // that are streamed in via `updateFeedMessage`.
    FeedMessageData: {
      role: MessageRole;
      userId: string;
      // Markdown, with mentions as `<@userId>` and skills as `<skill:id>`
      content: string;
      // Human messages: set by the server once included in an agent run
      handled?: boolean;
      // Agent messages
      status?: MessageStatus;
      parts?: AgentPart[];
      // Ids of the human messages this agent reply addressed
      repliesTo?: string[];
      branch?: string;
      prUrl?: string;
    };

    // Custom notification kinds, triggered from the server with
    // `liveblocks.triggerInboxNotification`
    ActivitiesData: {
      $agentRunCompleted: {
        feedId: string;
        chatTitle: string;
        summary: string;
        prUrl: string;
        failed: boolean;
      };
    };
  }
}

export {};
