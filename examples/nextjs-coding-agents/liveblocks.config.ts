import type { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveblocksProsemirrorNode } from "@liveblocks/prosemirror";
import type {
  AgentPart,
  DocumentChange,
  MessageRole,
  MessageStatus,
} from "@/lib/types";

declare global {
  interface Liveblocks {
    // Room Storage. Documents the agent writes for the team (plans, reports,
    // notes) are keyed by `${feedId}:${slug}`. `documents` holds each one's
    // metadata; the text itself lives in `_tiptap_docs` under the same key,
    // as the tree of LiveObjects and LiveTexts the Tiptap editor in the side
    // panel is bound to. The agent patches that tree between runs and people
    // edit it live; Storage merges both.
    Storage: {
      documents: LiveMap<
        string,
        LiveObject<{
          feedId: string;
          // File name the agent used, without ".md"
          slug: string;
          // First heading of the document, or the slug when there is none
          title: string;
          createdAt: string;
          updatedAt: string;
          // Timestamp of the Cursor artifact this was last synced from, so a
          // run that didn't touch the file isn't mistaken for an edit
          artifactUpdatedAt: string;
        }>
      >;
      // Managed by `@liveblocks/react-tiptap` in Storage mode
      _tiptap_docs?: LiveMap<string, LiveblocksProsemirrorNode>;
    };

    // Custom user info set when authenticating with a secret key. The id is
    // the person's GitHub login; name and avatar come from their profile.
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
      // Optional: a chat without a repository can still answer questions
      // and write documents, but can't open pull requests
      repoUrl?: string;
      repoRef?: string;
      // Cursor model id used for every run in this chat
      model: string;
      // "idle" or "running", written by the server-side workflow
      agentStatus: "idle" | "running";
      // When the current burst of runs started, used to recover from
      // workflows that died without cleaning up
      runningSince?: string;
      // The durable Cursor cloud agent backing this chat, set on first run
      cursorAgentId?: string;
      // The Cursor run in progress, so it can be cancelled from the UI
      cursorRunId?: string;
      // GitHub login of whoever pressed "Stop", read back by the workflow
      stopRequestedBy?: string;
      // Set once the agent has pushed a branch / opened a pull request
      branch?: string;
      prUrl?: string;
      // When the agent last saved a diff of its work as a Cursor artifact
      diffUpdatedAt?: string;
      // Everyone who has posted in this chat; they get notified on completion
      participantIds: string[];
      // Feed metadata is strings only, so pinned is "true" or "false"
      pinned?: "true" | "false";
    };

    // The shape of every message stored in a chat's feed. Human messages
    // hold markdown `content`; agent messages hold structured `parts`
    // that are streamed in via `updateFeedMessage`.
    FeedMessageData: {
      role: MessageRole;
      userId: string;
      // Markdown, with skills as `<skill:id>` and `@AI` as `<@ai-assistant>`
      content: string;
      // Human messages: set by the server once included in an agent run,
      // or once triage decided the agent wasn't needed
      handled?: boolean;
      // Human messages: set by the server once triage decided (true: for
      // the agent and queued; false: people talking to each other, never
      // sent to the agent). Unset while triage is still running.
      forAgent?: boolean;
      // Agent messages
      status?: MessageStatus;
      // "reply": a plain answer written by a language model, with no coding
      // session behind it (workflows/reply-in-chat.ts). Unset for runs.
      kind?: "reply";
      parts?: AgentPart[];
      // Ids of the human messages this agent reply addressed
      repliesTo?: string[];
      // When the burst of runs began. The reply is re-posted at the bottom
      // when people post mid-run, so `createdAt` can be later than this.
      startedAt?: number;
      // When the burst of runs ended; with `startedAt` gives "Worked for…"
      finishedAt?: number;
      branch?: string;
      prUrl?: string;
      // Documents in Storage this reply created or updated
      documents?: DocumentChange[];
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
