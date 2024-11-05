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
