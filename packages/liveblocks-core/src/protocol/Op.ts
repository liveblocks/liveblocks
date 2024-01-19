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

/**
 * Create an Op that can be used as an acknowledgement for the given opId, to
 * send back to the originating client in cases where the server decided to
 * ignore the Op and not forward it.
 *
 * Why?
 * It's important for the client to receive an acknowledgement for this, so
 * that it can correctly update its own unacknowledged Ops administration.
 * Otherwise it could get in "synchronizing" state indefinitely.
 *
 * CLEVER HACK
 * Introducing a new Op type for this would not be backward-compatible as
 * receiving such Op would crash old clients :(
 * So the clever backward-compatible hack pulled here is that we codify the
 * acknowledgement as a "deletion Op" for the non-existing node id "ACK". In
 * old clients such Op is accepted, but will effectively be a no-op as that
 * node does not exist, but as a side-effect the Op will get acknowledged.
 */
export function ackOp(opId: string): AckOp {
  return {
    type: OpCode.DELETE_CRDT,
    id: "ACK", // (H)ACK
    opId,
  };
}

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
