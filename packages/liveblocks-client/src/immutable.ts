import { AbstractCrdt } from "./AbstractCrdt";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import { Lson, LsonObject } from "./lson";
import { Json } from "./json";
import { StorageUpdate } from "./types";
import { findNonSerializableValue } from "./utils";

function lsonObjectToJson<O extends LsonObject>(
  obj: O
): { [K in keyof O]: Json } {
  const result: { [K in keyof O]: Json } = {} as any;
  for (const key in obj) {
    result[key] = lsonToJson(obj[key]);
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
  const result: { [K in TKey]: Json } = {} as any;
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

export function lsonToJson(value: Lson | AbstractCrdt): Json {
  //                                     ^^^^^^^^^^^^
  //                                     FIXME: Remove me later. This requires the
  //                                     addition of a concrete LiveValue type first.

  // Check for LiveXxx datastructures first
  if (value instanceof LiveObject) {
    return liveObjectToJson(value);
  } else if (value instanceof LiveList) {
    return liveListToJson(value);
  } else if (value instanceof LiveMap) {
    return liveMapToJson(value);
  } else if (value instanceof LiveRegister) {
    return value.data;
  } else if (value instanceof AbstractCrdt) {
    // This code path should never be taken
    throw new Error("Unhandled subclass of AbstractCrdt encountered");
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

function isPlainObject(obj: unknown): obj is { [key: string]: unknown } {
  return (
    obj !== null && Object.prototype.toString.call(obj) === "[object Object]"
  );
}

function anyToCrdt(obj: unknown): any {
  //                              ^^^ AbstractCrdt?
  if (obj == null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return new LiveList(obj.map(anyToCrdt));
  }
  if (isPlainObject(obj)) {
    const init: LsonObject = {};
    for (const key in obj) {
      init[key] = anyToCrdt(obj[key]);
    }
    return new LiveObject(init);
  }
  return obj;
}

export function patchLiveList<T extends Lson>(
  liveList: LiveList<T>,
  prev: Array<T>,
  next: Array<T>
) {
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
        liveList.insert(anyToCrdt(next[i]), i);
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
        liveListNode instanceof LiveObject &&
        isPlainObject(prevNode) &&
        isPlainObject(nextNode)
      ) {
        patchLiveObject(liveListNode, prevNode, nextNode);
      } else {
        liveList.delete(i);
        liveList.insert(anyToCrdt(nextNode), i);
      }

      i++;
    }
    while (i <= nextEnd) {
      liveList.insert(anyToCrdt(next[i]), i);
      i++;
    }
    while (i <= prevEnd) {
      liveList.delete(i);
      i++;
    }
  }
}

export function patchLiveObjectKey<T extends LsonObject>(
  liveObject: LiveObject<T>,
  key: keyof T,
  prev: any,
  next: any
) {
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
    liveObject.set(key, anyToCrdt(next));
  } else if (prev === next) {
    return;
  } else if (
    value instanceof LiveList &&
    Array.isArray(prev) &&
    Array.isArray(next)
  ) {
    patchLiveList(value, prev, next);
  } else if (
    value instanceof LiveObject &&
    isPlainObject(prev) &&
    isPlainObject(next)
  ) {
    patchLiveObject(value, prev, next);
  } else {
    liveObject.set(key, anyToCrdt(next));
  }
}

export function patchLiveObject<T extends LsonObject>(
  root: LiveObject<T>,
  prev: T,
  next: T
) {
  const updates: Partial<T> = {};

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

function getParentsPath(node: AbstractCrdt): Array<string | number> {
  const path = [];
  while (node._parentKey != null && node._parent != null) {
    if (node._parent instanceof LiveList) {
      path.push(node._parent._indexOfPosition(node._parentKey));
    } else {
      path.push(node._parentKey);
    }
    node = node._parent;
  }
  return path;
}

export function patchImmutableObject<T>(state: T, updates: StorageUpdate[]): T {
  return updates.reduce(
    (state, update) => patchImmutableObjectWithUpdate(state, update),
    state
  );
}

function patchImmutableObjectWithUpdate<T>(state: T, update: StorageUpdate): T {
  const path = getParentsPath(update.node);
  return patchImmutableNode(state, path, update);
}

function patchImmutableNode(
  state: any,
  path: Array<string | number>,
  update: StorageUpdate
): any {
  const pathItem = path.pop();
  if (pathItem === undefined) {
    switch (update.type) {
      case "LiveObject": {
        if (typeof state !== "object") {
          throw new Error(
            "Internal: received update on LiveObject but state was not an object"
          );
        }
        const newState = Object.assign({}, state);

        for (const key in update.updates) {
          if (update.updates[key]?.type === "update") {
            newState[key] = lsonToJson(update.node.get(key));
          } else if (update.updates[key]?.type === "delete") {
            delete newState[key];
          }
        }

        return newState;
      }
      case "LiveList": {
        if (Array.isArray(state) === false) {
          throw new Error(
            "Internal: received update on LiveList but state was not an array"
          );
        }

        let newState: any[] = state.map((x: any) => x);

        for (const listUpdate of update.updates) {
          if (listUpdate.type === "insert") {
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

        return newState;
      }
      case "LiveMap": {
        if (typeof state !== "object") {
          throw new Error(
            "Internal: received update on LiveMap but state was not an object"
          );
        }
        const newState = Object.assign({}, state);

        for (const key in update.updates) {
          if (update.updates[key]?.type === "update") {
            newState[key] = lsonToJson(update.node.get(key)!);
          } else if (update.updates[key]?.type === "delete") {
            delete newState[key];
          }
        }

        return newState;
      }
    }
  }

  if (Array.isArray(state)) {
    const newArray = [...state];
    newArray[pathItem as number] = patchImmutableNode(
      state[pathItem as number],
      path,
      update
    );
    return newArray;
  } else {
    return {
      ...state,
      [pathItem]: patchImmutableNode(state[pathItem], path, update),
    };
  }
}
