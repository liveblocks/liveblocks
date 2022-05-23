import type { AbstractCrdt, Doc } from "./AbstractCrdt";
import { assertNever, nn } from "./assert";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import type {
  CreateOp,
  IdTuple,
  Json,
  LiveListUpdates,
  LiveMapUpdates,
  LiveObjectUpdates,
  Lson,
  LsonObject,
  NodeMap,
  Op,
  ParentToChildNodeMap,
  SerializedCrdt,
  StorageUpdate,
} from "./types";
import { CrdtType, OpCode } from "./types";
import { isJsonObject, parseJson } from "./types/Json";

export function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

/**
 * Removes null and undefined values from the array, and reflects this in the
 * output type.
 */
export function compact<T>(items: readonly T[]): NonNullable<T>[] {
  return items.filter((item: T): item is NonNullable<T> => item != null);
}

export function creationOpToLiveStructure(op: CreateOp): AbstractCrdt {
  switch (op.type) {
    case OpCode.CREATE_REGISTER:
      return new LiveRegister(op.data);
    case OpCode.CREATE_OBJECT:
      return new LiveObject(op.data);
    case OpCode.CREATE_MAP:
      return new LiveMap();
    case OpCode.CREATE_LIST:
      return new LiveList();
    default:
      return assertNever(op, "Unknown creation Op");
  }
}

export function isSameNodeOrChildOf(
  node: AbstractCrdt,
  parent: AbstractCrdt
): boolean {
  if (node === parent) {
    return true;
  }
  if (node._parent) {
    return isSameNodeOrChildOf(node._parent, parent);
  }
  return false;
}

export function deserialize(
  [id, crdt]: IdTuple<SerializedCrdt>,
  parentToChildren: ParentToChildNodeMap,
  doc: Doc
): AbstractCrdt {
  switch (crdt.type) {
    case CrdtType.OBJECT: {
      return LiveObject._deserialize([id, crdt], parentToChildren, doc);
    }
    case CrdtType.LIST: {
      return LiveList._deserialize([id, crdt], parentToChildren, doc);
    }
    case CrdtType.MAP: {
      return LiveMap._deserialize([id, crdt], parentToChildren, doc);
    }
    case CrdtType.REGISTER: {
      return LiveRegister._deserialize([id, crdt], parentToChildren, doc);
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}

export function isCrdt(obj: unknown): obj is AbstractCrdt {
  return (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList ||
    obj instanceof LiveRegister
  );
}

export function selfOrRegisterValue(obj: AbstractCrdt) {
  if (obj instanceof LiveRegister) {
    return obj.data;
  }

  return obj;
}

export function selfOrRegister(obj: Lson): AbstractCrdt {
  if (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList
  ) {
    return obj;
  } else if (obj instanceof LiveRegister) {
    throw new Error(
      "Internal error. LiveRegister should not be created from selfOrRegister"
    );
  } else {
    // By now, we've checked that obj isn't a Live storage instance.
    // Technically what remains here can still be a (1) live data scalar, or
    // a (2) list of Lson values, or (3) an object with Lson values.
    //
    // Of these, (1) is fine, because a live data scalar is also a legal Json
    // scalar.
    //
    // But (2) and (3) are only technically fine if those only contain Json
    // values. Technically, these can still contain nested Live storage
    // instances, and we should probably assert that they don't at runtime.
    //
    // TypeScript understands this and doesn't let us use `obj` until we do :)
    //
    return new LiveRegister(obj as Json);
    //                          ^^^^^^^
    //                          TODO: Better to assert than to force-cast here!
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
      ops.push({
        type: OpCode.DELETE_CRDT,
        id,
      });
    }
  });

  newItems.forEach((crdt, id) => {
    const currentCrdt = currentItems.get(id);
    if (currentCrdt) {
      if (crdt.type === CrdtType.OBJECT) {
        if (
          currentCrdt.type !== CrdtType.OBJECT ||
          JSON.stringify(crdt.data) !== JSON.stringify(currentCrdt.data)
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
          ops.push(
            crdt.parentId
              ? {
                  type: OpCode.CREATE_OBJECT,
                  id,
                  parentId: crdt.parentId,
                  parentKey: crdt.parentKey,
                  data: crdt.data,
                }
              : // Root object
                { type: OpCode.CREATE_OBJECT, id, data: crdt.data }
          );
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
): LiveObjectUpdates<A | B> {
  const updates = first.updates as typeof second["updates"];
  for (const [key, value] of entries(second.updates)) {
    updates[key] = value;
  }
  return {
    ...second,
    updates,
  };
}

function mergeMapStorageUpdates<
  K1 extends string,
  V1 extends Lson,
  K2 extends string,
  V2 extends Lson
>(
  first: LiveMapUpdates<K1, V1>,
  second: LiveMapUpdates<K2, V2>
): LiveMapUpdates<K1 | K2, V1 | V2> {
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

// prettier-ignore
export function mergeStorageUpdates<T extends StorageUpdate>(first: undefined, second: T): T;

// prettier-ignore
export function mergeStorageUpdates<K1 extends string, V1 extends Lson, K2 extends string, V2 extends Lson>(first: LiveMapUpdates<K1, V1>, second: LiveMapUpdates<K2, V2>): LiveMapUpdates<K1 | K2, V1 | V2>;

// prettier-ignore
export function mergeStorageUpdates<T extends Lson>(first: LiveListUpdates<Lson>, second: LiveListUpdates<T>): LiveListUpdates<T>;

// prettier-ignore
export function mergeStorageUpdates(first: StorageUpdate | undefined, second: StorageUpdate): StorageUpdate {
  if (!first) {
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

function isPlain(value: unknown) /* TODO: add refinement here */ {
  const type = typeof value;
  return (
    type === "undefined" ||
    value === null ||
    type === "string" ||
    type === "boolean" ||
    type === "number" ||
    Array.isArray(value) ||
    isPlainObject(value)
  );
}

function isPlainObject(value: unknown): value is object {
  if (typeof value !== "object" || value === null) return false;

  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;

  let baseProto = proto;
  while (Object.getPrototypeOf(baseProto) !== null) {
    baseProto = Object.getPrototypeOf(baseProto);
  }

  return proto === baseProto;
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

export function isTokenValid(token: string) {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return false;
  }

  const data = parseJson(atob(tokenParts[1]));
  if (
    data === undefined ||
    !isJsonObject(data) ||
    typeof data.exp !== "number"
  ) {
    return false;
  }

  const now = Date.now();

  if (now / 1000 > data.exp - 300) {
    return false;
  }

  return true;
}

/**
 * Polyfill for Object.fromEntries() to be able to target ES2015 output without
 * including external polyfill dependencies.
 */
export function fromEntries<K, V>(
  iterable: Iterable<[K, V]>
): { [key: string]: V } {
  const obj: { [key: string]: V } = {};
  for (const [key, val] of iterable) {
    obj[key as unknown as string] = val;
  }
  return obj;
}

/**
 * Drop-in replacement for Object.entries() that retains better types.
 */
export function entries<
  O extends { [key: string]: unknown },
  K extends keyof O
>(obj: O): [K, O[K]][] {
  return Object.entries(obj) as [K, O[K]][];
}

/**
 * Drop-in replacement for Object.keys() that retains better types.
 */
export function keys<O extends { [key: string]: unknown }, K extends keyof O>(
  obj: O
): K[] {
  return Object.keys(obj) as K[];
}

/**
 * Drop-in replacement for Object.values() that retains better types.
 */
export function values<O extends { [key: string]: unknown }>(
  obj: O
): O[keyof O][] {
  return Object.values(obj) as O[keyof O][];
}
