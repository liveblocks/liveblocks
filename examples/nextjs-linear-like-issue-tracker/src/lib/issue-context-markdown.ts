import { LABELS } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { ISSUE_LEXICAL_NODES } from "@/lib/issue-lexical-nodes";
import {
  storageDocumentToMarkdown,
  type StorageJsonNode,
} from "@/lib/lexical-live-storage";

const LABEL_DISPLAY: Record<string, string> = Object.fromEntries(
  LABELS.map((l) => [l.id, l.text])
);

type RoomMetadataFields = {
  issueId?: string;
  title?: string;
  progress?: string;
  priority?: string;
  assignedTo?: string;
  labels?: string[];
};

type StorageJson = {
  meta: { title: string };
  properties: {
    progress: string;
    priority: string;
    assignedTo: string;
  };
  labels: string[];
  links: string[];
  document?: StorageJsonNode;
};

function formatLabelIds(ids: string[]): string {
  if (!ids.length) {
    return "_None_";
  }
  return ids
    .map((id) => {
      const text = LABEL_DISPLAY[id];
      return text ? `- **${id}**: ${text}` : `- \`${id}\``;
    })
    .join("\n");
}

// Markdown snapshot of the issue: room metadata, storage fields, labels,
export async function buildIssueContextMarkdown(roomId: string): Promise<string> {
  let storage: StorageJson;
  try {
    storage = (await liveblocks.getStorageDocument(
      roomId,
      "json"
    )) as StorageJson;
  } catch {
    return "## Current issue\n\n_Unable to load storage._\n";
  }

  let roomMetadata: RoomMetadataFields = {};
  try {
    const room = await liveblocks.getRoom(roomId);
    roomMetadata = (room.metadata ?? {}) as RoomMetadataFields;
  } catch {
    // continue without room metadata
  }

  let descriptionMd = "_No description could be loaded._";
  try {
    const md = storageDocumentToMarkdown(
      storage.document,
      ISSUE_LEXICAL_NODES
    ).trim();
    descriptionMd = md.length > 0 ? md : "_Empty._";
  } catch {
    // Storage document unavailable for this room
  }

  const labels = Array.isArray(storage.labels) ? storage.labels : [];
  const links = Array.isArray(storage.links) ? storage.links : [];
  const linksBlock =
    links.length === 0 ? "_None_" : links.map((l) => `- ${l}`).join("\n");

  return [
    "### Storage title",
    storage.meta?.title ?? "_Untitled_",
    "",
    "### Room metadata",
    `- **issueId**: ${roomMetadata.issueId ?? "—"}`,
    `- **title**: ${roomMetadata.title ?? "—"}`,
    `- **progress**: ${roomMetadata.progress ?? "—"}`,
    `- **priority**: ${roomMetadata.priority ?? "—"}`,
    `- **assignedTo**: ${String(roomMetadata.assignedTo ?? "—")}`,
    `- **labels**: ${(roomMetadata.labels ?? []).join(", ") || "—"}`,
    "",
    "### Live properties (storage)",
    `- **progress**: ${storage.properties?.progress ?? "—"}`,
    `- **priority**: ${storage.properties?.priority ?? "—"}`,
    `- **assignedTo**: ${String(storage.properties?.assignedTo ?? "—")}`,
    "",
    "### Labels",
    formatLabelIds(labels),
    "",
    "### Links",
    linksBlock,
    "",
    "### Description (Lexical → markdown)",
    "",
    descriptionMd,
  ].join("\n");
}
