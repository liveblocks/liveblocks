/**
 * Translates a WASM MutationResult into the arguments needed by pool.dispatch().
 *
 * This is the bridge between Rust handle mutations (which return MutationResult)
 * and the JS dispatch pipeline (which expects ClientWireOp[], Op[], and
 * Map<string, StorageUpdate>).
 */

import type { ClientWireOp, CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { ManagedPool } from "./AbstractCrdt";
import { LiveRegister } from "./LiveRegister";
import type { LiveNode } from "./Lson";
import type { StorageUpdate } from "./StorageUpdates";

/** Shape of the WASM MutationResult after serde-wasm-bindgen deserialization */
export interface WasmMutationResult {
  ops: Op[];
  reverseOps: Op[];
  update: WasmStorageUpdate;
}

/** Discriminated union matching Rust's StorageUpdate enum (tag = "type") */
export type WasmStorageUpdate =
  | {
      type: "liveObjectUpdate";
      nodeId: string;
      updates: Record<string, WasmUpdateDelta>;
    }
  | {
      type: "liveListUpdate";
      nodeId: string;
      updates: WasmListUpdateEntry[];
    }
  | {
      type: "liveMapUpdate";
      nodeId: string;
      updates: Record<string, WasmUpdateDelta>;
    };

export type WasmUpdateDelta =
  | { type: "set"; oldValue: unknown; newValue: unknown }
  | { type: "delete"; oldValue: unknown; deletedId?: string };

export type WasmListUpdateEntry =
  | { type: "insert"; index: number; value: unknown }
  | { type: "delete"; index: number; oldValue: unknown }
  | { type: "move"; previousIndex: number; newIndex: number; value: unknown }
  | { type: "set"; index: number; oldValue: unknown; newValue: unknown };

/**
 * Convert a WASM MutationResult into the three arguments for pool.dispatch().
 */
export function dispatchMutationResult(
  result: WasmMutationResult,
  pool: ManagedPool
): void {
  const ops = result.ops as ClientWireOp[];
  const reverseOps = result.reverseOps;
  const storageUpdates = translateStorageUpdate(result.update, pool);
  pool.dispatch(ops, reverseOps, storageUpdates);
}

export function translateStorageUpdate(
  wasmUpdate: WasmStorageUpdate,
  pool: ManagedPool,
  deletedNodes?: Map<string, LiveNode>
): Map<string, StorageUpdate> {
  const map = new Map<string, StorageUpdate>();
  const node = pool.getNode(wasmUpdate.nodeId);
  if (!node) return map;

  switch (wasmUpdate.type) {
    case "liveObjectUpdate": {
      const updates: Record<
        string,
        { type: "update" } | { type: "delete"; deletedItem: unknown }
      > = {};
      for (const [key, delta] of Object.entries(wasmUpdate.updates)) {
        if (delta.type === "set") {
          updates[key] = { type: "update" };
        } else {
          // If the deleted child was a CRDT node, look up the actual LiveNode
          // wrapper so subscribers see LiveList/LiveObject/LiveMap.
          // Check the pre-collected deletedNodes map first (node may have been
          // detached from the pool by syncJsTreeFromRustResult).
          const deletedItem =
            delta.deletedId != null
              ? deletedNodes?.get(delta.deletedId) ??
                pool.getNode(delta.deletedId) ??
                delta.oldValue
              : delta.oldValue;
          updates[key] = { type: "delete", deletedItem };
        }
      }
      map.set(wasmUpdate.nodeId, {
        type: "LiveObject",
        node,
        updates,
      } as StorageUpdate);
      break;
    }
    case "liveListUpdate": {
      const updates = wasmUpdate.updates.map((entry) => {
        switch (entry.type) {
          case "insert":
            return {
              type: "insert" as const,
              index: entry.index,
              item: getListItemImmutable(node, entry.index),
            };
          case "delete":
            return {
              type: "delete" as const,
              index: entry.index,
              deletedItem: entry.oldValue,
            };
          case "move":
            return {
              type: "move" as const,
              index: entry.newIndex,
              previousIndex: entry.previousIndex,
              item: getListItemImmutable(node, entry.newIndex),
            };
          case "set":
            return {
              type: "set" as const,
              index: entry.index,
              item: getListItemImmutable(node, entry.index),
            };
        }
      });
      map.set(wasmUpdate.nodeId, {
        type: "LiveList",
        node,
        updates,
      } as StorageUpdate);
      break;
    }
    case "liveMapUpdate": {
      const updates: Record<
        string,
        { type: "update" } | { type: "delete"; deletedItem: unknown }
      > = {};
      for (const [key, delta] of Object.entries(wasmUpdate.updates)) {
        if (delta.type === "set") {
          updates[key] = { type: "update" };
        } else {
          const deletedItem =
            delta.deletedId != null
              ? deletedNodes?.get(delta.deletedId) ??
                pool.getNode(delta.deletedId) ??
                delta.oldValue
              : delta.oldValue;
          updates[key] = { type: "delete", deletedItem };
        }
      }
      map.set(wasmUpdate.nodeId, {
        type: "LiveMap",
        node,
        updates,
      } as StorageUpdate);
      break;
    }
  }
  return map;
}

/**
 * After WASM generates CREATE ops for a nested CRDT subtree, attach the
 * user-provided LiveNode instances to the pool using the IDs from those ops.
 *
 * The ops are in pre-order DFS order. We walk the user's LiveNode tree in
 * the same order, matching each op by parentId + parentKey.
 *
 * For the root of the subtree, the first op with
 * `parentId === expectedParentId && parentKey === expectedParentKey`
 * is used. Children are matched recursively.
 */
export function attachSubtreeFromOps(
  ops: Op[],
  rootNode: LiveNode,
  pool: ManagedPool,
  expectedParentId: string,
  expectedParentKey: string
): void {
  // Build a map from parentId+parentKey → op for quick lookup
  const createOps = ops.filter(
    (op): op is CreateOp =>
      op.type === OpCode.CREATE_OBJECT ||
      op.type === OpCode.CREATE_LIST ||
      op.type === OpCode.CREATE_MAP ||
      op.type === OpCode.CREATE_REGISTER
  );

  // Find the root op
  const rootOp = createOps.find(
    (op) => op.parentId === expectedParentId && op.parentKey === expectedParentKey
  );
  if (!rootOp) return;

  // Attach root
  rootNode._attachDirect(rootOp.id, pool);

  // Recursively attach children
  attachChildrenFromOps(createOps, rootNode, rootOp.id, pool);
}

function attachChildrenFromOps(
  ops: CreateOp[],
  parentNode: LiveNode,
  parentId: string,
  pool: ManagedPool
): void {
  // Find all ops whose parentId matches
  const childOps = ops.filter((op) => op.parentId === parentId);

  // Get the children of the parent LiveNode by iterating its internal structure
  const children = getLiveNodeChildren(parentNode);

  // For LiveList, keys from _getInternalChildren are indices ("0","1",...) while
  // WASM ops use fractional positions as parentKey.  Match by order instead.
  const isListParent =
    "length" in parentNode &&
    typeof (parentNode as { get?(i: number): unknown }).get === "function";

  if (isListParent) {
    // Match LiveList children in order: i-th child op → i-th child node
    for (let i = 0; i < childOps.length && i < children.length; i++) {
      const childOp = childOps[i];
      const [, childNode] = children[i];

      childNode._attachDirect(childOp.id, pool);
      attachChildrenFromOps(ops, childNode, childOp.id, pool);
    }
  } else {
    // Match by parentKey (works for LiveObject and LiveMap)
    for (const childOp of childOps) {
      const childEntry = children.find(([key]) => key === childOp.parentKey);
      if (!childEntry) continue;

      const [, childNode] = childEntry;

      childNode._attachDirect(childOp.id, pool);
      attachChildrenFromOps(ops, childNode, childOp.id, pool);
    }
  }
}

/**
 * Get the immutable value of a list item at a given index.
 * Uses duck-typing to avoid importing LiveList (which would create circular deps).
 */
function getListItemImmutable(node: LiveNode, index: number): unknown {
  const list = node as unknown as { get?(i: number): unknown };
  if (typeof list.get === "function") {
    const item = list.get(index);
    if (item !== null && item !== undefined && typeof (item as { toImmutable?(): unknown }).toImmutable === "function") {
      return (item as { toImmutable(): unknown }).toImmutable();
    }
    return item;
  }
  return null;
}

/**
 * Extract the children of a LiveNode as [key, LiveNode] pairs.
 * Uses the `_getInternalChildren()` method to access raw LiveNode values
 * including LiveRegister wrappers (which are invisible through public APIs).
 */
function getLiveNodeChildren(node: LiveNode): [string, LiveNode][] {
  if (node instanceof LiveRegister) {
    return [];
  }
  return (node as LiveNode)._getInternalChildren();
}
