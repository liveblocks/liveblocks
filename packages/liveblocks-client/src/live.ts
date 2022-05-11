import type { Json, JsonObject } from "./json";

/**
 * Messages that can be sent from the server to the client.
 */
export type ServerMessage<TPresence extends JsonObject> =
  // For Presence
  | UpdatePresenceMessage<TPresence> // Broadcasted
  | UserJoinMessage // Broadcasted
  | UserLeftMessage // Broadcasted
  | EventMessage // Broadcasted
  | RoomStateMessage // For a single client

  // For Storage
  | InitialDocumentStateMessage // For a single client
  | UpdateStorageMessage; // Broadcasted

export enum ServerMessageType {
  UpdatePresence = 100,
  UserJoined = 101,
  UserLeft = 102,
  Event = 103,
  RoomState = 104,

  InitialStorageState = 200,
  UpdateStorage = 201,
}

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial state of the Room. The payload
 * includes a list of all other Users that already are in the Room.
 */
export type RoomStateMessage = {
  type: ServerMessageType.RoomState;
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
export type UpdatePresenceMessage<TPresence extends JsonObject> = {
  type: ServerMessageType.UpdatePresence;
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
export type UserJoinMessage = {
  type: ServerMessageType.UserJoined;
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
export type UserLeftMessage = {
  type: ServerMessageType.UserLeft;
  actor: number;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User broadcasted an Event to everyone in the Room.
 */
export type EventMessage = {
  type: ServerMessageType.Event;
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

export type SerializedCrdtWithId = [id: string, crdt: SerializedCrdt];

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial Storage state of the Room. The
 * payload includes the entire Storage document.
 */
export type InitialDocumentStateMessage = {
  type: ServerMessageType.InitialStorageState;
  items: SerializedCrdtWithId[];
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a change occurred in the Storage document.
 *
 * The payload of this message contains a list of Ops (aka incremental
 * mutations to make to the initially loaded document).
 */
export type UpdateStorageMessage = {
  type: ServerMessageType.UpdateStorage;
  ops: Op[];
};

/**
 * Messages that can be sent from the client to the server.
 */
export type ClientMessage<TPresence extends JsonObject> =
  | ClientEventMessage
  | UpdatePresenceClientMessage<TPresence>
  | UpdateStorageClientMessage
  | FetchStorageClientMessage;

export enum ClientMessageType {
  UpdatePresence = 100,
  ClientEvent = 103,

  FetchStorage = 200,
  UpdateStorage = 201,
}

export type ClientEventMessage = {
  type: ClientMessageType.ClientEvent;
  event: Json;
};

export type UpdatePresenceClientMessage<TPresence extends JsonObject> = {
  type: ClientMessageType.UpdatePresence;
  data: TPresence;
  targetActor?: number;
};

export type UpdateStorageClientMessage = {
  type: ClientMessageType.UpdateStorage;
  ops: Op[];
};

export type FetchStorageClientMessage = {
  type: ClientMessageType.FetchStorage;
};

export enum CrdtType {
  Object = 0,
  List = 1,
  Map = 2,
  Register = 3,
}

export type SerializedObject = {
  type: CrdtType.Object;
  parentId?: string;
  parentKey?: string;
  data: JsonObject;
};

export type SerializedList = {
  type: CrdtType.List;
  parentId: string;
  parentKey: string;
};

export type SerializedMap = {
  type: CrdtType.Map;
  parentId: string;
  parentKey: string;
};

export type SerializedRegister = {
  type: CrdtType.Register;
  parentId: string;
  parentKey: string;
  data: Json;
};

export type SerializedCrdt =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export enum OpType {
  Init = 0,
  SetParentKey = 1,
  CreateList = 2,
  UpdateObject = 3,
  CreateObject = 4,
  DeleteCrdt = 5,
  DeleteObjectKey = 6,
  CreateMap = 7,
  CreateRegister = 8,
}

/**
 * These operations are the payload for {@link UpdateStorageMessage} messages
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
  type: OpType.UpdateObject;
  data: Partial<JsonObject>;
};

export type CreateObjectOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpType.CreateObject;
  parentId?: string;
  parentKey?: string;
  data: JsonObject;
};

export type CreateListOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpType.CreateList;
  parentId: string;
  parentKey: string;
};

export type CreateMapOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpType.CreateMap;
  parentId: string;
  parentKey: string;
};

export type CreateRegisterOp = {
  opId?: string;
  id: string;
  intent?: "set";
  type: OpType.CreateRegister;
  parentId: string;
  parentKey: string;
  data: Json;
};

export type DeleteCrdtOp = {
  opId?: string;
  id: string;
  type: OpType.DeleteCrdt;
};

export type SetParentKeyOp = {
  opId?: string;
  id: string;
  type: OpType.SetParentKey;
  parentKey: string;
};

export type DeleteObjectKeyOp = {
  opId?: string;
  id: string;
  type: OpType.DeleteObjectKey;
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
