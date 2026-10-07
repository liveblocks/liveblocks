import type { JsonObject } from "@liveblocks/client";
import type {
  ProseMirrorJsonMark,
  ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import { flattenExtensions, type JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { DOCUMENT_EXTENSIONS } from "@/lib/document-schema";

/**
 * Converts between the agent's Markdown files and the ProseMirror JSON the
 * side panel's Tiptap editor uses, with the editor's own schema. Runs
 * headless, without a DOM.
 */
let manager: MarkdownManager | undefined;

function getManager() {
  manager ??= new MarkdownManager({
    extensions: flattenExtensions(DOCUMENT_EXTENSIONS),
  });
  return manager;
}

export function markdownToDocument(markdown: string): ProseMirrorJsonNode {
  return toProseMirrorJson(getManager().parse(markdown), "doc");
}

export function documentToMarkdown(document: ProseMirrorJsonNode): string {
  return getManager().serialize(document);
}

/**
 * Tiptap's looser `JSONContent` as the stricter shape `@liveblocks/prosemirror`
 * works with: every node has a type, and empty `content`/`marks` are dropped.
 */
function toProseMirrorJson(
  node: JSONContent,
  fallbackType: string
): ProseMirrorJsonNode {
  const result: ProseMirrorJsonNode = { type: node.type ?? fallbackType };
  if (node.attrs !== undefined) {
    result.attrs = toJsonObject(node.attrs);
  }
  if (node.text !== undefined) {
    result.text = node.text;
  }
  const marks = node.marks?.map(
    (mark): ProseMirrorJsonMark => ({
      type: mark.type,
      ...(mark.attrs !== undefined ? { attrs: toJsonObject(mark.attrs) } : {}),
    })
  );
  if (marks !== undefined && marks.length > 0) {
    result.marks = marks;
  }
  const content = node.content?.map((child) =>
    toProseMirrorJson(child, "paragraph")
  );
  if (content !== undefined && content.length > 0) {
    result.content = content;
  }
  return result;
}

/** Node attributes are plain JSON already; this only narrows the type. */
function toJsonObject(attrs: Record<string, unknown>): JsonObject {
  return JSON.parse(JSON.stringify(attrs)) as JsonObject;
}
