export type SerializedTipTapNode = {
  type: string;
  content?: Array<SerializedTipTapNode>;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};
