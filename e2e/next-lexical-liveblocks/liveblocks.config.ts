import type {
  JsonObject,
  LiveList,
  LiveObject,
  LiveText,
} from "@liveblocks/client";

export type LiveTextShape = {
  kind: "text";
  type: string;
  version: number;
  content: LiveText;
  props?: JsonObject;
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
  props?: JsonObject;
};

export type LiveDecoratorShape = {
  kind: "decorator";
  type: string;
  version: number;
  props?: JsonObject;
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

declare global {
  interface Liveblocks {
    Presence: {};

    Storage: {
      document: LiveRootNode;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };
  }
}

export {};
