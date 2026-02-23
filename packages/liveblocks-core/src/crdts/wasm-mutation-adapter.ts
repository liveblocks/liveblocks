/**
 * Translates a WASM MutationResult into the arguments needed by pool.dispatch().
 *
 * This is the bridge between Rust handle mutations (which return MutationResult)
 * and the JS dispatch pipeline (which expects ClientWireOp[], Op[], and
 * Map<string, StorageUpdate>).
 */

import type { ClientWireOp, Op } from "../protocol/Op";
import type { ManagedPool } from "./AbstractCrdt";
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
              item: getListItem(node, entry.index),
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
              item: getListItem(node, entry.newIndex),
            };
          case "set":
            return {
              type: "set" as const,
              index: entry.index,
              item: getListItem(node, entry.index),
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
 * Get the list item at a given index as a LiveNode reference or scalar.
 * Returns the item directly (not its immutable snapshot) so that subscribers
 * who call toImmutable() later see the final state after all ops in a batch
 * have been applied.
 * Uses duck-typing to avoid importing LiveList (which would create circular deps).
 */
function getListItem(node: LiveNode, index: number): unknown {
  const list = node as unknown as { get?(i: number): unknown };
  if (typeof list.get === "function") {
    return list.get(index);
  }
  return null;
}
