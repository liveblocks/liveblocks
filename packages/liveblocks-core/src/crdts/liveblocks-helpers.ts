import { assertNever, nn } from "../lib/assert";
import type { Json } from "../lib/Json";
import { stringifyOrLog as stringify } from "../lib/stringify";
import { deepClone, entries } from "../lib/utils";
import type { CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { NodeMap, StorageNode } from "../protocol/StorageNode";
import {
  CrdtType,
  isListStorageNode,
  isMapStorageNode,
  isObjectStorageNode,
  isRegisterStorageNode,
  isTextStorageNode,
} from "../protocol/StorageNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ManagedPool } from "./AbstractCrdt";
import { LiveList, type LiveListUpdates } from "./LiveList";
import { LiveMap, type LiveMapUpdates } from "./LiveMap";
import { LiveObject, type LiveObjectUpdates } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import { LiveText, type LiveTextUpdates } from "./LiveText";
import type { LiveNode, LiveStructure, Lson, LsonObject } from "./Lson";
import { kStorageUpdateSource } from "../internal";
import type { StorageUpdate } from "./StorageUpdates";

export function creationOpToLiveNode(op: CreateOp): LiveNode {
  return lsonToLiveNode(creationOpToLson(op));
}

export function creationOpToLson(op: CreateOp): Lson {
  switch (op.type) {
    case OpCode.CREATE_REGISTER:
      return op.data;
    case OpCode.CREATE_OBJECT:
      return new LiveObject(op.data);
    case OpCode.CREATE_MAP:
      return new LiveMap();
    case OpCode.CREATE_LIST:
      return new LiveList([]);
    case OpCode.CREATE_TEXT:
      return new LiveText(op.data, op.version);
    default:
      return assertNever(op, "Unknown creation Op");
  }
}

export function isSameNodeOrChildOf(node: LiveNode, parent: LiveNode): boolean {
  if (node === parent) {
    return true;
  }
  if (node.parent.type === "HasParent") {
    return isSameNodeOrChildOf(node.parent.node, parent);
  }
  return false;
}

export function deserialize(
  node: StorageNode,
  parentToChildren: ParentToChildNodeMap,
  pool: ManagedPool
): LiveNode {
  if (isObjectStorageNode(node)) {
    return LiveObject._deserialize(node, parentToChildren, pool);
  } else if (isListStorageNode(node)) {
    return LiveList._deserialize(node, parentToChildren, pool);
  } else if (isMapStorageNode(node)) {
    return LiveMap._deserialize(node, parentToChildren, pool);
  } else if (isRegisterStorageNode(node)) {
    return LiveRegister._deserialize(node, parentToChildren, pool);
  } else if (isTextStorageNode(node)) {
    return LiveText._deserialize(node, parentToChildren, pool);
  } else {
    throw new Error("Unexpected CRDT type");
  }
}

export function deserializeToLson(
  node: StorageNode,
  parentToChildren: ParentToChildNodeMap,
  pool: ManagedPool
): Lson {
  if (isObjectStorageNode(node)) {
    return LiveObject._deserialize(node, parentToChildren, pool);
  } else if (isListStorageNode(node)) {
    return LiveList._deserialize(node, parentToChildren, pool);
  } else if (isMapStorageNode(node)) {
    return LiveMap._deserialize(node, parentToChildren, pool);
  } else if (isRegisterStorageNode(node)) {
    return node[1].data;
  } else if (isTextStorageNode(node)) {
    return LiveText._deserialize(node, parentToChildren, pool);
  } else {
    throw new Error("Unexpected CRDT type");
  }
}

export function isLiveStructure(value: unknown): value is LiveStructure {
  return (
    isLiveList(value) ||
    isLiveMap(value) ||
    isLiveObject(value) ||
    isLiveText(value)
  );
}

export function isLiveNode(value: unknown): value is LiveNode {
  return isLiveStructure(value) || isLiveRegister(value);
}

export function isLiveList(value: unknown): value is LiveList<Lson> {
  return value instanceof LiveList;
}

export function isLiveMap(value: unknown): value is LiveMap<string, Lson> {
  return value instanceof LiveMap;
}

export function isLiveObject(value: unknown): value is LiveObject<LsonObject> {
  return value instanceof LiveObject;
}

export function isLiveText(value: unknown): value is LiveText {
  return value instanceof LiveText;
}

export function isLiveRegister(value: unknown): value is LiveRegister<Json> {
  return value instanceof LiveRegister;
}

export function cloneLson<L extends Lson | undefined>(value: L): L {
  return value === undefined
    ? (undefined as L)
    : isLiveStructure(value)
      ? (value.clone() as L)
      : (deepClone(value) as L);
}

export function liveNodeToLson(obj: LiveNode): Lson {
  if (obj instanceof LiveRegister) {
    return obj.data;
  } else if (
    obj instanceof LiveList ||
    obj instanceof LiveMap ||
    obj instanceof LiveObject ||
    obj instanceof LiveText
  ) {
    return obj;
  } else {
    return assertNever(obj, "Unknown AbstractCrdt");
  }
}

export function lsonToLiveNode(value: Lson): LiveNode {
  if (
    value instanceof LiveObject ||
    value instanceof LiveMap ||
    value instanceof LiveList ||
    value instanceof LiveText
  ) {
    return value;
  } else {
    return new LiveRegister(value);
  }
}

/**
 * Serializes every node currently in the pool into a flat, human-readable
 * table: one line per node with its id, parent id, parent key, and value. The
 * parent key is the fractional position key for list items, or the field/map
 * key otherwise.
 *
 * Unlike `.toJSON()`, this also surfaces nodes that are still in the pool but
 * detached from any parent (orphaned, or pending and not yet acknowledged),
 * which is exactly the kind of discrepancy a convergence bug leaves behind.
 * Intended for debugging only.
 */
export function dumpPool(pool: ManagedPool): string {
  const rows = Array.from(pool.nodes.values(), (node) => {
    const parent = node.parent;
    const parentId =
      parent.type === "HasParent"
        ? (parent.node._id ?? "?")
        : parent.type === "Orphaned"
          ? "<orphaned>"
          : "-";

    let value: string;
    if (node instanceof LiveRegister) {
      value = stringify(node.data);
    } else if (node instanceof LiveList) {
      value = "<LiveList>";
    } else if (node instanceof LiveMap) {
      value = "<LiveMap>";
    } else {
      value = "<LiveObject>";
    }

    return { id: nn(node._id), parentId, key: node._parentKey ?? "", value };
  });

  // Group children of the same parent together, ordered by key. Compare keys
  // by raw string order, matching how the CRDT itself orders positions
  // (childNodeLt: a._parentPos < b._parentPos).
  rows.sort((a, b) => {
    if (a.parentId !== b.parentId) return a.parentId < b.parentId ? -1 : 1;
    if (a.key !== b.key) return a.key < b.key ? -1 : 1;
    return 0;
  });

  return rows
    .map(
      (r) => `  ${r.id}  parent=${r.parentId}  key=${r.key || "—"}  ${r.value}`
    )
    .join("\n");
}

/**
 * Deep-equality check for two Json values. Short-circuits on the first
 * difference and allocates nothing: the cheap `===` settles every primitive,
 * and nested arrays/objects are compared by traversal (key-by-key, so key order
 * is irrelevant).
 */
export function isJsonEq(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isJsonEq(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // Both are plain objects: same number of keys, and every key matches.
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) {
    return false;
  }
  for (const key of aKeys) {
    if (!isJsonEq(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Computes the operations needed to transform one NodeMap into another.
 *
 * Used when the client receives a fresh storage snapshot from the server
 * (e.g. after reconnecting). The local state may have diverged, so we diff
 * the two trees and apply the resulting ops to bring local state in sync
 * with the server's authoritative version.
 *
 * Returns ops for:
 * - DELETE_CRDT: nodes in current but not in new
 * - CREATE_*: nodes in new but not in current
 * - UPDATE_OBJECT: objects whose data changed
 * - SET_PARENT_KEY: nodes whose position changed
 *
 * Example:
 * - Current: { "root": { a: 1 },  "node1": { b: 2 } }
 * - New:     { "root": { a: 99 }, "node2": { c: 3 } }
 *
 * Returns:
 *  - DELETE_CRDT for "node1" (removed)
 *  - UPDATE_OBJECT for "root" (data changed: a: 1 → 99)
 *  - CREATE_OBJECT for "node2" (added)
 */
export function getTreesDiffOperations(
  currentItems: NodeMap,
  newItems: NodeMap
): Op[] {
  const ops: Op[] = [];

  currentItems.forEach((_, id) => {
    if (!newItems.get(id)) {
      // Delete crdt
      ops.push({ type: OpCode.DELETE_CRDT, id });
    }
  });

  newItems.forEach((crdt, id) => {
    const currentCrdt = currentItems.get(id);
    if (currentCrdt) {
      if (crdt.type === CrdtType.OBJECT) {
        if (currentCrdt.type !== CrdtType.OBJECT) {
          // Node changed into an object; send its full data.
          ops.push({ type: OpCode.UPDATE_OBJECT, id, data: crdt.data });
        } else {
          // Emit an UPDATE_OBJECT carrying only the keys that were added or
          // whose value changed. Sending the full data would re-notify keys
          // that did not actually change.
          const changed = new Map<string, Json>();
          for (const key of Object.keys(crdt.data)) {
            const value = crdt.data[key];
            if (
              value !== undefined &&
              !isJsonEq(value, currentCrdt.data[key])
            ) {
              changed.set(key, value);
            }
          }
          if (changed.size > 0) {
            ops.push({
              type: OpCode.UPDATE_OBJECT,
              id,
              data: Object.fromEntries(changed),
            });
          }
          // Keys present locally but absent from the snapshot must be deleted
          // explicitly, otherwise they linger and the two clients diverge.
          for (const key of Object.keys(currentCrdt.data)) {
            if (!(key in crdt.data)) {
              ops.push({ type: OpCode.DELETE_OBJECT_KEY, id, key });
            }
          }
        }
      }
      // NOTE: CrdtType.TEXT nodes that exist on both sides are deliberately
      // NOT diffed into UPDATE_TEXT ops here. The UPDATE_TEXT op path
      // carries pending-op transformation semantics that don't apply to
      // authoritative snapshots; LiveText nodes are reconciled against the
      // snapshot directly (see LiveText._resyncText, called from the room).
      if (crdt.parentKey !== currentCrdt.parentKey) {
        ops.push({
          type: OpCode.SET_PARENT_KEY,
          id,
          parentKey: nn(crdt.parentKey, "Parent key must not be missing"),
        });
      }
    } else {
      // new Crdt
      switch (crdt.type) {
        case CrdtType.REGISTER:
          ops.push({
            type: OpCode.CREATE_REGISTER,
            id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
            data: crdt.data,
          });
          break;
        case CrdtType.LIST:
          ops.push({
            type: OpCode.CREATE_LIST,
            id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
          });
          break;
        case CrdtType.OBJECT:
          if (crdt.parentId === undefined || crdt.parentKey === undefined) {
            throw new Error(
              "Internal error. Cannot serialize storage root into an operation"
            );
          }
          ops.push({
            type: OpCode.CREATE_OBJECT,
            id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
            data: crdt.data,
          });
          break;
        case CrdtType.MAP:
          ops.push({
            type: OpCode.CREATE_MAP,
            id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
          });
          break;
        case CrdtType.TEXT:
          ops.push({
            type: OpCode.CREATE_TEXT,
            id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
            data: crdt.data,
            version: crdt.version,
          });
          break;
      }
    }
  });

  return ops;
}

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

function mergeTextStorageUpdates(
  first: LiveTextUpdates,
  second: LiveTextUpdates
): LiveTextUpdates {
  return {
    ...second,
    updates: first.updates.concat(second.updates),
  };
}

export function mergeStorageUpdates(
  first: StorageUpdate | undefined,
  second: StorageUpdate
): StorageUpdate {
  if (first === undefined) {
    return second;
  }

  let merged: StorageUpdate;
  if (first.type === "LiveObject" && second.type === "LiveObject") {
    merged = mergeObjectStorageUpdates(first, second);
  } else if (first.type === "LiveMap" && second.type === "LiveMap") {
    merged = mergeMapStorageUpdates(first, second);
  } else if (first.type === "LiveList" && second.type === "LiveList") {
    merged = mergeListStorageUpdates(first, second);
  } else if (first.type === "LiveText" && second.type === "LiveText") {
    merged = mergeTextStorageUpdates(first, second);
  } else {
    /* Mismatching merge types. Throw an error here? */
    merged = second;
  }

  const sa = first[kStorageUpdateSource];
  const sb = second[kStorageUpdateSource];
  if (sa !== undefined || sb !== undefined) {
    if (sa?.origin === "remote" || sb?.origin === "remote") {
      merged[kStorageUpdateSource] = { origin: "remote" };
    } else if (sa?.via === "history" || sb?.via === "history") {
      const historySource =
        sb?.via === "history" ? sb : sa?.via === "history" ? sa : undefined;
      if (historySource?.via === "history") {
        merged[kStorageUpdateSource] = historySource;
      }
    } else {
      merged[kStorageUpdateSource] = { origin: "local", via: "mutation" };
    }
  }
  return merged;
}
