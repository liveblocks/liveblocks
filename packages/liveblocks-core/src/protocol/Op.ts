import type { Json, JsonObject } from "../lib/Json";

export enum OpCode {
  INIT = 0,
  SET_PARENT_KEY = 1,
  CREATE_LIST = 2,
  UPDATE_OBJECT = 3,
  CREATE_OBJECT = 4,
  DELETE_CRDT = 5,
  DELETE_OBJECT_KEY = 6,
  CREATE_MAP = 7,
  CREATE_REGISTER = 8,
}

/**
 * These operations are the payload for {@link UpdateStorageServerMsg} messages
 * only.
 */
export type Op =
  | CreateOp
  | UpdateObjectOp
  | DeleteCrdtOp
  | SetParentKeyOp // Only for lists!
  | DeleteObjectKeyOp;

export type CreateOp = CreateRootObjectOp | CreateChildOp;

export type CreateChildOp =
  | CreateObjectOp
  | CreateRegisterOp
  | CreateMapOp
  | CreateListOp;

export type UpdateObjectOp = {
  opId?: string;
  readonly id: string;
  readonly type: OpCode.UPDATE_OBJECT;
  readonly data: Partial<JsonObject>;
};

export type CreateObjectOp = {
  opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_OBJECT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: JsonObject;
};

export type CreateRootObjectOp = {
  opId?: string;
  readonly id: string;
  readonly type: OpCode.CREATE_OBJECT;
  readonly data: JsonObject;
  readonly parentId?: never;
  readonly parentKey?: never;
};

export type CreateListOp = {
  opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_LIST;
  readonly parentId: string;
  readonly parentKey: string;
};

export type CreateMapOp = {
  opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_MAP;
  readonly parentId: string;
  readonly parentKey: string;
};

export type CreateRegisterOp = {
  opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_REGISTER;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: Json;
};

export type DeleteCrdtOp = {
  opId?: string;
  readonly id: string;
  readonly type: OpCode.DELETE_CRDT;
};

export type SetParentKeyOp = {
  opId?: string;
  readonly id: string;
  readonly type: OpCode.SET_PARENT_KEY;
  readonly parentKey: string;
};

export type DeleteObjectKeyOp = {
  opId?: string;
  readonly id: string;
  readonly type: OpCode.DELETE_OBJECT_KEY;
  readonly key: string;
};
