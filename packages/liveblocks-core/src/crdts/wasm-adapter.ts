/**
 * WASM adapter for CRDT operations.
 *
 * Provides WASM-accelerated versions of computation-heavy CRDT functions,
 * with a pure-JS fallback when WASM is unavailable.
 *
 * IMPORTANT: `initWasmAdapter()` MUST be awaited at application startup
 * before any CRDT operations are used. The engine choice (WASM or JS) is
 * made once when initialization settles, and is permanent for the lifetime
 * of the process. There is no background loading — the caller must
 * explicitly await initialization.
 *
 * The adapter does NOT modify any existing classes (LiveObject, LiveList,
 * LiveMap) — it only wraps the standalone computation functions.
 */

import type { Pos } from "../lib/position";
import { makePosition as jsMakePosition } from "../lib/position";
import type { Op } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import type { NodeMap } from "../types/NodeMap";
import type {
  CrdtDocumentShadow,
  CrdtEngine,
  RoomStorageEngineJS,
} from "./impl-selector";
import {
  _resetForTesting,
  _setEngine,
  getEngine,
  initWasm,
  isWasmAvailable,
  isWasmReady,
} from "./impl-selector";
import { getTreesDiffOperations as jsGetTreesDiffOperations } from "./liveblocks-helpers";

/**
 * The JS-backed engine, wrapping the existing pure-TypeScript implementations.
 * Used as the fallback when WASM is unavailable.
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
 * Initialize the WASM adapter. MUST be awaited at application startup
 * before any CRDT operations are used.
 *
 * Attempts to load the WASM module. If WASM is unavailable or fails to
 * load, the JS fallback is locked in permanently.
 *
 * Safe to call multiple times — subsequent calls return the cached result.
 *
 * @returns true if WASM was loaded successfully, false if using JS fallback.
 */
export async function initWasmAdapter(): Promise<boolean> {
  return initWasm();
}

/**
 * Compute a fractional position string between two optional bounds.
 * Delegates to whichever engine was selected at init time (WASM or JS).
 *
 * The returned string is compatible with the existing `Pos` branded type.
 */
export function makePosition(before?: Pos, after?: Pos): Pos {
  return getEngine(jsEngine).makePosition(before, after) as Pos;
}

/**
 * Compute diff operations between two serialized CRDT snapshots.
 * Delegates to whichever engine was selected at init time (WASM or JS).
 *
 * Returns ops for:
 * - DELETE_CRDT: nodes in current but not in new
 * - CREATE_*: nodes in new but not in current
 * - UPDATE_OBJECT: objects whose data changed
 * - SET_PARENT_KEY: nodes whose position changed
 */
export function getTreesDiffOperations(
  currentItems: NodeMap,
  newItems: NodeMap
): Op[] {
  return getEngine(jsEngine).getTreesDiffOperations(currentItems, newItems);
}

/**
 * Deserialize a storage snapshot (array of [id, SerializedCrdt] tuples) into
 * a NodeMap. Delegates to whichever engine was selected at init time.
 */
export function deserializeItems(
  items: IdTuple<SerializedCrdt>[]
): NodeMap {
  return getEngine(jsEngine).deserializeItems(items);
}

/**
 * Create a persistent document shadow for fast reconnect diffs.
 * Returns null if the active engine doesn't support it (JS fallback).
 */
export function createDocumentShadow(): CrdtDocumentShadow | null {
  const engine = getEngine(jsEngine);
  return engine.createDocumentShadow?.() ?? null;
}

/**
 * Get the name of the active backend ("wasm" or "js").
 * Useful for diagnostics and logging.
 */
export function getBackend(): "wasm" | "js" {
  return getEngine(jsEngine).backend;
}

/**
 * Create a WASM-backed room storage engine.
 * Returns null if the active engine doesn't support it (JS fallback).
 */
export function createStorageEngine(): RoomStorageEngineJS | null {
  const engine = getEngine(jsEngine);
  return engine.createStorageEngine?.() ?? null;
}

// Re-export utilities from impl-selector for convenience
export { _resetForTesting,_setEngine, isWasmAvailable, isWasmReady };
export type { CrdtDocumentShadow, CrdtEngine, RoomStorageEngineJS };
