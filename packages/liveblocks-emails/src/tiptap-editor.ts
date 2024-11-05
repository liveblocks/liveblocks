import { yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

export interface SerializedTiptapBaseNode {
  type: string;
  content?: Array<SerializedTiptapBaseNode>;
}

export interface SerializedTiptapParagraphBreakNode
  extends SerializedTiptapBaseNode {
  type: "paragraph";
  content: Array<SerializedTiptapBaseNode>;
}

export interface SerializedTiptapLineBreakNode
  extends Omit<SerializedTiptapBaseNode, "content"> {
  type: "paragraph";
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
}

export interface SerializedTiptapMentionNode extends SerializedTiptapBaseNode {
  type: "liveblocksMention";
  attrs: {
    userId: string;
    notificationId: string;
  };
}

export type SerializedTiptapNode =
  | SerializedTiptapParagraphBreakNode
  | SerializedTiptapLineBreakNode
  | SerializedTiptapMentionNode;

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
