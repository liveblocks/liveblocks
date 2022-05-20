import type { Json, JsonObject } from "./json";

export type IdTuple<T> = [id: string, value: T];

/**
 * Lookup table for nodes (= SerializedCrdt values) by their IDs.
 */
export type NodeMap = Map<
  string, // Node ID
  SerializedCrdt
>;

/**
 * Reverse lookup table for all child nodes (= list of SerializedCrdt values)
 * by their parent node's IDs.
 */
export type ParentToChildNodeMap = Map<
  string, // Parent's node ID
  IdTuple<SerializedChild>[]
>;

/**
 * Messages that can be sent from the server to the client.
 */
export type ServerMsg<TPresence extends JsonObject> =
  // For Presence
  | UpdatePresenceServerMsg<TPresence> // Broadcasted
  | UserJoinServerMsg // Broadcasted
  | UserLeftServerMsg // Broadcasted
  | BroadcastedEventServerMsg // Broadcasted
  | RoomStateServerMsg // For a single client

  // For Storage
  | InitialDocumentStateServerMsg // For a single client
  | UpdateStorageServerMsg; // Broadcasted

export enum ServerMsgCode {
  UPDATE_PRESENCE = 100,
  USER_JOINED = 101,
  USER_LEFT = 102,
  BROADCASTED_EVENT = 103,
  ROOM_STATE = 104,

  INITIAL_STORAGE_STATE = 200,
  UPDATE_STORAGE = 201,
}

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial state of the Room. The payload
 * includes a list of all other Users that already are in the Room.
 */
export type RoomStateServerMsg = {
  type: ServerMsgCode.ROOM_STATE;
  users: {
    [actor: number]: {
      id?: string;
      info?: Json;
    };
  };
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User updated their presence. For example, when a user moves their cursor.
 *
 * In most cases, the data payload will only include the fields from the
 * Presence that have been changed since the last announcement. However, after
 * a new user joins a room, a "full presence" will be announced so the newly
 * connected user will get each other's user full presence at least once. In
 * those cases, the `targetActor` field indicates the newly connected client,
 * so all other existing clients can ignore this broadcasted message.
 */
export type UpdatePresenceServerMsg<TPresence extends JsonObject> = {
  type: ServerMsgCode.UPDATE_PRESENCE;
  /**
   * The User whose Presence has changed.
   */
  actor: number;
  /**
   * The partial or full Presence of a User. If the `targetActor` field is set,
   * this will be the full Presence, otherwise it only contain the fields that
   * have changed since the last broadcast.
   */
  data: TPresence;
  /**
   * If this message was sent in response to a newly joined user, this field
   * indicates which client this message is for. Other existing clients may
   * ignore this message if this message isn't targeted for them.
   */
  targetActor?: number;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has joined the Room.
 */
export type UserJoinServerMsg = {
  type: ServerMsgCode.USER_JOINED;
  actor: number;
  /**
   * The id of the User that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  id?: string;
  /**
   * Additional user information that has been set in the authentication
   * endpoint.
   */
  info?: Json;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has left the Room.
 */
export type UserLeftServerMsg = {
  type: ServerMsgCode.USER_LEFT;
  actor: number;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User broadcasted an Event to everyone in the Room.
 */
export type BroadcastedEventServerMsg = {
  type: ServerMsgCode.BROADCASTED_EVENT;
  /**
   * The User who broadcasted the Event.
   */
  actor: number;
  /**
   * The arbitrary payload of the Event. This can be any JSON value. Clients
   * will have to manually verify/decode this event.
   */
  event: Json;
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial Storage state of the Room. The
 * payload includes the entire Storage document.
 */
export type InitialDocumentStateServerMsg = {
  type: ServerMsgCode.INITIAL_STORAGE_STATE;
  items: IdTuple<SerializedCrdt>[];
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a change occurred in the Storage document.
 *
 * The payload of this message contains a list of Ops (aka incremental
 * mutations to make to the initially loaded document).
 */
export type UpdateStorageServerMsg = {
  type: ServerMsgCode.UPDATE_STORAGE;
  ops: Op[];
};

/**
 * Messages that can be sent from the client to the server.
 */
export type ClientMsg<TPresence extends JsonObject> =
  | BroadcastEventClientMsg
  | UpdatePresenceClientMsg<TPresence>
  | UpdateStorageClientMsg
  | FetchStorageClientMsg;

export enum ClientMsgCode {
  UPDATE_PRESENCE = 100,
  BROADCAST_EVENT = 103,

  FETCH_STORAGE = 200,
  UPDATE_STORAGE = 201,
}

export type BroadcastEventClientMsg = {
  type: ClientMsgCode.BROADCAST_EVENT;
  event: Json;
};

export type UpdatePresenceClientMsg<TPresence extends JsonObject> = {
  type: ClientMsgCode.UPDATE_PRESENCE;
  data: TPresence;
  targetActor?: number;
};

export type UpdateStorageClientMsg = {
  type: ClientMsgCode.UPDATE_STORAGE;
  ops: Op[];
};

export type FetchStorageClientMsg = {
  type: ClientMsgCode.FETCH_STORAGE;
};

export enum CrdtType {
  OBJECT = 0,
  LIST = 1,
  MAP = 2,
  REGISTER = 3,
}

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

export type SerializedCrdt = SerializedRootObject | SerializedChild;

export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export function isRootCrdt(crdt: SerializedCrdt): crdt is SerializedRootObject {
  return crdt.type === CrdtType.OBJECT && !isChildCrdt(crdt);
}

export function isChildCrdt(crdt: SerializedCrdt): crdt is SerializedChild {
  return crdt.parentId !== undefined && crdt.parentKey !== undefined;
}

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
  | CreateObjectOp
  | UpdateObjectOp
  | DeleteCrdtOp
  | CreateListOp
  | SetParentKeyOp // Only for lists!
  | DeleteObjectKeyOp
  | CreateMapOp
  | CreateRegisterOp;

export type CreateOp =
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
  type: OpCode.CREATE_OBJECT;
  parentId?: string;
  parentKey?: string;
  data: JsonObject;
};

export type CreateListOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpCode.CREATE_LIST;
  parentId: string;
  parentKey: string;
};

export type CreateMapOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpCode.CREATE_MAP;
  parentId: string;
  parentKey: string;
};

export type CreateRegisterOp = {
  opId?: string;
  id: string;
  intent?: "set";
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

export enum WebsocketCloseCodes {
  CLOSE_ABNORMAL = 1006,

  INVALID_MESSAGE_FORMAT = 4000,
  NOT_ALLOWED = 4001,
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,
  CLOSE_WITHOUT_RETRY = 4999,
}
