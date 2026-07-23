import { LiveMap, LiveObject, LiveText } from "@liveblocks/client";
import type { LsonObject } from "@liveblocks/client";
import type { Liveblocks } from "@liveblocks/node";
import {
  createLiveblocksProsemirrorNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeText,
  liveblocksProsemirrorNodeToJson,
  type LiveblocksProsemirrorNode,
  type ProseMirrorJsonMark,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import fastDiff from "fast-diff";
import { marked } from "marked";
import { DOCUMENT_FIELD, INITIAL_DOCUMENT } from "@/app/initial-document";

/**
 * Server-side helpers to read and edit the Tiptap document stored in
 * Liveblocks Storage (`collaborationMode: "liveblocks"`). All writes go
 * through `liveblocks.mutateStorage`, so they merge with edits users are
 * making at the same time instead of overwriting them.
 */

// Storage-mode Tiptap documents live under `root._tiptap_docs`, keyed by the
// editor's `field` option.
const TIPTAP_DOCUMENTS_KEY = "_tiptap_docs";

// Marks (bold, italic, …) are stored as this attribute on `LiveText` segments.
const TEXT_MARKS_ATTRIBUTE = "__liveblocks_tiptap_marks";

// The schema used to convert the AI's Markdown into ProseMirror JSON. Must
// accept the same nodes as the client editor.
const SCHEMA_EXTENSIONS = [StarterKit];

export type DocumentOperation =
  | { type: "insert"; index: number; markdown: string }
  | { type: "replace"; fromIndex: number; toIndex: number; markdown: string }
  | { type: "delete"; fromIndex: number; toIndex: number };

function getDocumentNode(
  root: LiveObject<LsonObject>
): LiveblocksProsemirrorNode | undefined {
  const documents = root.get(TIPTAP_DOCUMENTS_KEY);
  if (!(documents instanceof LiveMap)) {
    return undefined;
  }

  const document = documents.get(DOCUMENT_FIELD);
  if (!(document instanceof LiveObject)) {
    return undefined;
  }

  // The nodes under `_tiptap_docs` are always LiveblocksProsemirrorNode
  // trees; there is no runtime check beyond `instanceof LiveObject`.
  return document as LiveblocksProsemirrorNode;
}

function getOrCreateDocumentNode(
  root: LiveObject<LsonObject>
): LiveblocksProsemirrorNode {
  const existing = getDocumentNode(root);
  if (existing) {
    return existing;
  }

  // No one has opened the editor yet: create the document the same way the
  // editor would on first connect.
  let documents = root.get(TIPTAP_DOCUMENTS_KEY);
  if (!(documents instanceof LiveMap)) {
    documents = new LiveMap();
    root.set(TIPTAP_DOCUMENTS_KEY, documents);
  }

  const document = createLiveblocksProsemirrorNode(INITIAL_DOCUMENT);
  (documents as LiveMap<string, LiveblocksProsemirrorNode>).set(
    DOCUMENT_FIELD,
    document
  );
  return document;
}

/* -------------------------------------------------------------------------
 * Markdown conversion
 * ---------------------------------------------------------------------- */

/** Converts the AI's Markdown into top-level ProseMirror blocks. */
export function markdownToBlocks(markdown: string): ProseMirrorJsonNode[] {
  const html = marked.parse(markdown, { async: false });
  const json = generateJSON(html, SCHEMA_EXTENSIONS) as ProseMirrorJsonNode;
  return json.content ?? [];
}

function textToMarkdown(node: ProseMirrorJsonNode): string {
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        text = `**${text}**`;
        break;
      case "italic":
        text = `*${text}*`;
        break;
      case "strike":
        text = `~~${text}~~`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "link":
        text = `[${text}](${String(mark.attrs?.href ?? "")})`;
        break;
      default:
        break;
    }
  }
  return text;
}

function inlineToMarkdown(nodes: ProseMirrorJsonNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) =>
      node.type === "text"
        ? textToMarkdown(node)
        : node.type === "hardBreak"
          ? "\n"
          : ""
    )
    .join("");
}

