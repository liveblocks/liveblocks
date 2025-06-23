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

export interface SerializedTiptapGroupMentionNode
  extends SerializedTiptapBaseNode {
  type: "liveblocksGroupMention";
  attrs: {
    id: string;
    notificationId: string;
  };
}

export interface SerializedTiptapEmptyParagraphNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content?: undefined;
}

/**
 * Hard breaks are created by using keys like
 * `shift+enter` or `mod+enter`
 */
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
  | SerializedTiptapEmptyParagraphNode
  | SerializedTiptapHardBreakNode
  | SerializedTiptapMentionNode
  | SerializedTiptapGroupMentionNode
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

const isSerializedEmptyParagraphNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapEmptyParagraphNode => {
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

export const isSerializedGroupMentionNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapGroupMentionNode => {
  return (
    node.type === "liveblocksGroupMention" &&
    isMentionNodeAttributeId(node.attrs.notificationId)
  );
};

const isSerializedParagraphNode = (
  node: SerializedTiptapNode
): node is SerializedTiptapParagraphNode => {
  return node.type === "paragraph" && typeof node.content !== "undefined";
};

/**
 * Internal type helper when flattening nodes.
 * It helps to better extract mention node with context by marking
 * start and ends of paragraph and by handling specific use cases such as
 * using twice the `enter` key which will create an empty paragraph
 * at the first `enter`:
 *
 *  "
 *  Hey @charlie what's up?
 *  _enter_once_
 *  _enter_twice_
 *  "
 */
interface FlattenedTiptapParagraphNodeMarker {
  type: "paragraph-marker";
  marker: "start" | "end";
}

const isFlattenedTiptapParagraphNodeMarker = (
  node: SerializedTiptapNode | FlattenedTiptapParagraphNodeMarker
): node is FlattenedTiptapParagraphNodeMarker => {
  return node.type === "paragraph-marker";
};

/** @internal */
type FlattenedSerializedTiptapNodes = Array<
  SerializedTiptapNode | FlattenedTiptapParagraphNodeMarker
>;

/** @internal - export for testing only */
export const flattenTiptapTree = (
  nodes: SerializedTiptapNode[]
): FlattenedSerializedTiptapNodes => {
  let flattenNodes: FlattenedSerializedTiptapNodes = [];

  for (const node of nodes) {
    if (
      isSerializedEmptyParagraphNode(node) ||
      isSerializedHardBreakNode(node) ||
      isSerializedTextNode(node) ||
      isSerializedMentionNode(node)
    ) {
      flattenNodes = [...flattenNodes, node];
    } else if (isSerializedParagraphNode(node)) {
      flattenNodes = [
        ...flattenNodes,
        {
          type: "paragraph-marker",
          marker: "start",
        },
        ...flattenTiptapTree(node.content),
        {
          type: "paragraph-marker",
          marker: "end",
        },
      ];
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
  mention: SerializedTiptapMentionNode | SerializedTiptapGroupMentionNode;
};

/**
 * Find a Tiptap mention
 * and returns it with contextual surrounding text
 */
export function findTiptapMentionNodeWithContext({
  root,
  mentionedId,
  textMentionId,
}: {
  root: SerializedTiptapRootNode;
  mentionedId: string;
  textMentionId: string;
}): TiptapMentionNodeWithContext | null {
  const nodes = flattenTiptapTree(root.content);

  // Find mention node
  let mentionNodeIndex = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;

    if (
      !isFlattenedTiptapParagraphNodeMarker(node) &&
      (isSerializedMentionNode(node) || isSerializedGroupMentionNode(node)) &&
      node.attrs.notificationId === textMentionId &&
      node.attrs.id === mentionedId
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
  const mentionNode = nodes[mentionNodeIndex] as
    | SerializedTiptapMentionNode
    | SerializedTiptapGroupMentionNode;

  // Apply surrounding text guesses
  // For now let's stay simple just stop at nearest line break or paragraph
  const beforeNodes: SerializedTiptapNode[] = [];
  const afterNodes: SerializedTiptapNode[] = [];

  // Nodes before mention node
  for (let i = mentionNodeIndex - 1; i >= 0; i--) {
    const node = nodes[i]!;

    // Stop if nodes are markers, hard breaks or empty paragraph
    if (
      isFlattenedTiptapParagraphNodeMarker(node) ||
      isSerializedEmptyParagraphNode(node) ||
      isSerializedHardBreakNode(node)
    ) {
      break;
    }

    beforeNodes.unshift(node);
  }

  // Nodes after mention node
  for (let i = mentionNodeIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]!;

    // Stop if nodes are markers, hard breaks or empty paragraph
    if (
      isFlattenedTiptapParagraphNodeMarker(node) ||
      isSerializedEmptyParagraphNode(node) ||
      isSerializedHardBreakNode(node)
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
