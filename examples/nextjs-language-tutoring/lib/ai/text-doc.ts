import { LiveMap, type LiveObject } from "@liveblocks/node";
import {
  createLiveblocksProsemirrorNode,
  getLiveblocksNodeContent,
  liveblocksProsemirrorNodeToJson,
  type LiveblocksProsemirrorNode,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import { getSchema } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { generateJSON } from "@tiptap/html/server";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { liveblocks } from "@/lib/liveblocks-server";
import { showAiPresence, textCaretPresence } from "./presence";

// Text documents are LiveText-backed Tiptap documents, stored in the room's
// Storage under `_tiptap_docs[docId]` as a tree of LiveObjects (one per
// ProseMirror node). The assistant edits them with `liveblocks.mutateStorage`
// and the converters from `@liveblocks/prosemirror`, so its changes show up
// in everyone's editor instantly, like any other collaborator's.

// Must produce the same node types as the editor in `components/docs/text-doc.tsx`
const EXTENSIONS = [StarterKit.configure({ undoRedo: false }), TableKit];
const schema = getSchema(EXTENSIONS);

const EMPTY_DOCUMENT: ProseMirrorJsonNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

// Pause between blocks, so people can watch the assistant write
const BLOCK_DELAY_MS = 150;

export type TextDocumentContents = {
  blocks: ProseMirrorJsonNode[];
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function readTextDocument(
  roomId: string,
  docId: string
): Promise<TextDocumentContents> {
  let blocks: ProseMirrorJsonNode[] = [];
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const doc = root.get("_tiptap_docs")?.get(docId);
    if (doc) {
      blocks = liveblocksProsemirrorNodeToJson(doc).content ?? [];
    }
  });
  return { blocks };
}

// A compact, numbered Markdown rendering of the document for the model.
// Block numbers are what the write tool's `at` / `to` refer to.
export function describeTextDocument(contents: TextDocumentContents) {
  if (contents.blocks.length === 0) {
    return "(empty document)";
  }
  return contents.blocks
    .map((block, index) => `[${index}] ${blockToMarkdown(block)}`)
    .join("\n");
}

export function blockToMarkdown(node: ProseMirrorJsonNode): string {
  switch (node.type) {
    case "heading": {
      const level =
        typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      return `${"#".repeat(level)} ${inlineText(node)}`;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${listItemText(item)}`)
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, index) => `${index + 1}. ${listItemText(item)}`)
        .join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${blockToMarkdown(child)}`)
        .join("\n");
    case "codeBlock":
      return `\`\`\`\n${inlineText(node)}\n\`\`\``;
    case "horizontalRule":
      return "---";
    case "table":
      return tableToMarkdown(node);
    default:
      return inlineText(node);
  }
}

function listItemText(item: ProseMirrorJsonNode) {
  return (item.content ?? []).map(blockToMarkdown).join(" ");
}

function tableToMarkdown(table: ProseMirrorJsonNode) {
  const rows = (table.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? []).map(blockToMarkdown).join(" ")
    )
  );
  if (rows.length === 0) return "(empty table)";
  const [header, ...body] = rows;
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...body.map(line)].join(
    "\n"
  );
}

export function inlineText(node: ProseMirrorJsonNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// Markdown → ProseMirror JSON blocks, through HTML, using the editor's schema
export function markdownToBlocks(markdown: string): ProseMirrorJsonNode[] {
  const html = marked.parse(markdown, { async: false, gfm: true });
  const json = generateJSON(html, EXTENSIONS) as ProseMirrorJsonNode;
  return json.content ?? [];
}

export type WriteMode = "append" | "insert" | "replace";

export type WriteOptions = {
  mode: WriteMode;
  // Block index for `insert` (insert before it) and `replace` (first block)
  at?: number;
  // Last block to replace, inclusive. Defaults to `at`.
  to?: number;
};

// Writes Markdown into a text document, block by block, moving the
// assistant's caret along as it goes.
export async function writeTextDocument(
  roomId: string,
  docId: string,
  markdown: string,
  options: WriteOptions
): Promise<{ insertedBlocks: number }> {
  const blocks = markdownToBlocks(markdown);
  if (blocks.length === 0) {
    return { insertedBlocks: 0 };
  }

  let index = -1;
  for (const [i, block] of blocks.entries()) {
    const first = i === 0;
    let caret = 0;
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      const content = ensureDocument(root, docId);
      if (first) {
        index = prepareInsertionPoint(content, options);
      }
      content.insert(createLiveblocksProsemirrorNode(block), index);
      index += 1;
      caret = endOfBlockPosition(content, index - 1);
    });
    await showAiPresence(roomId, textCaretPresence(docId, caret));
    if (i < blocks.length - 1) {
      await sleep(BLOCK_DELAY_MS);
    }
  }

  return { insertedBlocks: blocks.length };
}

type Root = LiveObject<Liveblocks["Storage"]>;
type DocumentContent = NonNullable<ReturnType<typeof getLiveblocksNodeContent>>;

// Finds (or creates) the document's top-level block list
function ensureDocument(root: Root, docId: string): DocumentContent {
  let docs = root.get("_tiptap_docs");
  if (!docs) {
    docs = new LiveMap<string, LiveblocksProsemirrorNode>();
    root.set("_tiptap_docs", docs);
  }
  let doc = docs.get(docId);
  if (!doc) {
    doc = createLiveblocksProsemirrorNode(EMPTY_DOCUMENT);
    docs.set(docId, doc);
  }
  const content = getLiveblocksNodeContent(doc);
  if (!content) {
    // Shouldn't happen: a document root always has content
    throw new Error("Text document has no content");
  }
  return content;
}

// Applies the deletes for `replace`, drops the placeholder paragraph of an
// empty document, and returns the index to insert at.
function prepareInsertionPoint(
  content: DocumentContent,
  options: WriteOptions
): number {
  const length = content.length;
  if (options.mode === "replace" && length > 0) {
    const from = clamp(options.at ?? 0, 0, length - 1);
    const to = clamp(options.to ?? from, from, length - 1);
    for (let i = to; i >= from; i--) {
      content.delete(i);
    }
    return from;
  }

  // A new document is a single empty paragraph; replace it rather than
  // appending below it.
  if (length === 1 && isEmptyParagraph(content.get(0))) {
    content.delete(0);
    return 0;
  }

  if (options.mode === "insert") {
    return clamp(options.at ?? length, 0, length);
  }
  return length;
}

function isEmptyParagraph(node: LiveblocksProsemirrorNode | undefined) {
  if (!node) return false;
  const json = liveblocksProsemirrorNodeToJson(node);
  return json.type === "paragraph" && inlineText(json).trim() === "";
}

// ProseMirror position just inside the end of block `index`, for the caret
function endOfBlockPosition(content: DocumentContent, index: number) {
  let position = 0;
  for (let i = 0; i <= index; i++) {
    const node = content.get(i);
    if (!node) break;
    position += nodeSize(liveblocksProsemirrorNodeToJson(node));
  }
  return Math.max(0, position - 1);
}

function nodeSize(json: ProseMirrorJsonNode) {
  try {
    return ProseMirrorNode.fromJSON(schema, json).nodeSize;
  } catch {
    return 2;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
