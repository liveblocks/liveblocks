import { AbstractCrdt, Doc } from "./AbstractCrdt";
import {
  SerializedCrdtWithId,
  CrdtType,
  SerializedList,
  SerializedMap,
  Op,
  SerializedCrdt,
  OpType,
  SerializedObject,
  CreateOp,
} from "./live";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import { Json, isJsonObject, parseJson } from "./json";
import { Lson, LsonObject } from "./lson";
import {
  LiveListUpdates,
  LiveMapUpdates,
  LiveObjectUpdates,
  StorageUpdate,
} from "./types";

// Keeps a set of deprecation messages in memory that it has warned about
// already. There will be only one deprecation message in the console, no
// matter how often it gets called.
const _emittedDeprecationWarnings: Set<string> = new Set();

/**
 * Displays a [DEPRECATED] warning in the dev console. Only in dev mode, and
 * only once per message/key. In production, this is a no-op.
 */
export function deprecate(message: string, key = message) {
  if (process.env.NODE_ENV !== "production") {
    if (!_emittedDeprecationWarnings.has(key)) {
      _emittedDeprecationWarnings.add(key);
    }
    console.warn(`⚠️  [DEPRECATED] ${message}`);
  }
}

/**
 * Conditionally displays a [DEPRECATED] warning in the dev
 * console if the first argument is truthy. Only in dev mode, and
 * only once per message/key. In production, this is a no-op.
 */
export function deprecateIf(
  condition: unknown,
  message: string,
  key = message
) {
  if (process.env.NODE_ENV !== "production") {
    if (condition) {
      deprecate(message, key);
    }
  }
}

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
    case OpType.CreateRegister:
      return new LiveRegister(op.data);
    case OpType.CreateObject:
      return new LiveObject(op.data);
    case OpType.CreateMap:
      return new LiveMap();
    case OpType.CreateList:
      return new LiveList();
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
  entry: SerializedCrdtWithId,
  parentToChildren: Map<string, SerializedCrdtWithId[]>,
  doc: Doc
): AbstractCrdt {
  switch (entry[1].type) {
    case CrdtType.Object: {
      return LiveObject._deserialize(entry, parentToChildren, doc);
    }
    case CrdtType.List: {
      return LiveList._deserialize(
        entry as [string, SerializedList],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Map: {
      return LiveMap._deserialize(
        entry as [string, SerializedMap],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Register: {
      return LiveRegister._deserialize(
        entry as [string, SerializedMap],
        parentToChildren,
        doc
      );
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
  currentItems: Map<string, SerializedCrdt>,
  newItems: Map<string, SerializedCrdt>
): Op[] {
  const ops: Op[] = [];

  currentItems.forEach((_, id) => {
    if (!newItems.get(id)) {
      // Delete crdt
      ops.push({
        type: OpType.DeleteCrdt,
        id: id,
      });
    }
  });

  newItems.forEach((crdt, id) => {
    const currentCrdt = currentItems.get(id);
    if (currentCrdt) {
      if (crdt.type === CrdtType.Object) {
        if (
          JSON.stringify(crdt.data) !==
          JSON.stringify((currentCrdt as SerializedObject).data)
        ) {
          ops.push({
            type: OpType.UpdateObject,
            id: id,
            data: crdt.data,
          });
        }
      }
      if (crdt.parentKey !== currentCrdt.parentKey) {
        ops.push({
          type: OpType.SetParentKey,
          id: id,
          parentKey: crdt.parentKey!,
        });
      }
    } else {
      // new Crdt
      switch (crdt.type) {
        case CrdtType.Register:
          ops.push({
            type: OpType.CreateRegister,
            id: id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
            data: crdt.data,
          });
          break;
        case CrdtType.List:
          ops.push({
            type: OpType.CreateList,
            id: id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
          });
          break;
        case CrdtType.Object:
          ops.push({
            type: OpType.CreateObject,
            id: id,
            parentId: crdt.parentId,
            parentKey: crdt.parentKey,
            data: crdt.data,
          });
          break;
        case CrdtType.Map:
          ops.push({
            type: OpType.CreateMap,
            id: id,
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
    updates: updates,
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
    updates: updates,
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
      value: value,
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
