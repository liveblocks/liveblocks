import type { Json, LiveMap, Lson, LsonObject, StorageUpdate } from "..";
import type { LiveListUpdates } from "../crdts/LiveList";
import type { LiveObjectUpdateDelta } from "../crdts/LiveObject";
import type { ToJson } from "../crdts/Lson";
import type { UpdateDelta } from "../crdts/UpdateDelta";
import { lsonToJson } from "../immutable";
import { assertNever } from "../lib/assert";

export type JsonStorageUpdate =
  | JsonLiveListUpdate<Lson>
  | JsonLiveObjectUpdate<LsonObject>
  | JsonLiveMapUpdate<string, Lson>;

export type JsonLiveListUpdate<TItem extends Lson> = {
  type: "LiveList";
  node: Array<ToJson<TItem>>;
  updates: Array<JsonLiveListUpdateDelta<TItem>>;
};

export type JsonLiveListUpdateDelta<TItem extends Lson> =
  | {
      type: "insert";
      item: ToJson<TItem>;
      index: number;
    }
  | {
      type: "move";
      index: number;
      previousIndex: number;
      item: ToJson<TItem>;
    }
  | {
      type: "delete";
      index: number;
      deletedItem: ToJson<TItem>;
    }
  | {
      type: "set";
      item: ToJson<TItem>;
      index: number;
    };

export type JsonLiveObjectUpdate<O extends LsonObject> = {
  type: "LiveObject";
  node: ToJson<O>;
  updates: LiveObjectUpdateDelta<O>;
};

export type JsonLiveMapUpdate<TKey extends string, TValue extends Lson> = {
  type: "LiveMap";
  node: ToJson<LiveMap<TKey, TValue>>;
  updates: { [key: string]: UpdateDelta };
};

export function liveListUpdateToJson<TItem extends Lson>(
  update: LiveListUpdates<TItem>
): JsonLiveListUpdate<TItem> {
  return {
    type: update.type,
    node: lsonToJson(update.node) as ToJson<TItem>[],
    //                            ^^^^^^^^^^^^^^^^^^ FIXME: Manual cast should eventually not be necessary
    updates: update.updates.map((delta) => {
      switch (delta.type) {
        case "move": {
          return {
            type: delta.type,
            index: delta.index,
            previousIndex: delta.previousIndex,
            item: lsonToJson(delta.item),
          };
        }
        case "delete": {
          return delta;
        }
        case "insert": {
          return {
            type: delta.type,
            index: delta.index,
            item: lsonToJson(delta.item),
          };
        }
        case "set": {
          return {
            type: delta.type,
            index: delta.index,
            item: lsonToJson(delta.item),
          };
        }
      }
    }) as any,
    // ^^^^^^ FIXME: TypeScript nags about this correctly. Deal with this later.
  };
}

export function serializeUpdateToJson(
  update: StorageUpdate
): JsonStorageUpdate {
  if (update.type === "LiveList") {
    return liveListUpdateToJson(update);
  }

  if (update.type === "LiveObject") {
    return {
      type: update.type,
      node: lsonToJson(update.node) as ToJson<typeof update.node>,
      //                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FIXME: Manual cast should eventually not be necessary
      updates: update.updates,
    };
  }

  if (update.type === "LiveMap") {
    return {
      type: update.type,
      node: lsonToJson(update.node) as { [key: string]: Json },
      //                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ FIXME: Manual cast should eventually not be necessary
      updates: update.updates,
    };
  }

  return assertNever(update, "Unsupported LiveStructure type");
}

export function objectUpdate<TContents extends LsonObject>(
  contents: ToJson<TContents>,
  updates: LiveObjectUpdateDelta<TContents>
): JsonLiveObjectUpdate<TContents> {
  return {
    type: "LiveObject",
    node: contents,
    updates,
  };
}

export function listUpdate<TItem extends Lson>(
  items: ToJson<TItem>[],
  updates: JsonLiveListUpdateDelta<TItem>[]
): JsonLiveListUpdate<TItem> {
  return {
    type: "LiveList",
    node: items,
    updates,
  };
}

export function listUpdateInsert<TItem extends Lson>(
  index: number,
  item: ToJson<TItem>
): JsonLiveListUpdateDelta<TItem> {
  return {
    type: "insert",
    item,
    index,
  };
}

export function listUpdateSet<TItem extends Lson>(
  index: number,
  item: ToJson<TItem>
): JsonLiveListUpdateDelta<TItem> {
  return {
    type: "set",
    item,
    index,
  };
}

export function listUpdateDelete(
  index: number,
  prev: Json
): JsonLiveListUpdateDelta<Json> {
  return {
    type: "delete",
    index,
    deletedItem: prev,
  };
}

export function listUpdateMove<TItem extends Lson>(
  previousIndex: number,
  index: number,
  item: ToJson<TItem>
): JsonLiveListUpdateDelta<TItem> {
  return {
    type: "move",
    item,
    index,
    previousIndex,
  };
}
