import { yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

export interface SerializedTiptapBaseNode {
  type: string;
  content?: Array<SerializedTiptapBaseNode>;
}

export interface SerializedTiptapLineBreakNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content: undefined;
}

export interface SerializedTiptapBaseMark {
  type: string;
  attrs: Record<string, string>;
}

export interface SerializedTiptapBoldMark extends SerializedTiptapBaseMark {
  type: "bold";
}

export interface SerializedTiptapItalicMark extends SerializedTiptapBaseMark {
  type: "italic";
}

export interface SerializedTiptapStrikethroughMark
  extends SerializedTiptapBaseMark {
  type: "strike";
}

export interface SerializedTiptapStrikethroughMark
  extends SerializedTiptapBaseMark {
  type: "strike";
}

export interface SerializedTiptapCommentMark extends SerializedTiptapBaseMark {
  type: "liveblocksCommentMark";
  attrs: {
    threadId: string;
  };
}

export type SerializedTiptapMark =
  | SerializedTiptapBoldMark
  | SerializedTiptapItalicMark
  | SerializedTiptapStrikethroughMark;

export interface SerializedTiptapTextNode extends SerializedTiptapBaseNode {
  type: "text";
  text: string;
  marks?: Array<SerializedTiptapMark>;
  content: undefined;
}

export interface SerializedTiptapMentionNode extends SerializedTiptapBaseNode {
  type: "liveblocksMention";
  attrs: {
    userId: string;
    notificationId: string;
  };
}

export interface SerializedTiptapParagraphNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content: Array<SerializedTiptapNode>;
}

export type SerializedTiptapNode =
  | SerializedTiptapParagraphNode
  | SerializedTiptapLineBreakNode
  | SerializedTiptapMentionNode
  | SerializedTiptapTextNode;

export type SerializedTiptapRootNodeContent = Array<
  Readonly<SerializedTiptapNode>
>;

export interface SerializedTiptapRootNode
  extends Readonly<SerializedTiptapBaseNode> {
  readonly type: "doc";
  readonly content: SerializedTiptapRootNodeContent;
}

/**
 * Convert a document as binaries to
 * serialized tiptap state
 */
export function getSerializedTiptapState({
  buffer,
  key,
}: {
  buffer: ArrayBuffer;
  key: string;
}): SerializedTiptapRootNode {
  const update = new Uint8Array(buffer);
  // Construct a Y.js document from the binary update
  const document = new Y.Doc();
  Y.applyUpdate(document, update);

  // Convert the Y.js document to a serializable tiptap state
  const fragment = document.getXmlFragment(key);
  const state = yXmlFragmentToProsemirrorJSON(fragment);

  // Destroy the Y.js document after the conversion
  document.destroy();

  // Not ideal but pragmatic enough as the typing is based
  // on real data we provide
  return state as SerializedTiptapRootNode;
}

const isLineBreakNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapLineBreakNode => {
  return node.type === "paragraph" && typeof node.content === "undefined";
};

const isTextNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapTextNode => {
  return node.type === "text";
};

const isMentionNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapMentionNode => {
  return node.type === "liveblocksMention";
};

const isParagraphNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapParagraphNode => {
  return node.type === "paragraph" && typeof node.content !== "undefined";
};

/** @internal */
const flattenTiptapTree = (
  nodes: SerializedTiptapNode[]
): SerializedTiptapNode[] => {
  let flattenNodes: SerializedTiptapNode[] = [];

  for (const node of nodes) {
    if (isLineBreakNode(node) || isTextNode(node) || isMentionNode(node)) {
      flattenNodes = [...flattenNodes, node];
    } else if (isParagraphNode(node)) {
      flattenNodes = [...flattenNodes, ...flattenTiptapTree(node.content)];
    }
  }

  return flattenNodes;
};
