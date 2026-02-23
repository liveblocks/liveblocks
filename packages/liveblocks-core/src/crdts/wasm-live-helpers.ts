/**
 * Shared helpers for WASM-backed LiveNode types.
 *
 * Provides entry resolution: converting CrdtEntry values returned by the
 * WASM CrdtDocumentOwner into JS values (scalars as-is, child nodes
 * wrapped in the appropriate WasmLive* class).
 */

import type { CrdtDocumentOwner, CrdtEntry } from "./impl-selector";
import type { Lson } from "./Lson";

// Lazy imports to avoid circular dependencies — resolved on first use.
let _WasmLiveObject: WasmLiveNodeConstructor | null = null;
let _WasmLiveList: WasmLiveNodeConstructor | null = null;
let _WasmLiveMap: WasmLiveNodeConstructor | null = null;

type WasmLiveNodeConstructor = new (
  owner: CrdtDocumentOwner,
  nodeId: string
) => unknown;

export function _registerWasmLiveTypes(
  obj: WasmLiveNodeConstructor,
  list: WasmLiveNodeConstructor,
  map: WasmLiveNodeConstructor
): void {
  _WasmLiveObject = obj;
  _WasmLiveList = list;
  _WasmLiveMap = map;
}

/**
 * Resolve a CrdtEntry returned by the WASM owner into a JS value.
 * - Scalar entries are returned as-is.
 * - Node entries are wrapped in the appropriate WasmLive* class.
 */
export function resolveEntry(
  owner: CrdtDocumentOwner,
  entry: CrdtEntry
): Lson {
  if (entry.type === "scalar") {
    return entry.value as Lson;
  }

  // Node entry — wrap in the appropriate WasmLive* class
  switch (entry.nodeType) {
    case "LiveObject":
      if (!_WasmLiveObject) throw new Error("WasmLiveObject not registered");
      return new _WasmLiveObject(owner, entry.nodeId) as Lson;
    case "LiveList":
      if (!_WasmLiveList) throw new Error("WasmLiveList not registered");
      return new _WasmLiveList(owner, entry.nodeId) as Lson;
    case "LiveMap":
      if (!_WasmLiveMap) throw new Error("WasmLiveMap not registered");
      return new _WasmLiveMap(owner, entry.nodeId) as Lson;
    default:
      throw new Error(`Unknown WASM node type: ${entry.nodeType}`);
  }
}
