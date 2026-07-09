import type {
  Json,
  LiveList,
  LiveMap,
  LiveObject,
  LiveText,
} from "@liveblocks/client";

export type LiveTextShape = {
  kind: "text";
  type: string;
  version: number;
  content: LiveText;
  props?: LiveMap<string, Json>;
};

export type LiveLineBreakShape = {
  kind: "linebreak";
  type: "linebreak";
  version: number;
};

export type LiveElementShape = {
  kind: "element";
  type: string;
  version: number;
  children: LiveList<LiveChildNode>;
  props?: LiveMap<string, Json>;
};

export type LiveDecoratorShape = {
  kind: "decorator";
  type: string;
  version: number;
  props?: LiveMap<string, Json>;
  slots?: LiveObject<Record<string, LiveChildNode>>;
};

export type LiveChildShape =
  | LiveTextShape
  | LiveElementShape
  | LiveLineBreakShape
  | LiveDecoratorShape;

export type LiveRootShape = {
  kind: "root";
  type: "root";
  version: number;
  children: LiveList<LiveElementNode>;
};

export type LiveStorageShape = LiveRootShape | LiveChildShape;

export type LiveChildNode = LiveObject<LiveChildShape>;
export type LiveTextNode = LiveObject<LiveTextShape>;
export type LiveElementNode = LiveObject<LiveElementShape>;
export type LiveLineBreakNode = LiveObject<LiveLineBreakShape>;
export type LiveDecoratorNode = LiveObject<LiveDecoratorShape>;
export type LiveRootNode = LiveObject<LiveRootShape>;
export type LiveStorageNode = LiveObject<LiveStorageShape>;

/** Storage-relative selection endpoint (not Lexical node keys). */
export type LiveLexicalPointType = "text" | "element";

export type LiveLexicalPoint = {
  /** Stable LiveObject id for the bound storage node. */
  nodeId: string;
  type: LiveLexicalPointType;
  /** Character offset within LiveText (text) or child index (element). */
  offset: number;
  /** LiveText.version at encode time; 0 for non-text points. */
  version: number;
};

export type LiveLexicalSelection = {
  anchor: LiveLexicalPoint;
  focus: LiveLexicalPoint;
};
