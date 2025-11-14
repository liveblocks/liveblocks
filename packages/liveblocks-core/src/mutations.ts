import { createManagedPool } from "./crdts/AbstractCrdt";
import {
  isLiveList,
  isLiveMap,
  isLiveNode,
  isLiveObject,
} from "./crdts/liveblocks-helpers";
import type { LiveList } from "./crdts/LiveList";
import type { LiveMap } from "./crdts/LiveMap";
import { LiveObject } from "./crdts/LiveObject";
import type { Lson, LsonObject } from "./crdts/Lson";
import { _deepLiveify } from "./immutable";
import { isPlainObject } from "./lib/guards";
import type { Json, JsonObject } from "./lib/Json";
import type { Op } from "./protocol/Op";
import type { IdTuple, SerializedCrdt } from "./protocol/SerializedCrdt";

/**
 * Generates operations to mutate an existing Live storage structure.
 *
 * This function attempts to merge mutation data into an existing Live structure,
 * preserving nested LiveObjects, LiveMaps, and LiveLists. For example, if you have
 * a LiveObject with a nested LiveObject (engine), and you pass a plain object
 * mutation, it will preserve the nested LiveObject structure and only update the
 * specified fields.
 *
 * @param nodes - The existing storage nodes as IdTuple<SerializedCrdt>[]
 * @param mutation - The mutation data (can be partial JSON or LSON)
 * @returns Array of operations that can be applied to achieve the mutation
 *
 * @example
 * ```typescript
 * const nodes: IdTuple<SerializedCrdt>[] = [
 *   ["0:0", { type: CrdtType.OBJECT, data: {} }],
 *   ["0:1", { type: CrdtType.OBJECT, data: { displacement: 1 }, parentId: "0:0", parentKey: "engine" }]
 * ];
 *
 * const ops = generateOpsFromJson(nodes, {
 *   engine: { displacement: 2 } // Preserves engine as LiveObject, only updates displacement
 * });
 * ```
 */
export function generateOpsFromJson<S extends LsonObject>(
  nodes: IdTuple<SerializedCrdt>[],
  mutation: Partial<S> | Json
): Op[] {
  const capturedOps: Op[] = [];

  // Create a temporary pool that captures all dispatched ops
  const pool = createManagedPool("mutation-temp", {
    getCurrentConnectionId: () => 1,
    onDispatch: (ops) => {
      capturedOps.push(...ops);
    },
  });

  // Build the Live tree from the existing nodes
  const root = LiveObject._fromItems<S>(nodes, pool);

  // Apply the mutation recursively
  if (isPlainObject(mutation)) {
    applyMutationToLiveObject(root, mutation as Partial<LsonObject>);
  } else {
    // For non-object mutations, we can't merge into root
    throw new Error(
      "Root mutation must be an object. Use a nested key to update specific values."
    );
  }

  return capturedOps;
}

/**
 * Recursively applies mutation data to a LiveObject, preserving nested Live structures.
 */
function applyMutationToLiveObject(
  target: LiveObject<LsonObject>,
  mutation: Partial<LsonObject>
): void {
  for (const key in mutation) {
    const mutationValue = mutation[key];
    if (mutationValue === undefined) {
      continue;
    }

    const existingValue = target.get(key);

    // IMPORTANT: Check for LiveNode first, before isPlainObject check
    // because isPlainObject can return true for LiveObject instances
    // If mutation value is a LiveNode (LiveObject/LiveMap/LiveList), replace it directly
    if (isLiveNode(mutationValue)) {
      target.set(key, mutationValue as Lson);
      continue;
    }

    // If existing value is a LiveObject and mutation is a plain object, recurse
    if (isLiveObject(existingValue) && isPlainObject(mutationValue)) {
      applyMutationToLiveObject(
        existingValue,
        mutationValue as Partial<LsonObject>
      );
    }
    // If existing value is a LiveMap and mutation is a plain object, recurse
    else if (isLiveMap(existingValue) && isPlainObject(mutationValue)) {
      applyMutationToLiveMap(existingValue, mutationValue);
    }
    // If existing value is a LiveList and mutation is an array, replace items
    else if (isLiveList(existingValue) && Array.isArray(mutationValue)) {
      applyMutationToLiveList(existingValue, mutationValue);
    }
    // If no existing value but mutation is a plain object, create a LiveObject
    // Recursively convert nested objects to LiveObjects
    else if (existingValue === undefined && isPlainObject(mutationValue)) {
      const convertedValue = _deepLiveify(mutationValue as LsonObject);
      target.set(key, convertedValue);
    }
    // Otherwise, set/replace the value (this will generate ops)
    else {
      target.set(key, mutationValue as Lson);
    }
  }
}

/**
 * Recursively applies mutation data to a LiveMap, preserving nested Live structures.
 */
function applyMutationToLiveMap(
  target: LiveMap<string, Lson>,
  mutation: JsonObject
): void {
  for (const key in mutation) {
    const mutationValue = mutation[key];
    if (mutationValue === undefined) {
      continue;
    }

    const existingValue = target.get(key);

    // IMPORTANT: Check for LiveNode first, before isPlainObject check
    // because isPlainObject can return true for LiveObject instances
    if (isLiveNode(mutationValue)) {
      target.set(key, mutationValue as Lson);
      continue;
    }

    // If existing value is a LiveObject and mutation is a plain object, recurse
    if (isLiveObject(existingValue) && isPlainObject(mutationValue)) {
      applyMutationToLiveObject(
        existingValue,
        mutationValue as Partial<LsonObject>
      );
    }
    // If existing value is a LiveMap and mutation is a plain object, recurse
    else if (isLiveMap(existingValue) && isPlainObject(mutationValue)) {
      applyMutationToLiveMap(existingValue, mutationValue);
    }
    // If existing value is a LiveList and mutation is an array, replace items
    else if (isLiveList(existingValue) && Array.isArray(mutationValue)) {
      applyMutationToLiveList(existingValue, mutationValue);
    }
    // If no existing value but mutation is a plain object, create a LiveObject
    // Recursively convert nested objects to LiveObjects
    else if (existingValue === undefined && isPlainObject(mutationValue)) {
      const convertedValue = _deepLiveify(mutationValue as LsonObject);
      target.set(key, convertedValue);
    }
    // Otherwise, set/replace the value
    else {
      const newValue: Lson = isLiveNode(mutationValue)
        ? mutationValue
        : (mutationValue as Lson);

      target.set(key, newValue);
    }
  }
}

/**
 * Applies mutation to a LiveList by replacing all items.
 */
function applyMutationToLiveList(
  target: LiveList<Lson>,
  mutation: unknown[]
): void {
  // Clear existing items
  target.clear();

  // Add new items
  for (const item of mutation) {
    // Convert to Lson (LiveList.push accepts Lson, which gets converted to LiveNode internally)
    const liveItem: Lson = isLiveNode(item)
      ? (item as unknown as Lson) // LiveNode (including LiveRegister) needs cast to Lson
      : (item as Lson);
    target.push(liveItem);
  }
}
