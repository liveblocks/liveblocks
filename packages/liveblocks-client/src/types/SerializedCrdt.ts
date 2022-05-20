import type { Json, JsonObject } from "./Json";

export type IdTuple<T> = [id: string, value: T];

export enum CrdtType {
  OBJECT = 0,
  LIST = 1,
  MAP = 2,
  REGISTER = 3,
}

export type SerializedCrdt = SerializedRootObject | SerializedChild;

export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export type SerializedRootObject = {
  type: CrdtType.OBJECT;
  data: JsonObject;

  // Root objects don't have a parent relationship
  parentId?: never;
  parentKey?: never;
};

export type SerializedObject = {
  type: CrdtType.OBJECT;
  parentId: string;
  parentKey: string;
  data: JsonObject;
};

export type SerializedList = {
  type: CrdtType.LIST;
  parentId: string;
  parentKey: string;
};

export type SerializedMap = {
  type: CrdtType.MAP;
  parentId: string;
  parentKey: string;
};

export type SerializedRegister = {
  type: CrdtType.REGISTER;
  parentId: string;
  parentKey: string;
  data: Json;
};

export function isRootCrdt(crdt: SerializedCrdt): crdt is SerializedRootObject {
  return crdt.type === CrdtType.OBJECT && !isChildCrdt(crdt);
}

export function isChildCrdt(crdt: SerializedCrdt): crdt is SerializedChild {
  return crdt.parentId !== undefined && crdt.parentKey !== undefined;
}
