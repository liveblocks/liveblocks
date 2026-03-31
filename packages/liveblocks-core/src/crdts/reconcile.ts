import {
  isLiveList,
  isLiveMap,
  isLiveObject,
  isLiveStructure,
} from "./liveblocks-helpers";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";
import { isPlainObject } from "../lib/guards";
import type { Json, JsonObject } from "../lib/Json";

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
export function deepLiveify(value: Json, config?: SyncMode): Lson {
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