/** Converts one top-level block to Markdown, for the model's context. */
export function blockToMarkdown(node: ProseMirrorJsonNode): string {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${inlineToMarkdown(node.content)}`;
    }
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${blockToMarkdown(child)}`)
        .join("\n");
    case "codeBlock": {
      const language = String(node.attrs?.language ?? "");
      return `\`\`\`${language}\n${inlineToMarkdown(node.content)}\n\`\`\``;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${listItemToMarkdown(item)}`)
        .join("\n");
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return (node.content ?? [])
        .map((item, index) => `${start + index}. ${listItemToMarkdown(item)}`)
        .join("\n");
    }
    case "horizontalRule":
      return "---";
    default:
      return inlineToMarkdown(node.content);
  }
}

function listItemToMarkdown(item: ProseMirrorJsonNode): string {
  return (item.content ?? [])
    .map((child) => blockToMarkdown(child))
    .join("\n  ")
    .replace(/\n/g, "\n  ");
}

/**
 * Renders the document as Markdown with `[index]` prefixes, so the model can
 * reference blocks in its edit tools.
 */
export function documentToIndexedMarkdown(
  document: ProseMirrorJsonNode
): string {
  const blocks = document.content ?? [];
  if (blocks.length === 0) {
    return "(the document is empty)";
  }

  return blocks
    .map((block, index) => `[${index}] ${blockToMarkdown(block)}`)
    .join("\n\n");
}

/* -------------------------------------------------------------------------
 * Reading and mutating the document
 * ---------------------------------------------------------------------- */

/** Reads the current document and returns it as indexed Markdown. */
export async function readDocument(
  liveblocks: Liveblocks,
  roomId: string
): Promise<string> {
  let indexed = "(the document is empty)";
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const document = getDocumentNode(root);
    if (document) {
      indexed = documentToIndexedMarkdown(
        liveblocksProsemirrorNodeToJson(document)
      );
    }
  });
  return indexed;
}

/**
 * Applies one edit operation through `mutateStorage` and returns the updated
 * document as indexed Markdown (so the model works with fresh indices).
 */
export async function applyDocumentOperation(
  liveblocks: Liveblocks,
  roomId: string,
  operation: DocumentOperation
): Promise<{ summary: string; document: string }> {
  let summary = "";
  let indexed = "";

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const document = getOrCreateDocumentNode(root);
    const content = getLiveblocksNodeContent(document);
    if (!content) {
      throw new Error("The document has no content list.");
    }

    if (operation.type === "insert") {
      const blocks = markdownToBlocks(operation.markdown);
      const index = clamp(operation.index, 0, content.length);
      blocks.forEach((block, offset) => {
        content.insert(createLiveblocksProsemirrorNode(block), index + offset);
      });
      summary = `Inserted ${blocks.length} block(s) at index ${index}.`;
    } else if (operation.type === "delete") {
      const fromIndex = clamp(operation.fromIndex, 0, content.length - 1);
      const toIndex = clamp(operation.toIndex, fromIndex, content.length - 1);
      for (let index = toIndex; index >= fromIndex; index--) {
        content.delete(index);
      }
      summary = `Deleted block(s) ${fromIndex}–${toIndex}.`;
    } else {
      const blocks = markdownToBlocks(operation.markdown);
      const fromIndex = clamp(operation.fromIndex, 0, content.length - 1);
      const toIndex = clamp(operation.toIndex, fromIndex, content.length - 1);

      if (
        blocks.length === 1 &&
        fromIndex === toIndex &&
        applyTextDiff(content.get(fromIndex), blocks[0])
      ) {
        // Applied as character-level LiveText edits: concurrent edits made by
        // users inside the same block merge instead of being overwritten.
        summary = `Rewrote block ${fromIndex} (merged at character level).`;
      } else {
        for (let index = toIndex; index >= fromIndex; index--) {
          content.delete(index);
        }
        blocks.forEach((block, offset) => {
          content.insert(
            createLiveblocksProsemirrorNode(block),
            fromIndex + offset
          );
        });
        summary = `Replaced block(s) ${fromIndex}–${toIndex} with ${blocks.length} block(s).`;
      }
    }

    indexed = documentToIndexedMarkdown(
      liveblocksProsemirrorNodeToJson(document)
    );
  });

  return { summary, document: indexed };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/* -------------------------------------------------------------------------
 * Character-level diffing
 * ---------------------------------------------------------------------- */

function marksToAttributes(marks: ProseMirrorJsonMark[] | undefined) {
  if (!marks || marks.length === 0) {
    return undefined;
  }
  return {
    [TEXT_MARKS_ATTRIBUTE]: marks.map((mark) => ({
      type: mark.type,
      ...(mark.attrs !== undefined ? { attrs: mark.attrs } : {}),
    })),
  };
}

/** Finds the marks at a character position of the new block's inline content. */
function marksAtPosition(
  inline: ProseMirrorJsonNode[],
  position: number
): ProseMirrorJsonMark[] | undefined {
  let offset = 0;
  for (const node of inline) {
    const length = node.text?.length ?? 0;
    if (position < offset + length) {
      return node.marks;
    }
    offset += length;
  }
  return inline.at(-1)?.marks;
}

/**
 * Rewrites a block's text as minimal character-level `LiveText` edits, when
 * both the current block and the replacement are simple text blocks. Returns
 * false when the shape doesn't allow it (the caller replaces the node
 * instead).
 */
function applyTextDiff(
  node: LiveblocksProsemirrorNode | undefined,
  newBlock: ProseMirrorJsonNode
): boolean {
  if (!node || node.get("type") !== newBlock.type) {
    return false;
  }

  const content = getLiveblocksNodeContent(node);
  if (!content || content.length !== 1) {
    return false;
  }

  const textNode = content.get(0);
  const liveText = textNode ? getLiveblocksNodeText(textNode) : undefined;
  if (!liveText) {
    return false;
  }

  const inline = newBlock.content ?? [];
  if (!inline.every((child) => child.type === "text")) {
    return false;
  }

  const oldText = liveText.toString();
  const newText = inline.map((child) => child.text ?? "").join("");

  let oldIndex = 0;
  let newIndex = 0;
  for (const [kind, text] of fastDiff(oldText, newText)) {
    if (kind === fastDiff.EQUAL) {
      oldIndex += text.length;
      newIndex += text.length;
    } else if (kind === fastDiff.DELETE) {
      liveText.delete(oldIndex, text.length);
    } else {
      liveText.insert(
        oldIndex,
        text,
        marksToAttributes(marksAtPosition(inline, newIndex))
      );
      oldIndex += text.length;
      newIndex += text.length;
    }
  }

  // Keep block attributes (e.g. heading level) in sync.
  if (JSON.stringify(newBlock.attrs) !== JSON.stringify(node.get("attrs"))) {
    if (newBlock.attrs === undefined) {
      node.delete("attrs");
    } else {
      node.set("attrs", newBlock.attrs);
    }
  }

  return true;
}
