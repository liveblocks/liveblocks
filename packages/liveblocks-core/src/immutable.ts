import {
  findNonSerializableValue,
  isLiveList,
  isLiveMap,
  isLiveObject,
  isLiveStructure,
} from "./crdts/liveblocks-helpers";
import { LiveList } from "./crdts/LiveList";
import { LiveMap } from "./crdts/LiveMap";
import { LiveObject } from "./crdts/LiveObject";
import { LiveRegister } from "./crdts/LiveRegister";
import type { LiveNode, Lson, LsonObject, ToJson } from "./crdts/Lson";
import type { StorageUpdate } from "./crdts/StorageUpdates";
import * as console from "./lib/fancy-console";
import { isPlainObject } from "./lib/guards";
import type { Json, JsonObject } from "./lib/Json";
import { isJsonObject } from "./lib/Json";

function lsonObjectToJson<O extends LsonObject>(
  obj: O
): { [K in keyof O]: Json } {
  const result = {} as { [K in keyof O]: Json };
  for (const key in obj) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = lsonToJson(val);
    }
  }
  return result;
}

export function liveObjectToJson<O extends LsonObject>(
  liveObject: LiveObject<O>
): { [K in keyof O]: Json } {
  return lsonObjectToJson(liveObject.toObject());
}

function liveMapToJson<TKey extends string>(
  map: LiveMap<TKey, Lson>
): { [K in TKey]: Json } {
  const result = {} as { [K in TKey]: Json };
  for (const [key, value] of map.entries()) {
    result[key] = lsonToJson(value);
  }
  return result;
}

function lsonListToJson(value: Lson[]): Json[] {
  return value.map(lsonToJson);
}

function liveListToJson(value: LiveList<Lson>): Json[] {
  return lsonListToJson(value.toArray());
}

export function lsonToJson(value: Lson): Json {
  // Check for LiveStructure datastructures first
  if (value instanceof LiveObject) {
    return liveObjectToJson(value);
  } else if (value instanceof LiveList) {
    return liveListToJson(value);
  } else if (value instanceof LiveMap) {
    return liveMapToJson(value);
  } else if (value instanceof LiveRegister) {
    // NOTE: This branch should never be taken, because LiveRegister isn't a valid Lson value
    return value.data as Json;
  }

  // Then for composite Lson values
  if (Array.isArray(value)) {
    return lsonListToJson(value);
  } else if (isPlainObject(value)) {
    return lsonObjectToJson(value);
  }

  // Finally, if value is an LsonScalar, then it's also a valid JsonScalar
  return value;
}

/**
 * Per-key sync configuration for node/edge `data` properties.
 *
 * true
 *   Sync this property to Liveblocks Storage. Arrays and objects in the value
 *   will be stored as LiveLists and LiveObjects, enabling fine-grained
 *   conflict-free merging. This is the default for all keys.
 *
 * false
 *   Don't sync this property. It stays local to the current client. This
 *   property will be `undefined` on other clients.
 *
 * "atomic"
 *   Sync this property, but treat it as an indivisible value. The entire value
 *   is replaced as a whole (last-writer-wins) instead of being recursively
 *   converted to LiveObjects/LiveLists. Use this when clients always replace
 *   the value entirely and never need concurrent sub-key merging.
 *
 * { ... }
 *   A nested config object for recursively configuring sub-keys of an object.
 *
 * @example
 * ```ts
 * const sync: SyncConfig = {
 *   label: true,             // sync (default)
 *   createdAt: false,        // local-only
 *   shape: "atomic",         // replaced as a whole, no deep merge
 *   nested: {                // recursive config
 *     deep: false,
 *   },
 * };
 * ```
 */
export type SyncMode = boolean | "atomic" | SyncConfig;

export type SyncConfig = {
  [key: string]: SyncMode | undefined;
};

/**
 * Deeply converts all nested lists to LiveLists, and all nested objects to
 * LiveObjects.
 *
 * As such, the returned result will not contain any Json arrays or Json
 * objects anymore.
 */
function deepLiveify(value: Json, config?: SyncMode): Lson {
  if (Array.isArray(value)) {
    // For arrays we simply forward the config to the element level
    return new LiveList(value.map((v) => deepLiveify(v, config)));
  } else if (isPlainObject(value)) {
    const init: LsonObject = {};
    const locals: Record<string, Json> = {};
    for (const key in value) {
      const val = value[key];
      if (val === undefined) {
        continue;
      }

      const subConfig = isPlainObject(config) ? config[key] : config;
      if (subConfig === false) {
        locals[key] = val;
      } else if (subConfig === "atomic") {
        init[key] = val;
      } else {
        init[key] = deepLiveify(val, subConfig);
      }
    }

    const lo = new LiveObject(init);
    for (const key in locals) {
      // @ts-expect-error OptionalJsonKeys resolves to `never` for index-signature types
      lo.setLocal(key, locals[key]);
    }
    return lo;
  } else {
    return value;
  }
}

