import { yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { isMentionNodeAttributeId } from "./lib/utils";

export interface SerializedTiptapBaseNode {
  type: string;
  content?: Array<SerializedTiptapBaseNode>;
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

export interface SerializedTiptapCodeMark extends SerializedTiptapBaseMark {
  type: "code";
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
  | SerializedTiptapStrikethroughMark
  | SerializedTiptapCodeMark
  | SerializedTiptapCommentMark;

export type SerializedTiptapMarkType = SerializedTiptapMark["type"];

export interface SerializedTiptapTextNode extends SerializedTiptapBaseNode {
  type: "text";
  text: string;
  marks?: Array<SerializedTiptapMark>;
}

export interface SerializedTiptapMentionNode extends SerializedTiptapBaseNode {
  type: "liveblocksMention";
  attrs: {
    id: string;
    notificationId: string;
  };
}

export interface SerializedTiptapLineBreakNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content?: undefined;
}

export interface SerializedTiptapHardBreakNode
  extends SerializedTiptapBaseNode {
  type: "hardBreak";
  content?: undefined;
}

export interface SerializedTiptapParagraphNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content: Array<SerializedTiptapNode>;
}

export type SerializedTiptapNode =
  | SerializedTiptapParagraphNode
  | SerializedTiptapLineBreakNode
  | SerializedTiptapHardBreakNode
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

const isSerializedLineBreakNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapLineBreakNode => {
  return node.type === "paragraph" && typeof node.content === "undefined";
};

const isSerializedHardBreakNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapHardBreakNode => {
  return node.type === "hardBreak" && typeof node.content === "undefined";
};

const isSerializedTextNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapTextNode => {
  return node.type === "text";
};

export const isSerializedMentionNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapMentionNode => {
  return (
    node.type === "liveblocksMention" &&
    isMentionNodeAttributeId(node.attrs.notificationId)
  );
};

const isSerializedParagraphNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapParagraphNode => {
  return node.type === "paragraph" && typeof node.content !== "undefined";
};

/** @internal - export for testing only */
export const flattenTiptapTree = (
  nodes: SerializedTiptapNode[]
): SerializedTiptapNode[] => {
  let flattenNodes: SerializedTiptapNode[] = [];

  for (const node of nodes) {
    if (
      isSerializedLineBreakNode(node) ||
      isSerializedHardBreakNode(node) ||
      isSerializedTextNode(node) ||
      isSerializedMentionNode(node)
    ) {
      flattenNodes = [...flattenNodes, node];
    } else if (isSerializedParagraphNode(node)) {
      flattenNodes = [...flattenNodes, ...flattenTiptapTree(node.content)];
    }
  }

  return flattenNodes;
};

/**
 * Tiptap Mention Node with context
 */
export type TiptapMentionNodeWithContext = {
  before: SerializedTiptapNode[];
  after: SerializedTiptapNode[];
  mention: SerializedTiptapMentionNode;
};

/**
 * Find a Tiptap mention
 * and returns it with contextual surrounding text
 */
export function findTiptapMentionNodeWithContext({
  root,
  mentionedUserId,
  mentionId,
}: {
  root: SerializedTiptapRootNode;
  mentionedUserId: string;
  mentionId: string;
}): TiptapMentionNodeWithContext | null {
  const nodes = flattenTiptapTree(root.content);

  // Find mention node
  let mentionNodeIndex = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;

    if (
      isSerializedMentionNode(node) &&
      node.attrs.notificationId === mentionId &&
      node.attrs.id === mentionedUserId
    ) {
      mentionNodeIndex = i;
      break;
    }
  }

  // No mention node found
  if (mentionNodeIndex === -1) {
    return null;
  }

  // Collect nodes before and after
  const mentionNode = nodes[mentionNodeIndex] as SerializedTiptapMentionNode;

  // Apply surrounding text guesses
  // For now let's stay simple just stop at nearest line break or paragraph
  const beforeNodes: SerializedTiptapNode[] = [];
  const afterNodes: SerializedTiptapNode[] = [];

  // Nodes before mention node
  for (let i = mentionNodeIndex - 1; i >= 0; i--) {
    const node = nodes[i]!;

    // Stop if nodes are line breaks or paragraph
    if (
      isSerializedLineBreakNode(node) ||
      isSerializedHardBreakNode(node) ||
      isSerializedParagraphNode(node)
    ) {
      break;
    }

    beforeNodes.unshift(node);
  }

  // Nodes after mention node
  for (let i = mentionNodeIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]!;

    // Stop if nodes are line breaks or paragraph
    if (
      isSerializedLineBreakNode(node) ||
      isSerializedHardBreakNode(node) ||
      isSerializedParagraphNode(node)
    ) {
      break;
    }

    afterNodes.push(node);
  }

  return {
    before: beforeNodes,
    after: afterNodes,
    mention: mentionNode,
  };
}
