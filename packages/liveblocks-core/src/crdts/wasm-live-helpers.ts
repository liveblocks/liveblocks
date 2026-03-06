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
 * Recursively unwrap Live* instances (LiveObject, LiveList, LiveMap,
 * WasmLiveObject, etc.) to plain JSON values so they can be serialized
 * across the WASM boundary. Uses duck-typing to avoid circular imports.
 */
/**
 * Symbol used to mark Live* instances as "attached" after they've been
 * serialized via toPlain(). Prevents the same instance from being attached
 * to a document tree twice (matching JS LiveObject._attach() behavior).
 */
const WASM_ATTACHED = Symbol.for("__wasmAttached");

/**
 * Check if a value is a Live* node (LiveObject, LiveList, LiveMap, or their
 * Wasm counterparts) by duck-typing.
 */
function isLiveNode(value: object): boolean {
  return (
    ("toObject" in value && typeof (value as Record<string, unknown>).toObject === "function") ||
    ("toArray" in value && typeof (value as Record<string, unknown>).toArray === "function") ||
    ("entries" in value && "has" in value && "size" in value &&
      typeof (value as Record<string, unknown>).entries === "function")
  );
}

export function toPlain(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== "object")
    return value;

  // Check if this Live* node is already attached to a document tree.
  // A WasmLive* instance with _nodeId is always attached (it references a node in the Rust doc).
  // A JS Live* instance marked with WASM_ATTACHED was consumed by a previous write.
  if (isLiveNode(value)) {
    const hasNodeId = "_nodeId" in value && typeof (value as Record<string, unknown>)._nodeId === "string";
    if (hasNodeId || (value as Record<symbol, unknown>)[WASM_ATTACHED]) {
      throw new Error(
        "Cannot use a node that is already attached to a document"
      );
    }
  }

  // LiveObject / WasmLiveObject — has toObject()
  if (
    "toObject" in value &&
    typeof (value as Record<string, unknown>).toObject === "function"
  ) {
    // Mark as attached so it can't be reused
    if (isLiveNode(value)) {
      (value as Record<symbol, unknown>)[WASM_ATTACHED] = true;
    }
    return toPlainObject(
      (value as { toObject(): Record<string, unknown> }).toObject()
    );
  }
  // LiveList / WasmLiveList — has toArray() but not toObject()
  if (
    "toArray" in value &&
    typeof (value as Record<string, unknown>).toArray === "function"
  ) {
    if (isLiveNode(value)) {
      (value as Record<symbol, unknown>)[WASM_ATTACHED] = true;
    }
    return (value as { toArray(): unknown[] }).toArray().map(toPlain);
  }
  // LiveMap / WasmLiveMap — has entries() and has() and size (but not toObject/toArray)
  if (
    "entries" in value &&
    "has" in value &&
    "size" in value &&
    typeof (value as Record<string, unknown>).entries === "function"
  ) {
    if (isLiveNode(value)) {
      (value as Record<symbol, unknown>)[WASM_ATTACHED] = true;
    }
    const result: Record<string, unknown> = {};
    const entries = (value as { entries(): IterableIterator<[string, unknown]> }).entries();
    for (const [key, val] of entries) {
      result[key] = toPlain(val);
    }
    return { __liveType: "LiveMap", data: result };
  }
  // JS Map
  if (value instanceof Map) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of value) {
      result[String(key)] = toPlain(val);
    }
    return { __liveType: "LiveMap", data: result };
  }
  if (Array.isArray(value)) return value.map(toPlain);
  // Plain object
  return toPlainObject(value as Record<string, unknown>);
}

/** @internal */
export function toPlainObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = toPlain(obj[key]);
  }
  return result;
}

/**
 * Build a parent info structure for a WASM live node, compatible with
 * the JS AbstractCrdt `.parent` getter.
 */
export function makeParentInfo(
  owner: CrdtDocumentOwner,
  nodeId: string
): { type: "HasParent"; node: unknown; key: string; pos: string } | { type: "NoParent" } {
  const info = owner.getParentInfo(nodeId);
  if (!info) {
    return Object.freeze({ type: "NoParent" as const });
  }
  const { parentId, parentKey } = info;
  // Create a live node wrapper for the parent
  const parentType = owner.getNodeType(parentId);
  let parentNode: unknown;
  switch (parentType) {
    case "LiveObject":
      if (!_WasmLiveObject) throw new Error("WasmLiveObject not registered");
      parentNode = new _WasmLiveObject(owner, parentId);
      break;
    case "LiveList":
      if (!_WasmLiveList) throw new Error("WasmLiveList not registered");
      parentNode = new _WasmLiveList(owner, parentId);
      break;
    case "LiveMap":
      if (!_WasmLiveMap) throw new Error("WasmLiveMap not registered");
      parentNode = new _WasmLiveMap(owner, parentId);
      break;
    default:
      return Object.freeze({ type: "NoParent" as const });
  }
  return Object.freeze({
    type: "HasParent" as const,
    node: parentNode,
    key: parentKey,
    pos: parentKey,
  });
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
