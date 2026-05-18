import { LiveList, LiveObject, ToJson } from "@liveblocks/client";
import { Metadata, IssuePriorityId, IssueProgressId } from "@/config";

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
      // Feed ID attached to Ai comments
      feedId?: string;
      feedComplete?: boolean;

      // Comma-separated issue IDs that we display as links below comments
      referencedIssueIds?: string;
    };

    FeedMetadata:
      | {
          type: "ai-comment-reply";
          threadId: string;
          commentId: string;
        }
      | {
          type: "ai-issue-button";
          kind: "links" | "properties" | "labels";
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
          stage: "status";
          label: string;
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
        progress: IssueProgressId;
        priority: IssuePriorityId;
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
