import "@/liveblocks.config";
import { nanoid } from "nanoid";
import { LiveList, LiveObject, toPlainLson } from "@liveblocks/client";
import { withLexicalDocument } from "@liveblocks/node-lexical";
import {
  getRoomId,
  type IssueLabelId,
  type IssuePriorityId,
  type IssueProgressId,
  type Metadata,
} from "@/config";
import { hideAiPresence } from "@/lib/ai-remote-presence";
import { applyIssueDescriptionMarkdown } from "@/lib/apply-issue-description-markdown";
import { ISSUE_LEXICAL_NODES } from "@/lib/issue-lexical-nodes";
import { liveblocks } from "@/liveblocks.server.config";

export type CreateIssueRoomOptions = {
  descriptionMarkdown?: string;
  labels?: IssueLabelId[];
  links?: string[];
  progress?: IssueProgressId;
  priority?: IssuePriorityId;
  assignedTo?: string | "none";
};

export async function createIssueRoomForAi(
  title: string,
  options?: CreateIssueRoomOptions
): Promise<{ issueId: string }> {
  const issueId = nanoid();
  const roomId = getRoomId(issueId);
  const trimmed = title.trim();
  const displayTitle = trimmed.length > 0 ? trimmed : "Untitled";

  const progress = options?.progress ?? "none";
  const priority = options?.priority ?? "none";
  const assignedTo = options?.assignedTo ?? "none";
  const labelIds = [...(options?.labels ?? [])];
  const linkStrs = (options?.links ?? [])
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const metadata: Metadata = {
    issueId,
    title: displayTitle,
    progress,
    priority,
    assignedTo,
    labels: [...labelIds],
  };

  await liveblocks.createRoom(roomId, {
    defaultAccesses: ["room:write"],
    metadata,
  });

  const initialStorage: LiveObject<Liveblocks["Storage"]> = new LiveObject({
    meta: new LiveObject({ title: displayTitle }),
    properties: new LiveObject({ progress, priority, assignedTo }),
    labels: new LiveList(labelIds),
    links: new LiveList(linkStrs),
  });

  await liveblocks.initializeStorageDocument(
    roomId,
    toPlainLson(initialStorage) as any
  );

  const md = options?.descriptionMarkdown?.trim();
  if (md) {
    await applyIssueDescriptionMarkdown(roomId, md, "replace");
  } else {
    // Initialize Lexical with empty document
    await withLexicalDocument(
      { roomId, client: liveblocks, nodes: [...ISSUE_LEXICAL_NODES] },
      async (doc) => {
        await doc.update(() => {});
      }
    );
  }

  await hideAiPresence(roomId);

  return { issueId };
}
