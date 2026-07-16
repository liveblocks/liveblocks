import { entries } from "../lib/utils";
import type { LiveListUpdates } from "./LiveList";
import type { LiveMapUpdates } from "./LiveMap";
import type { LiveObjectUpdates } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";
import type { StorageUpdate } from "./StorageUpdates";

function mergeObjectStorageUpdates<A extends LsonObject, B extends LsonObject>(
  first: LiveObjectUpdates<A>,
  second: LiveObjectUpdates<B>
): LiveObjectUpdates<B> {
  const updates = first.updates as (typeof second)["updates"];
  for (const [key, value] of entries(second.updates)) {
    updates[key] = value;
  }
  return {
    ...second,
    updates,
  };
}

function mergeMapStorageUpdates<K2 extends string, V2 extends Lson>(
  first: LiveMapUpdates<string, Lson>,
  second: LiveMapUpdates<K2, V2>
): LiveMapUpdates<K2, V2> {
  const updates = first.updates;
  for (const [key, value] of entries(second.updates)) {
    updates[key] = value;
  }
  return {
    ...second,
    updates,
  };
}

function mergeListStorageUpdates<T extends Lson>(
  first: LiveListUpdates<Lson>,
  second: LiveListUpdates<T>
): LiveListUpdates<T> {
  const updates = first.updates;
  return {
    ...second,
    updates: updates.concat(second.updates),
  };
}

export function mergeStorageUpdates(
  first: StorageUpdate | undefined,
  second: StorageUpdate
): StorageUpdate {
  if (first === undefined) {
    return second;
  }

  if (first.type === "LiveObject" && second.type === "LiveObject") {
    return mergeObjectStorageUpdates(first, second);
  } else if (first.type === "LiveMap" && second.type === "LiveMap") {
    return mergeMapStorageUpdates(first, second);
  } else if (first.type === "LiveList" && second.type === "LiveList") {
    return mergeListStorageUpdates(first, second);
  }

  return second;
}
