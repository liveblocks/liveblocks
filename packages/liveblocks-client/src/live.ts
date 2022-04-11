import { Presence, JSONObject, JSONValue } from "./types";

export type ServerMessage =
  | UpdatePresenceMessage
  | UserJoinMessage
  | UserLeftMessage
  | EventMessage
  | RoomStateMessage
  | InitialDocumentStateMessage
  | UpdateStorageMessage;

export enum ServerMessageType {
  UpdatePresence = 100,
  UserJoined = 101,
  UserLeft = 102,
  Event = 103,
  RoomState = 104,

  InitialStorageState = 200,
  UpdateStorage = 201,
}

export type RoomStateMessage = {
  type: ServerMessageType.RoomState;
  users: {
    [actor: number]: {
      id?: string;
      info?: any;
    };
  };
};

export type UpdatePresenceMessage = {
  type: ServerMessageType.UpdatePresence;
  actor: number;
  data: Presence;
  targetActor?: number;
};

export type UserJoinMessage = {
  type: ServerMessageType.UserJoined;
  actor: number;
  id?: string;
  info?: string;
};

export type UserLeftMessage = {
  type: ServerMessageType.UserLeft;
  actor: number;
};

export type EventMessage = {
  type: ServerMessageType.Event;
  actor: number;
  event: any;
};

export type SerializedCrdtWithId = [id: string, crdt: SerializedCrdt];

export type InitialDocumentStateMessage = {
  type: ServerMessageType.InitialStorageState;
  items: SerializedCrdtWithId[];
};

export type UpdateStorageMessage = {
  type: ServerMessageType.UpdateStorage;
  ops: Op[];
};

export type ClientMessage =
  | ClientEventMessage
  | UpdatePresenceClientMessage
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
  event: any;
};

export type UpdatePresenceClientMessage = {
  type: ClientMessageType.UpdatePresence;
  data: Presence;
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
  data: JSONObject;
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
  data: JSONValue;
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

export type Op =
  | CreateObjectOp
  | UpdateObjectOp
  | DeleteCrdtOp
  | CreateListOp
  | SetParentKeyOp
  | DeleteObjectKeyOp
  | CreateMapOp
  | CreateRegisterOp;

export type UpdateObjectOp = {
  opId?: string;
  id: string;
  type: OpType.UpdateObject;
  data: JSONObject;
};

export type CreateObjectOp = {
  opId?: string;
  id: string;
  type: OpType.CreateObject;
  parentId?: string;
  parentKey?: string;
  data: JSONObject;
};

export type CreateListOp = {
  opId?: string;
  id: string;
  type: OpType.CreateList;
  parentId: string;
  parentKey: string;
};

export type CreateMapOp = {
  opId?: string;
  id: string;
  type: OpType.CreateMap;
  parentId: string;
  parentKey: string;
};

export type CreateRegisterOp = {
  opId?: string;
  id: string;
  type: OpType.CreateRegister;
  parentId: string;
  parentKey: string;
  data: JSONValue;
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
