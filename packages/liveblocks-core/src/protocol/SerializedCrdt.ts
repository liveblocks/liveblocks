import type { Json, JsonObject } from "../lib/Json";

export type IdTuple<T> = [id: string, value: T];

export type CrdtType = (typeof CrdtType)[keyof typeof CrdtType];
export const CrdtType = Object.freeze({
  OBJECT: 0,
  LIST: 1,
  MAP: 2,
  REGISTER: 3,
});

export namespace CrdtType {
  export type OBJECT = typeof CrdtType.OBJECT;
  export type LIST = typeof CrdtType.LIST;
  export type MAP = typeof CrdtType.MAP;
  export type REGISTER = typeof CrdtType.REGISTER;
}

export type SerializedCrdt = SerializedRootObject | SerializedChild;

export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export type SerializedRootObject = {
  readonly type: CrdtType.OBJECT;
  readonly data: JsonObject;

  // Root objects don't have a parent relationship
  readonly parentId?: never;
  readonly parentKey?: never;
};

export type SerializedObject = {
  readonly type: CrdtType.OBJECT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: JsonObject;
};

export type SerializedList = {
  readonly type: CrdtType.LIST;
  readonly parentId: string;
  readonly parentKey: string;
};

export type SerializedMap = {
  readonly type: CrdtType.MAP;
  readonly parentId: string;
  readonly parentKey: string;
};

export type SerializedRegister = {
  readonly type: CrdtType.REGISTER;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: Json;
};

export type CompactNode = CompactRootNode | CompactChildNode;

export type CompactChildNode =
  | CompactObjectNode
  | CompactListNode
  | CompactMapNode
  | CompactRegisterNode;

export type CompactRootNode = readonly [
  id: "root",
  type: CrdtType.OBJECT,
  data: JsonObject,
];

export type CompactObjectNode = readonly [
  id: string,
  type: CrdtType.OBJECT,
  parentId: string,
  parentKey: string,
  data: JsonObject,
];

export type CompactListNode = readonly [
  id: string,
  type: CrdtType.LIST,
  parentId: string,
  parentKey: string,
];

export type CompactMapNode = readonly [
  id: string,
  type: CrdtType.MAP,
  parentId: string,
  parentKey: string,
];

export type CompactRegisterNode = readonly [
  id: string,
  type: CrdtType.REGISTER,
  parentId: string,
  parentKey: string,
  data: Json,
];
