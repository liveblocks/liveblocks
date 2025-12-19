import type { Json, JsonObject } from "../lib/Json";

export type OpCode = (typeof OpCode)[keyof typeof OpCode];
export const OpCode = Object.freeze({
  INIT: 0,
  SET_PARENT_KEY: 1,
  CREATE_LIST: 2,
  UPDATE_OBJECT: 3,
  CREATE_OBJECT: 4,
  DELETE_CRDT: 5,
  DELETE_OBJECT_KEY: 6,
  CREATE_MAP: 7,
  CREATE_REGISTER: 8,
});

export namespace OpCode {
  export type INIT = typeof OpCode.INIT;
  export type SET_PARENT_KEY = typeof OpCode.SET_PARENT_KEY;
  export type CREATE_LIST = typeof OpCode.CREATE_LIST;
  export type UPDATE_OBJECT = typeof OpCode.UPDATE_OBJECT;
  export type CREATE_OBJECT = typeof OpCode.CREATE_OBJECT;
  export type DELETE_CRDT = typeof OpCode.DELETE_CRDT;
  export type DELETE_OBJECT_KEY = typeof OpCode.DELETE_OBJECT_KEY;
  export type CREATE_MAP = typeof OpCode.CREATE_MAP;
  export type CREATE_REGISTER = typeof OpCode.CREATE_REGISTER;
}

/**
 * These operations are the payload for {@link UpdateStorageServerMsg} messages
 * only.
 */
export type Op =
  | AckOp
  | CreateOp
  | UpdateObjectOp
  | DeleteCrdtOp
  | SetParentKeyOp // Only for lists!
  | DeleteObjectKeyOp;

export type CreateOp =
  | CreateObjectOp
  | CreateRegisterOp
  | CreateMapOp
  | CreateListOp;

export type UpdateObjectOp = {
  readonly opId?: string;
  readonly id: string;
  readonly type: OpCode.UPDATE_OBJECT;
  readonly data: Partial<JsonObject>;
};

export type CreateObjectOp = {
  readonly opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_OBJECT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: JsonObject;
};

export type CreateListOp = {
  readonly opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_LIST;
  readonly parentId: string;
  readonly parentKey: string;
};

export type CreateMapOp = {
  readonly opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_MAP;
  readonly parentId: string;
  readonly parentKey: string;
};

export type CreateRegisterOp = {
  readonly opId?: string;
  readonly id: string;
  readonly intent?: "set";
  readonly deletedId?: string;
  readonly type: OpCode.CREATE_REGISTER;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: Json;
};

export type DeleteCrdtOp = {
  readonly opId?: string;
  readonly id: string;
  readonly type: OpCode.DELETE_CRDT;
};

//
// HACK:
// Disguised as a "DeleteCrdtOp" for a nonexisting node "ACK", this Op that the
// server may return to senders is effectively sent as a backward-compatible
// way to trigger an acknowledgement for Ops that were seen by the server, but
// deliberately ignored.
//
export type AckOp = {
  readonly type: OpCode.DELETE_CRDT; // Not a typo!
  readonly id: "ACK";
  readonly opId: string;
};

export function isAckOp(op: Op): op is AckOp {
  return op.type === OpCode.DELETE_CRDT && op.id === "ACK";
}

export type SetParentKeyOp = {
  readonly opId?: string;
  readonly id: string;
  readonly type: OpCode.SET_PARENT_KEY;
  readonly parentKey: string;
};

export type DeleteObjectKeyOp = {
  readonly opId?: string;
  readonly id: string;
  readonly type: OpCode.DELETE_OBJECT_KEY;
  readonly key: string;
};
