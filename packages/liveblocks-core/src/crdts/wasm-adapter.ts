/**
 * WASM adapter for CRDT operations.
 *
 * Provides a unified interface that delegates to whichever engine is active
 * (JS by default, or WASM if explicitly set via `_setEngine()`).
 *
 * The engine choice is binary and explicit:
 * - Default: JS (no configuration needed)
 * - WASM: set at startup via `_setEngine()` — it works or it fails
 *
 * There is no fallback, no auto-detection, and no graceful degradation.
 */

import type { Pos } from "../lib/position";
import { makePosition as jsMakePosition } from "../lib/position";
import type { Op } from "../protocol/Op";
import type { IdTuple, NodeMap, SerializedCrdt } from "../protocol/StorageNode";
import type {
  CrdtDocumentShadow,
  CrdtEngine,
  RoomStorageEngineJS,
} from "./impl-selector";
import {
  _setEngine,
  getEngine,
} from "./impl-selector";
import { getTreesDiffOperations as jsGetTreesDiffOperations } from "./liveblocks-helpers";

/**
 * The JS engine, wrapping the existing pure-TypeScript implementations.
 * Used when WASM is not explicitly configured.
 */
const jsEngine: CrdtEngine = {
  backend: "js",

  makePosition(before?: string, after?: string): string {
    return jsMakePosition(before as Pos | undefined, after as Pos | undefined);
  },

  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[] {
    return jsGetTreesDiffOperations(currentItems, newItems);
  },

  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
    return new Map(items);
  },
};

/**
 * Compute a fractional position string between two optional bounds.
 * Delegates to whichever engine is active (WASM or JS).
 */
export function makePosition(before?: Pos, after?: Pos): Pos {
  return getEngine(jsEngine).makePosition(before, after) as Pos;
}

/**
 * Compute diff operations between two serialized CRDT snapshots.
 * Delegates to whichever engine is active (WASM or JS).
 */
export function getTreesDiffOperations(
  currentItems: NodeMap,
  newItems: NodeMap
): Op[] {
  return getEngine(jsEngine).getTreesDiffOperations(currentItems, newItems);
}

/**
 * Deserialize a storage snapshot (array of [id, SerializedCrdt] tuples) into
 * a NodeMap. Delegates to whichever engine is active.
 */
export function deserializeItems(
  items: IdTuple<SerializedCrdt>[]
): NodeMap {
  return getEngine(jsEngine).deserializeItems(items);
}

/**
 * Create a persistent document shadow for fast reconnect diffs.
 * Returns null if the active engine doesn't support it (JS engine).
 */
export function createDocumentShadow(): CrdtDocumentShadow | null {
  const engine = getEngine(jsEngine);
  return engine.createDocumentShadow?.() ?? null;
}

/**
 * Get the name of the active backend ("wasm" or "js").
 */
export function getBackend(): "wasm" | "js" {
  return getEngine(jsEngine).backend;
}

/**
 * Create a WASM-backed room storage engine.
 * Returns null if the active engine doesn't support it (JS engine).
 */
export function createStorageEngine(): RoomStorageEngineJS | null {
  const engine = getEngine(jsEngine);
  return engine.createStorageEngine?.() ?? null;
}

// Re-export for test setup
export { _setEngine };
export type { CrdtDocumentShadow, CrdtEngine, RoomStorageEngineJS };
