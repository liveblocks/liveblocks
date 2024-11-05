import { yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

export interface SerializedTipTapBaseNode {
  type: string;
  content?: Array<SerializedTipTapBaseNode>;
}

export interface SerializedTipTapParagraphBreakNode
  extends SerializedTipTapBaseNode {
  type: "paragraph";
  content: Array<SerializedTipTapBaseNode>;
}

export interface SerializedTipTapLineBreakNode
  extends Omit<SerializedTipTapBaseNode, "content"> {
  type: "paragraph";
}

export interface SerializedTipTapBaseMark {
  type: string;
  attrs: Record<string, string>;
}

export interface SerializedTipTapBoldMark extends SerializedTipTapBaseMark {
  type: "bold";
}

export interface SerializedTipTapItalicMark extends SerializedTipTapBaseMark {
  type: "italic";
}

export interface SerializedTipTapStrikethroughMark
  extends SerializedTipTapBaseMark {
  type: "strike";
}

export interface SerializedTipTapStrikethroughMark
  extends SerializedTipTapBaseMark {
  type: "strike";
}

export interface SerializedTipTapCommentMark extends SerializedTipTapBaseMark {
  type: "liveblocksCommentMark";
  attrs: {
    threadId: string;
  };
}

export type SerializedTipTapMark =
  | SerializedTipTapBoldMark
  | SerializedTipTapItalicMark
  | SerializedTipTapStrikethroughMark;

export interface SerializedTipTapTextNode extends SerializedTipTapBaseNode {
  type: "text";
  text: string;
  marks?: Array<SerializedTipTapMark>;
}

export interface SerializedTipTapMentionNode extends SerializedTipTapBaseNode {
  type: "liveblocksMention";
  attrs: {
    userId: string;
    notificationId: string;
  };
}

export type SerializedTipTapNode =
  | SerializedTipTapParagraphBreakNode
  | SerializedTipTapLineBreakNode
  | SerializedTipTapMentionNode;

export type SerializedTipTapRootNodeContent = Array<
  Readonly<SerializedTipTapNode>
>;

export interface SerializedTipTapRootNode
  extends Readonly<SerializedTipTapBaseNode> {
  readonly type: "doc";
  readonly content: SerializedTipTapRootNodeContent;
}

/**
 * Convert a document as binaries to
 * serialized tiptap state
 */
export function getSerializedTipTapState({
  buffer,
  key,
}: {
  buffer: ArrayBuffer;
  key: string;
}): SerializedTipTapRootNode {
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
  return state as SerializedTipTapRootNode;
}
