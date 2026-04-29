import {
  type Json,
  type JsonObject,
  LiveList,
  LiveObject,
  LiveText,
  type LiveTextDelta,
  nanoid,
} from "@liveblocks/client";

const TEXT_MARKS_ATTRIBUTE = "__liveblocks_tiptap_marks";

export type ProseMirrorJsonNode = {
  type: string;
  attrs?: JsonObject;
  content?: ProseMirrorJsonNode[];
  text?: string;
  marks?: ProseMirrorJsonMark[];
};

export type ProseMirrorJsonMark = {
  type: string;
  attrs?: JsonObject;
};

type LiveblocksTiptapNodeData = {
  id: string;
  type: string;
  attrs?: JsonObject;
  content?: LiveList<LiveblocksTiptapNode>;
  text?: LiveText;
};

export type LiveblocksTiptapNode = LiveObject<LiveblocksTiptapNodeData>;

function isJsonObject(value: Json | undefined): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function marksToAttributes(
  marks: ProseMirrorJsonMark[] | undefined
): JsonObject | undefined {
  if (marks === undefined || marks.length === 0) {
    return undefined;
  }

  return {
    [TEXT_MARKS_ATTRIBUTE]: marks.map((mark) => ({
      type: mark.type,
      ...(mark.attrs !== undefined ? { attrs: mark.attrs } : {}),
    })),
  };
}

function attributesToMarks(
  attributes: JsonObject | undefined
): ProseMirrorJsonMark[] | undefined {
  const rawMarks = attributes?.[TEXT_MARKS_ATTRIBUTE];

  if (!Array.isArray(rawMarks)) {
    return undefined;
  }

  const marks: ProseMirrorJsonMark[] = [];
  for (const rawMark of rawMarks) {
    if (!isJsonObject(rawMark) || typeof rawMark.type !== "string") {
      continue;
    }

    marks.push({
      type: rawMark.type,
      ...(isJsonObject(rawMark.attrs) ? { attrs: rawMark.attrs } : {}),
    });
  }

  return marks.length > 0 ? marks : undefined;
}

export function createLiveblocksTiptapNode(
  node: ProseMirrorJsonNode
): LiveblocksTiptapNode {
  if (node.type === "text") {
    const text = new LiveText();
    text.insert(0, node.text ?? "", marksToAttributes(node.marks));

    return new LiveObject({
      id: nanoid(),
      type: node.type,
      text,
    });
  }

  return new LiveObject({
    id: nanoid(),
    type: node.type,
    ...(node.attrs !== undefined ? { attrs: node.attrs } : {}),
    content: new LiveList(
      (node.content ?? []).map((child) => createLiveblocksTiptapNode(child))
    ),
  });
}

function liveTextToTextNodes(text: LiveText): ProseMirrorJsonNode[] {
  const nodes: ProseMirrorJsonNode[] = [];

  for (const delta of text.toDelta()) {
    if (delta.insert.length === 0) {
      continue;
    }

    nodes.push({
      type: "text",
      text: delta.insert,
      ...(delta.attributes !== undefined
        ? { marks: attributesToMarks(delta.attributes) }
        : {}),
    });
  }

  return nodes;
}

export function liveblocksTiptapNodeToJsonNodes(
  node: LiveblocksTiptapNode
): ProseMirrorJsonNode[] {
  const type = node.get("type");

  if (type === "text") {
    const text = node.get("text");
    return text instanceof LiveText ? liveTextToTextNodes(text) : [];
  }

  const content = node.get("content");
  const jsonNode: ProseMirrorJsonNode = {
    type,
    ...(node.get("attrs") !== undefined ? { attrs: node.get("attrs") } : {}),
  };

  if (content instanceof LiveList && content.length > 0) {
    const children: ProseMirrorJsonNode[] = [];

    for (let index = 0; index < content.length; index++) {
      const child = content.get(index);
      if (child !== undefined) {
        children.push(...liveblocksTiptapNodeToJsonNodes(child));
      }
    }

    if (children.length > 0) {
      jsonNode.content = children;
    }
  }

  return [jsonNode];
}

export function liveblocksTiptapNodeToJson(
  node: LiveblocksTiptapNode
): ProseMirrorJsonNode {
  const [jsonNode] = liveblocksTiptapNodeToJsonNodes(node);

  if (jsonNode === undefined) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  return jsonNode;
}

export function createDefaultDocument(): ProseMirrorJsonNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function stringifyDocument(node: ProseMirrorJsonNode): string {
  return JSON.stringify(node);
}

export type { LiveTextDelta };
