import type { Resolve } from ".";
import type { Json, JsonObject } from "./Json";

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
  id: string;
  type: OpCode.UPDATE_OBJECT;
  data: Partial<JsonObject>;
};

export type CreateObjectOp = {
  opId?: string;
  id: string;
  intent?: "set";
  deletedId?: string;
  type: OpCode.CREATE_OBJECT;
  parentId: string;
  parentKey: string;
  data: JsonObject;
};

export type CreateRootObjectOp = Resolve<
  Omit<CreateObjectOp, "parentId" | "parentKey"> & {
    parentId?: never;
    parentKey?: never;
  }
>;

export type CreateListOp = {
  opId?: string;
  id: string;
  intent?: "set";
  deletedId?: string;
  type: OpCode.CREATE_LIST;
  parentId: string;
  parentKey: string;
};

export type CreateMapOp = {
  opId?: string;
  id: string;
  intent?: "set";
  deletedId?: string;
  type: OpCode.CREATE_MAP;
  parentId: string;
  parentKey: string;
};

export type CreateRegisterOp = {
  opId?: string;
  id: string;
  intent?: "set";
  deletedId?: string;
  type: OpCode.CREATE_REGISTER;
  parentId: string;
  parentKey: string;
  data: Json;
};

export type DeleteCrdtOp = {
  opId?: string;
  id: string;
  type: OpCode.DELETE_CRDT;
};

export type SetParentKeyOp = {
  opId?: string;
  id: string;
  type: OpCode.SET_PARENT_KEY;
  parentKey: string;
};

export type DeleteObjectKeyOp = {
  opId?: string;
  id: string;
  type: OpCode.DELETE_OBJECT_KEY;
  key: string;
};
