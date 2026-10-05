import {
  type Json,
  type JsonObject,
  LiveList,
  LiveMap,
  LiveObject,
  LiveText,
  type LiveTextAttributes,
  type LiveTextAttributesPatch,
  nanoid,
} from "@liveblocks/client";

export const TEXT_MARKS_ATTRIBUTE = "__liveblocks_tiptap_marks";

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

type LiveblocksProsemirrorNodeData = {
  id: string;
  type: string;
  attrs?: LiveMap<string, Json>;
  content?: LiveList<LiveblocksProsemirrorNode>;
  text?: LiveText;
};

export type LiveblocksProsemirrorNode =
  LiveObject<LiveblocksProsemirrorNodeData>;

function serializeLiveblocksNodeAttrs(
  attrs: LiveMap<string, Json>
): JsonObject {
  const serialized: JsonObject = {};
  for (const [key, value] of attrs) {
    serialized[key] = value;
  }
  return serialized;
}

function createLiveblocksNodeAttrs(attrs: JsonObject): LiveMap<string, Json> {
  const entries: [string, Json][] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      entries.push([key, value]);
    }
  }
  return new LiveMap(entries);
}

function isJsonObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function marksToAttributes(
  marks: ProseMirrorJsonMark[] | undefined
): LiveTextAttributes | undefined {
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

export function attributesToMarks(
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

export function marksToAttributesPatch(
  marks: ProseMirrorJsonMark[] | undefined
): LiveTextAttributesPatch {
  const attributes = marksToAttributes(marks);
  return {
    [TEXT_MARKS_ATTRIBUTE]:
      attributes?.[TEXT_MARKS_ATTRIBUTE] === undefined
        ? null
        : attributes[TEXT_MARKS_ATTRIBUTE],
  };
}

export function createLiveblocksProsemirrorNode(
  node: ProseMirrorJsonNode
): LiveblocksProsemirrorNode {
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
    ...(node.attrs !== undefined
      ? { attrs: createLiveblocksNodeAttrs(node.attrs) }
      : {}),
    content: new LiveList(
      (node.content ?? []).map((child) =>
        createLiveblocksProsemirrorNode(child)
      )
    ),
  });
}

export function getLiveblocksNodeId(node: LiveblocksProsemirrorNode): string {
  return node.get("id");
}

export function getLiveblocksNodeType(node: LiveblocksProsemirrorNode): string {
  return node.get("type");
}

export function getLiveblocksNodeContent(
  node: LiveblocksProsemirrorNode
): LiveList<LiveblocksProsemirrorNode> | undefined {
  const content = node.get("content");
  return content instanceof LiveList ? content : undefined;
}

export function getLiveblocksNodeText(
  node: LiveblocksProsemirrorNode
): LiveText | undefined {
  const text = node.get("text");
  return text instanceof LiveText ? text : undefined;
}

export function getLiveblocksNodeAttrs(
  node: LiveblocksProsemirrorNode
): JsonObject | undefined {
  const attrs = node.get("attrs");
  return attrs === undefined ? undefined : serializeLiveblocksNodeAttrs(attrs);
}

export function updateLiveblocksNodeAttrs(
  node: LiveblocksProsemirrorNode,
  attrs: JsonObject | undefined
): void {
  if (attrs === undefined) {
    node.delete("attrs");
  } else {
    node.set("attrs", createLiveblocksNodeAttrs(attrs));
  }
}

function liveTextToTextNodes(text: LiveText): ProseMirrorJsonNode[] {
  const nodes: ProseMirrorJsonNode[] = [];

  for (const [segmentText, segmentAttributes] of text.toJSON()) {
    if (segmentText.length === 0) {
      continue;
    }

    nodes.push({
      type: "text",
      text: segmentText,
      ...(segmentAttributes !== undefined
        ? { marks: attributesToMarks(segmentAttributes) }
        : {}),
    });
  }

  return nodes;
}

export function liveblocksProsemirrorNodeToJsonNodes(
  node: LiveblocksProsemirrorNode
): ProseMirrorJsonNode[] {
  const type = node.get("type");

  if (type === "text") {
    const text = node.get("text");
    return text instanceof LiveText ? liveTextToTextNodes(text) : [];
  }

  const content = node.get("content");
  const attrs = getLiveblocksNodeAttrs(node);
  const jsonNode: ProseMirrorJsonNode = {
    type,
    ...(attrs !== undefined ? { attrs } : {}),
  };

  if (content instanceof LiveList && content.length > 0) {
    const children: ProseMirrorJsonNode[] = [];

    for (let index = 0; index < content.length; index++) {
      const child = content.get(index);
      if (child !== undefined) {
        children.push(...liveblocksProsemirrorNodeToJsonNodes(child));
      }
    }

    if (children.length > 0) {
      jsonNode.content = children;
    }
  }

  return [jsonNode];
}

export function liveblocksProsemirrorNodeToJson(
  node: LiveblocksProsemirrorNode,
  fallbackDocument?: () => ProseMirrorJsonNode
): ProseMirrorJsonNode {
  const [jsonNode] = liveblocksProsemirrorNodeToJsonNodes(node);

  if (
    jsonNode === undefined ||
    (jsonNode.type === "doc" &&
      (!Array.isArray(jsonNode.content) || jsonNode.content.length === 0))
  ) {
    const fallback = fallbackDocument?.();
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return jsonNode ?? { type: node.get("type") };
}

export function stringifyDocument(node: ProseMirrorJsonNode): string {
  return JSON.stringify(node);
}
