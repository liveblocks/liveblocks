export type SerializedTipTapNode = {
  type: string;
  content?: Array<SerializedTipTapNode>;
  text?: string;
  attrs?: Record<string, string>;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
};
