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

// XXX Remove export? At least from src/index
export type SerializedCrdt = SerializedRootObject | SerializedChild;

// XXX Remove export? At least from src/index
export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

// XXX Remove export? At least from src/index
export type SerializedRootObject = {
  readonly type: CrdtType.OBJECT;
  readonly data: JsonObject;

  // Root objects don't have a parent relationship
  readonly parentId?: never;
  readonly parentKey?: never;
};

// XXX Remove export? At least from src/index
export type SerializedObject = {
  readonly type: CrdtType.OBJECT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: JsonObject;
};

// XXX Remove export? At least from src/index
export type SerializedList = {
  readonly type: CrdtType.LIST;
  readonly parentId: string;
  readonly parentKey: string;
};

// XXX Remove export? At least from src/index
export type SerializedMap = {
  readonly type: CrdtType.MAP;
  readonly parentId: string;
  readonly parentKey: string;
};

// XXX Remove export? At least from src/index
export type SerializedRegister = {
  readonly type: CrdtType.REGISTER;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: Json;
};

export type StorageNode = RootStorageNode | ChildStorageNode;

export type ChildStorageNode =
  | ObjectStorageNode
  | ListStorageNode
  | MapStorageNode
  | RegisterStorageNode;

export type RootStorageNode = [id: "root", value: SerializedRootObject];
export type ObjectStorageNode = [id: string, value: SerializedObject];
export type ListStorageNode = [id: string, value: SerializedList];
export type MapStorageNode = [id: string, value: SerializedMap];
export type RegisterStorageNode = [id: string, value: SerializedRegister];