/**
 * Recursively converts all nested plain objects to LiveObjects and all nested
 * arrays to LiveLists. Expects a plain object at the top level.
 */
export function deepLiveifyObject(
  obj: JsonObject,
  config?: SyncConfig
): LiveObject<LsonObject> {
  return deepLiveify(obj, config) as LiveObject<LsonObject>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Dispatcher: given a LiveStructure and a Json value, either reconciles the
 * existing live instance in place (when types match) or creates a new
 * deep-liveified tree (when types don't match). Returns the resulting Lson.
 */
function reconcile(live: Lson, json: Json, config?: SyncMode): Lson {
  if (isLiveObject(live) && isPlainObject(json)) {
    return reconcileLiveObject(live, json, config);
  } else if (isLiveList(live) && Array.isArray(json)) {
    return reconcileLiveList(live, json, config);
  } else if (isLiveMap(live) && isPlainObject(json)) {
    return reconcileLiveMap(live, config);
  } else {
    // Type mismatch or scalar — create fresh
    return deepLiveify(json, config);
  }
}

function reconcileLiveMap(
  _liveMap: LiveMap<string, Lson>,
  _config?: SyncMode
): LiveMap<string, Lson> {
  throw new Error("Reconciling a LiveMap is not supported yet");
  // return liveMap;
}

export function reconcileLiveObject<O extends LsonObject>(
  liveObj: LiveObject<O>,
  jsonObj: JsonObject,
  config?: SyncMode
): LiveObject<O> {
  type L = O[keyof O];

  const currentKeys = liveObj.keys();

  for (const key in jsonObj) {
    currentKeys.delete(key);

    const newVal = jsonObj[key];
    if (newVal === undefined) {
      liveObj.delete(key);
      continue;
    }

    const subConfig = isPlainObject(config) ? config[key] : config;
    if (subConfig === false) {
      // @ts-expect-error OptionalJsonKeys resolves to `never` for index-signature types
      liveObj.setLocal(key, newVal);
    } else if (subConfig === "atomic") {
      const curVal = liveObj.get(key);
      if (curVal !== newVal) {
        liveObj.set(key, newVal as L);
      }
    } else {
      const curVal = liveObj.get(key);
      if (curVal === undefined) {
        // New key
        liveObj.set(key, deepLiveify(newVal, subConfig) as L);
      } else if (isLiveStructure(curVal)) {
        // Reconcile existing live structure
        const next = reconcile(curVal, newVal, subConfig);
        if (next !== curVal) {
          liveObj.set(key, next as L);
        }
      } else if (curVal !== newVal) {
        // Scalar changed
        liveObj.set(key, deepLiveify(newVal, subConfig) as L);
      }
    }
  }

  // Delete keys absent from jsonObj
  for (const key of currentKeys) {
    liveObj.delete(key);
  }

  return liveObj;
}

function reconcileLiveList<T extends Lson>(
  liveList: LiveList<T>,
  jsonArr: Json[],
  config?: SyncMode
): LiveList<T> {
  const curLen = liveList.length;
  const newLen = jsonArr.length;

  // Reconcile overlapping range
  for (let i = 0; i < Math.min(curLen, newLen); i++) {
    const curVal = liveList.get(i);
    const newVal = jsonArr[i];

    if (isLiveStructure(curVal)) {
      const next = reconcile(curVal, newVal, config);
      if (next !== curVal) {
        liveList.set(i, next as T);
      }
    } else if (curVal !== newVal) {
      liveList.set(i, deepLiveify(newVal, config) as T);
    }
  }

  // Append new elements
  for (let i = curLen; i < newLen; i++) {
    liveList.push(deepLiveify(jsonArr[i], config) as T);
  }

  // Remove excess elements from the end
  for (let i = curLen - 1; i >= newLen; i--) {
    liveList.delete(i);
  }

  return liveList;
}

export function legacy_patchLiveList<T extends Lson>(
  liveList: LiveList<T>,
  prev: Array<T>,
  next: Array<T>
): void {
  let i = 0;
  let prevEnd = prev.length - 1;
  let nextEnd = next.length - 1;

  let prevNode = prev[0];
  let nextNode = next[0];

  /**
   * For A,B,C => A,B,C,D
   * i = 3, prevEnd = 2, nextEnd = 3
   *
   * For A,B,C => B,C
   * i = 2, prevEnd = 2, nextEnd = 1
   *
   * For B,C => A,B,C
   * i = 0, pre
   */

  outer: {
    while (prevNode === nextNode) {
      ++i;
      if (i > prevEnd || i > nextEnd) {
        break outer;
      }
      prevNode = prev[i];
      nextNode = next[i];
    }

    prevNode = prev[prevEnd];
    nextNode = next[nextEnd];

    while (prevNode === nextNode) {
      prevEnd--;
      nextEnd--;

      if (i > prevEnd || i > nextEnd) {
        break outer;
      }

      prevNode = prev[prevEnd];
      nextNode = next[nextEnd];
    }
  }

  if (i > prevEnd) {
    if (i <= nextEnd) {
      while (i <= nextEnd) {
        liveList.insert(deepLiveify(next[i] as Json) as T, i);
        i++;
      }
    }
  } else if (i > nextEnd) {
    let localI = i;
    while (localI <= prevEnd) {
      liveList.delete(i);
      localI++;
    }
  } else {
    while (i <= prevEnd && i <= nextEnd) {
      prevNode = prev[i];
      nextNode = next[i];
      const liveListNode = liveList.get(i);

      if (
        isLiveObject(liveListNode) &&
        isPlainObject(prevNode) &&
        isPlainObject(nextNode)
      ) {
        legacy_patchLiveObject(liveListNode, prevNode, nextNode);
      } else {
        liveList.set(i, deepLiveify(nextNode as Json) as T);
      }

      i++;
    }
    while (i <= nextEnd) {
      liveList.insert(deepLiveify(next[i] as Json) as T, i);
      i++;
    }
    let localI = i;
    while (localI <= prevEnd) {
      liveList.delete(i);
      localI++;
    }
  }
}

export function legacy_patchLiveObjectKey<
  O extends LsonObject,
  K extends keyof O,
  V extends Json,
>(liveObject: LiveObject<O>, key: K, prev?: V, next?: V): void {
  if (process.env.NODE_ENV !== "production") {
    const nonSerializableValue = findNonSerializableValue(next);
    if (nonSerializableValue) {
      console.error(
        `New state path: '${nonSerializableValue.path}' value: '${String(
          nonSerializableValue.value
        )}' is not serializable.\nOnly serializable value can be synced with Liveblocks.`
      );
      return;
    }
  }

  const value = liveObject.get(key);

  if (next === undefined) {
    liveObject.delete(key);
  } else if (value === undefined) {
    liveObject.set(key, deepLiveify(next) as O[K]);
  } else if (prev === next) {
    return;
  } else if (isLiveList(value) && Array.isArray(prev) && Array.isArray(next)) {
    legacy_patchLiveList(value, prev, next);
  } else if (
    isLiveObject(value) &&
    isPlainObject(prev) &&
    isPlainObject(next)
  ) {
    legacy_patchLiveObject(value, prev, next);
  } else {
    liveObject.set(key, deepLiveify(next) as O[K]);
  }
}

export function legacy_patchLiveObject<O extends LsonObject>(
  root: LiveObject<O>,
  prev: ToJson<O>,
  next: ToJson<O>
): void {
  const updates: Partial<O> = {};

  for (const key in next) {
    legacy_patchLiveObjectKey(root, key, prev[key] as Json, next[key] as Json);
  }

  for (const key in prev) {
    if (next[key] === undefined) {
      root.delete(key);
    }
  }

  if (Object.keys(updates).length > 0) {
    root.update(updates);
  }
}

function getParentsPath(node: LiveNode): Array<string | number> {
  const path = [];
  while (node.parent.type === "HasParent") {
    if (isLiveList(node.parent.node)) {
      path.push(node.parent.node._indexOfPosition(node.parent.key));
    } else {
      path.push(node.parent.key);
    }
    node = node.parent.node;
  }
  return path;
}

//
// TODO: Remove `patchImmutableObject`!
//
// This helper is now only used internally, to support our Zustand and
// Redux packages. We should be able to reimplement those using the new
// `.toImmutable()` APIs.
//
export function legacy_patchImmutableObject<TState extends JsonObject>(
  state: TState,
  updates: StorageUpdate[]
): TState {
  return updates.reduce(
    (state, update) => legacy_patchImmutableObjectWithUpdate(state, update),
    state
  );
}

function legacy_patchImmutableObjectWithUpdate<TState extends JsonObject>(
  state: TState,
  update: StorageUpdate
): TState {
  const path = getParentsPath(update.node);
  return legacy_patchImmutableNode(state, path, update);
}

function legacy_patchImmutableNode<S extends Json>(
  state: S,
  path: Array<string | number>,
  update: StorageUpdate
): S {
  // FIXME: Split this function up into a few smaller ones! In each of them,
  // the types can be define much more narrowly and correctly, and there will
  // be less type shoehorning necessary.

  const pathItem = path.pop();
  if (pathItem === undefined) {
    switch (update.type) {
      case "LiveObject": {
        if (!isJsonObject(state)) {
          throw new Error(
            "Internal: received update on LiveObject but state was not an object"
          );
        }

        const newState: JsonObject = Object.assign({}, state);

        for (const key in update.updates) {
          if (update.updates[key]?.type === "update") {
            const val = update.node.get(key);
            if (val !== undefined) {
              newState[key] = lsonToJson(val);
            }
          } else if (update.updates[key]?.type === "delete") {
            delete newState[key];
          }
        }

        return newState as S;
        //              ^^^^
        //              FIXME Not completely true, because we could have been
        //              updating keys from StorageUpdate here that aren't in S,
        //              technically.
      }

      case "LiveList": {
        if (!Array.isArray(state)) {
          throw new Error(
            "Internal: received update on LiveList but state was not an array"
          );
        }

        let newState: Json[] = state.map((x: Json) => x);

        for (const listUpdate of update.updates) {
          if (listUpdate.type === "set") {
            newState = newState.map((item, index) =>
              index === listUpdate.index ? lsonToJson(listUpdate.item) : item
            );
          } else if (listUpdate.type === "insert") {
            if (listUpdate.index === newState.length) {
              newState.push(lsonToJson(listUpdate.item));
            } else {
              newState = [
                ...newState.slice(0, listUpdate.index),
                lsonToJson(listUpdate.item),
                ...newState.slice(listUpdate.index),
              ];
            }
          } else if (listUpdate.type === "delete") {
            newState.splice(listUpdate.index, 1);
          } else if (listUpdate.type === "move") {
            if (listUpdate.previousIndex > listUpdate.index) {
              newState = [
                ...newState.slice(0, listUpdate.index),
                lsonToJson(listUpdate.item),
                ...newState.slice(listUpdate.index, listUpdate.previousIndex),
                ...newState.slice(listUpdate.previousIndex + 1),
              ];
            } else {
              newState = [
                ...newState.slice(0, listUpdate.previousIndex),
                ...newState.slice(
                  listUpdate.previousIndex + 1,
                  listUpdate.index + 1
                ),
                lsonToJson(listUpdate.item),
                ...newState.slice(listUpdate.index + 1),
              ];
            }
          }
        }

        return newState as S;
        //              ^^^^
        //              FIXME Not completely true, because we could have been
        //              updating keys from StorageUpdate here that aren't in S,
        //              technically.
      }

      case "LiveMap": {
        if (!isJsonObject(state)) {
          throw new Error(
            "Internal: received update on LiveMap but state was not an object"
          );
        }
        const newState: JsonObject = Object.assign({}, state);

        for (const key in update.updates) {
          if (update.updates[key]?.type === "update") {
            const value = update.node.get(key);
            if (value !== undefined) {
              newState[key] = lsonToJson(value);
            }
          } else if (update.updates[key]?.type === "delete") {
            delete newState[key];
          }
        }

        return newState as S;
        //              ^^^^
        //              FIXME Not completely true, because we could have been
        //              updating keys from StorageUpdate here that aren't in S,
        //              technically.
      }
    }
  }

  if (Array.isArray(state)) {
    const newArray: Json[] = [...state];
    newArray[pathItem as number] = legacy_patchImmutableNode(
      state[pathItem as number],
      path,
      update
    );
    return newArray as S;
    //              ^^^^
    //              FIXME Not completely true, because we could have been
    //              updating indexes from StorageUpdate here that aren't in S,
    //              technically.
  } else if (isJsonObject(state)) {
    const node = state[pathItem];
    if (node === undefined) {
      return state;
    } else {
      const stateAsObj: JsonObject = state;
      return {
        ...stateAsObj,
        [pathItem]: legacy_patchImmutableNode(node, path, update),
      } as S;
      //   ^
      //   FIXME Not completely true, because we could have been updating
      //   indexes from StorageUpdate here that aren't in S, technically.
    }
  } else {
    return state;
  }
}
