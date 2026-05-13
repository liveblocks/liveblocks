import "@/liveblocks.config";
import { nanoid } from "nanoid";
import { LiveList, LiveObject, toPlainLson } from "@liveblocks/client";
import { getRoomId, type Metadata } from "@/config";
import { clearAiPresenceInRoom } from "@/lib/ai-remote-presence";
import { applyIssueDescriptionMarkdown } from "@/lib/apply-issue-description-markdown";
import type {
  IssueLabelId,
  IssuePriorityId,
  IssueProgressId,
} from "@/lib/issue-storage-enums";
import { liveblocks } from "@/liveblocks.server.config";

export type CreateIssueRoomOptions = {
  /** Initial issue description as GitHub-flavored markdown (Lexical body). */
  descriptionMarkdown?: string;
  labels?: IssueLabelId[];
  /** External URLs for the issue’s Links section (plain strings, like the UI). */
  links?: string[];
  progress?: IssueProgressId;
  priority?: IssuePriorityId;
  assignedTo?: string | "none";
};

/**
 * Creates a new issue room (used by the AI tool and by the "New issue" action).
 */
export async function createIssueRoomForAi(
  title: string,
  options?: CreateIssueRoomOptions
): Promise<{
  issueId: string;
}> {
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
    properties: new LiveObject({
      progress,
      priority,
      assignedTo,
    }),
    labels: new LiveList(labelIds),
    links: new LiveList(linkStrs),
  });

  await liveblocks.initializeStorageDocument(
    roomId,
    // Same cast as createIssue in actions/liveblocks.ts — storage JSON shape
    toPlainLson(initialStorage) as any
  );

  const md = options?.descriptionMarkdown?.trim();
  if (md) {
    await applyIssueDescriptionMarkdown(roomId, md, "replace");
  }

  await clearAiPresenceInRoom(roomId);

  return { issueId };
}
