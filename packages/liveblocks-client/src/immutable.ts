import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import type { Json, Lson, LsonObject } from "./types";
import type { ToJson } from "./types/Lson";
import {
  findNonSerializableValue,
  isLiveList,
  isLiveObject,
  isPlainObject,
} from "./utils";

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
    return value.data;
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
 * Deeply converts all nested lists to LiveLists, and all nested objects to
 * LiveObjects.
 *
 * As such, the returned result will not contain any Json arrays or Json
 * objects anymore.
 */
function deepLiveify(value: Lson | LsonObject): Lson {
  if (Array.isArray(value)) {
    return new LiveList(value.map(deepLiveify));
  } else if (isPlainObject(value)) {
    const init: LsonObject = {};
    for (const key in value) {
      const val = value[key];
      if (val === undefined) {
        continue;
      }
      init[key] = deepLiveify(val);
    }
    return new LiveObject(init);
  } else {
    return value;
  }
}

export function patchLiveList<T extends Lson>(
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
        liveList.insert(deepLiveify(next[i]) as T, i);
        //                                   ^^^^ FIXME Not entirely true
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
        patchLiveObject(liveListNode, prevNode, nextNode);
      } else {
        liveList.set(i, deepLiveify(nextNode) as T);
        //                                    ^^^^ FIXME Not entirely true
      }

      i++;
    }
    while (i <= nextEnd) {
      liveList.insert(deepLiveify(next[i]) as T, i);
      //                                   ^^^^ FIXME Not entirely true
      i++;
    }
    let localI = i;
    while (localI <= prevEnd) {
      liveList.delete(i);
      localI++;
    }
  }
}

export function patchLiveObjectKey<
  O extends LsonObject,
  K extends keyof O,
  V extends Lson
>(liveObject: LiveObject<O>, key: K, prev?: V, next?: V): void {
  if (process.env.NODE_ENV !== "production") {
    const nonSerializableValue = findNonSerializableValue(next);
    if (nonSerializableValue) {
      console.error(
        `New state path: '${nonSerializableValue.path}' value: '${nonSerializableValue.value}' is not serializable.\nOnly serializable value can be synced with Liveblocks.`
      );
      return;
    }
  }

  const value = liveObject.get(key);

  if (next === undefined) {
    liveObject.delete(key);
  } else if (value === undefined) {
    liveObject.set(key, deepLiveify(next) as O[K]);
    //                                    ^^^^^^^ FIXME Not entirely true
  } else if (prev === next) {
    return;
  } else if (isLiveList(value) && Array.isArray(prev) && Array.isArray(next)) {
    patchLiveList(value, prev, next);
  } else if (
    isLiveObject(value) &&
    isPlainObject(prev) &&
    isPlainObject(next)
  ) {
    patchLiveObject(value, prev, next);
  } else {
    liveObject.set(key, deepLiveify(next) as O[K]);
    //                                    ^^^^^^^ FIXME Not entirely true
  }
}

export function patchLiveObject<O extends LsonObject>(
  root: LiveObject<O>,
  prev: ToJson<O>,
  next: ToJson<O>
): void {
  const updates: Partial<O> = {};

  for (const key in next) {
    patchLiveObjectKey(root, key, prev[key], next[key]);
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
