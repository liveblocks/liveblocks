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
} from "./live";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveRegister } from "./LiveRegister";
import {
  LiveListUpdates,
  LiveMapUpdates,
  LiveObjectUpdates,
  StorageUpdate,
} from "./types";

// TODO: Further improve this type
type fixme = unknown;

export function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
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

export function selfOrRegister(obj: unknown): AbstractCrdt {
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
    return new LiveRegister(obj);
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

export function mergeStorageUpdates(
  first: StorageUpdate | undefined,
  second: StorageUpdate
): StorageUpdate {
  if (!first) {
    return second;
  }

  if (second.type === "LiveObject") {
    const updates = (first as LiveObjectUpdates<any /* fixme! */>).updates;

    for (const [key, value] of Object.entries(second.updates)) {
      updates[key] = value;
    }
    return {
      ...second,
      updates: updates,
    };
  } else if (second.type === "LiveMap") {
    const updates = (first as LiveMapUpdates<string, fixme>).updates;

    for (const [key, value] of Object.entries(second.updates)) {
      updates[key] = value;
    }
    return {
      ...second,
      updates: updates,
    };
  } else if (second.type === "LiveList") {
    const updates = (first as LiveListUpdates<fixme>).updates;

    return {
      ...second,
      updates: updates.concat(second.updates),
    };
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

export function isTokenValid(token: string | null) {
  if (token === null) {
    return false;
  }

  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return false;
  }

  const data = JSON.parse(atob(tokenParts[1]));
  if (typeof data.exp !== "number") {
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
