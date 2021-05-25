import { Presence } from "./types";

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

export type InitialDocumentStateMessage = {
  type: ServerMessageType.InitialStorageState;
  root: SerializedRecord | null;
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
  Record = 0,
  List = 1,
  Register = 2,
}

export type SerializedRecord = {
  id: string;
  type: CrdtType.Record;
  data: {
    [key: string]: SerializedCrdt;
  };
};

export type SerializedList = {
  id: string;
  type: CrdtType.List;
  data: {
    [position: string]: SerializedCrdt;
  };
};

export type SerializedRegister = {
  id?: string;
  type: CrdtType.Register;
  data: any;
};

export type SerializedCrdt =
  | SerializedRecord
  | SerializedList
  | SerializedRegister;

export enum OpType {
  Init = 100,

  ListInsert = 200,
  ListMove = 201,
  ListRemove = 202,

  RecordUpdate = 300,
}

export type Op = RecordUpdateOp | ListInsertOp | ListDeleteOp | ListMoveOp;

export type RecordUpdateOp = {
  id: string;
  type: OpType.RecordUpdate;
  data: {
    [key: string]: SerializedCrdt;
  };
};

export type ListInsertOp = {
  id: string;
  type: OpType.ListInsert;
  position: string;
  data: SerializedCrdt;
};

export type ListMoveOp = {
  id: string;
  type: OpType.ListMove;
  itemId: string;
  position: string;
};

export type ListDeleteOp = {
  id: string;
  type: OpType.ListRemove;
  itemId: string;
};

export enum WebsocketCloseCodes {
  CLOSE_ABNORMAL = 1006,

  INVALID_MESSAGE_FORMAT = 4000,
  NOT_ALLOWED = 4001,
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,
}
