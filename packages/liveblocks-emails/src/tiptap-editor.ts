export interface SerializedTipTapNode {
  type: string;
  content?: Array<SerializedTipTapNode>;
  text?: string;
  attrs?: Record<string, string>;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
}

export interface SerializedTipTapTextNode extends SerializedTipTapNode {
  type: "text";
  // TODO: add format in attrs
}
export interface SerializedTipTapMentionNode extends SerializedTipTapNode {
  type: "liveblocksMention";
  attrs: {
    notificationId: string;
  };
}
