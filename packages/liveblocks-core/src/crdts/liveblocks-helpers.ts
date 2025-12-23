import { assertNever, nn } from "../lib/assert";
import { isPlainObject } from "../lib/guards";
import type { Json } from "../lib/Json";
import { stringifyOrLog as stringify } from "../lib/stringify";
import { deepClone, entries } from "../lib/utils";
import type { CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import type { NodeMap, ParentToChildNodeMap } from "../types/NodeMap";
import type { ManagedPool } from "./AbstractCrdt";
import { LiveList, type LiveListUpdates } from "./LiveList";
import { LiveMap, type LiveMapUpdates } from "./LiveMap";
import { LiveObject, type LiveObjectUpdates } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import type { LiveNode, LiveStructure, Lson, LsonObject } from "./Lson";
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
  [id, crdt]: IdTuple<SerializedCrdt>,
  parentToChildren: ParentToChildNodeMap,
  pool: ManagedPool
): LiveNode {
  switch (crdt.type) {
    case CrdtType.OBJECT: {
      return LiveObject._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.LIST: {
      return LiveList._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.MAP: {
      return LiveMap._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.REGISTER: {
      return LiveRegister._deserialize([id, crdt], parentToChildren, pool);
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}

export function deserializeToLson(
  [id, crdt]: IdTuple<SerializedCrdt>,
  parentToChildren: ParentToChildNodeMap,
  pool: ManagedPool
): Lson {
  switch (crdt.type) {
    case CrdtType.OBJECT: {
      return LiveObject._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.LIST: {
      return LiveList._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.MAP: {
      return LiveMap._deserialize([id, crdt], parentToChildren, pool);
    }
    case CrdtType.REGISTER: {
      return crdt.data;
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}

export function isLiveStructure(value: unknown): value is LiveStructure {
  return isLiveList(value) || isLiveMap(value) || isLiveObject(value);
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
    obj instanceof LiveObject
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
    value instanceof LiveList
  ) {
    return value;
  } else {
    return new LiveRegister(value);
  }
}

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
        if (
          currentCrdt.type !== CrdtType.OBJECT ||
          stringify(crdt.data) !== stringify(currentCrdt.data)
        ) {
          ops.push({
            type: OpCode.UPDATE_OBJECT,
            id,
            data: crdt.data,
          });
        }
      }
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
  } else {
    /* Mismatching merge types. Throw an error here? */
  }

  return second;
}

function isPlain(
  value: unknown
): value is
  | undefined
  | null
  | string
  | boolean
  | number
  | unknown[]
  | { [key: string]: unknown } {
  const type = typeof value;
  return (
    value === undefined ||
    value === null ||
    type === "string" ||
    type === "boolean" ||
    type === "number" ||
    Array.isArray(value) ||
    isPlainObject(value)
  );
}

export function findNonSerializableValue(
  value: unknown,
  path: string = ""
): { path: string; value: unknown } | false {
  if (!isPlain) {
    return {
      path: path || "root",
      value,
    };
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? path + "." + key : key;

    if (!isPlain(nestedValue)) {
      return {
        path: nestedPath,
        value: nestedValue,
      };
    }

    if (typeof nestedValue === "object") {
      const nonSerializableNestedValue = findNonSerializableValue(
        nestedValue,
        nestedPath
      );

      if (nonSerializableNestedValue) {
        return nonSerializableNestedValue;
      }
    }
  }

  return false;
}
