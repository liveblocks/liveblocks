import { LiveList, LiveObject, ToJson } from "@liveblocks/client";
import { Metadata, PriorityState, ProgressState } from "@/config";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };

    CommentMetadata: {
      feedId?: string;
      /** Comma-separated issue ids (nanoids); includes issues from create_issue and link_issues_in_reply. */
      referencedIssueIds?: string;
    };

    FeedMetadata: {
      type: "ai-comment-reply";
      threadId: string;
      commentId: string;
    };

    FeedMessageData:
      | {
          stage: "thinking";
          response: string;
          responsePart: string;
        }
      | {
          stage: "writing";
          response: string;
          responsePart: string;
        }
      | {
          stage: "complete";
          response: string;
          reasoning: string;
          thinkingTime: number;
        };
    Storage: {
      meta: LiveObject<{
        title: string;
      }>;
      properties: LiveObject<{
        progress: ProgressState;
        priority: PriorityState;
        assignedTo: string | "none";
      }>;
      labels: LiveList<string>;
      links: LiveList<string>;
    };
    Presence: {
      editingTypes: string[];
    };
    RoomInfo: {
      id: string;
      metadata: Metadata;
    };
  }
}

export type ImmutableStorage = ToJson<Liveblocks["Storage"]>;
