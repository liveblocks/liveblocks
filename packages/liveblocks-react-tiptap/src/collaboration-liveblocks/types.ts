import type { JsonObject, LiveObject, LsonObject } from "@liveblocks/client";

export type LiveblocksTiptapRoom = {
  batch(callback: () => void): void;
  getOthers(): readonly {
    connectionId: number;
    info?: JsonObject;
    presence: JsonObject;
  }[];
  getStorage(): Promise<{ root: LiveObject<LsonObject> }>;
  history: {
    canUndo(): boolean;
    canRedo(): boolean;
    disable<T>(callback: () => T): T;
    undo(): void;
    redo(): void;
  };
  subscribe(
    node: LiveObject<LsonObject>,
    callback: () => void,
    options: { isDeep: true }
  ): () => void;
  updatePresence(patch: JsonObject): void;
  events: {
    others: {
      subscribe(callback: () => void): () => void;
    };
  };
};
