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
  Record = 0,
  List = 1,
}

export type SerializedRecord = {
  type: CrdtType.Record;
  parentId?: string;
  parentKey?: string;
  data: {
    [key: string]: any; // TODO
  };
};

export type SerializedList = {
  type: CrdtType.List;
  parentId: string;
  parentKey: string;
};

export type SerializedCrdt = SerializedRecord | SerializedList;

export enum OpType {
  Init = 0,
  SetParentKey = 1,
  CreateList = 2,
  UpdateRecord = 3,
  CreateRecord = 4,
  DeleteRecord = 5,
  DeleteRecordKey = 6,
}

export type Op =
  | CreateRecordOp
  | RecordUpdateOp
  | DeleteRecordOp
  | CreateListOp
  | SetParentKeyOp
  | DeleteRecordKeyOp;

export type RecordUpdateOp = {
  id: string;
  type: OpType.UpdateRecord;
  data: {
    [key: string]: any; // TODO
  };
};

export type CreateRecordOp = {
  id: string;
  type: OpType.CreateRecord;
  parentId?: string;
  parentKey?: string;
  data: {
    [key: string]: any; // TODO
  };
};

export type CreateListOp = {
  id: string;
  type: OpType.CreateList;
  parentId: string;
  parentKey: string;
};

export type DeleteRecordOp = {
  id: string;
  type: OpType.DeleteRecord;
};

export type SetParentKeyOp = {
  id: string;
  type: OpType.SetParentKey;
  parentKey: string;
};

export type DeleteRecordKeyOp = {
  id: string;
  type: OpType.DeleteRecordKey;
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
}
