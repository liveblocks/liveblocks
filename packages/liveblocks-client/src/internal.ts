/**
 * PRIVATE / INTERNAL APIS
 * -----------------------
 *
 * This module is intended for internal use only, PLEASE DO NOT RELY ON ANY OF
 * THE EXPORTS IN HERE. These are implementation details that can change at any
 * time and without announcement. This module purely exists to share code
 * between the several Liveblocks packages.
 *
 * But since you're so deep inside Liveblocks code... we're hiring!
 * https://join.team/liveblocks ;)
 */

export type {
  ClientEventMessage,
  ClientMessage,
  ClientMessageType,
  CrdtType,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  EventMessage,
  FetchStorageClientMessage,
  InitialDocumentStateMessage,
  Op,
  OpType,
  RoomStateMessage,
  SerializedCrdt,
  SerializedCrdtWithId,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  ServerMessage,
  ServerMessageType,
  SetParentKeyOp,
  UpdateObjectOp,
  UpdatePresenceClientMessage,
  UpdatePresenceMessage,
  UpdateStorageClientMessage,
  UpdateStorageMessage,
  UserJoinMessage,
  UserLeftMessage,
  WebsocketCloseCodes,
} from "./live";

export { min, max, makePosition, posCodes, pos, compare } from "./position";

export { deprecate, deprecateIf } from "./utils";

export {
  liveObjectToJson,
  lsonToJson,
  patchLiveList,
  patchImmutableObject,
  patchLiveObject,
  patchLiveObjectKey,
} from "./immutable";

export type { Resolve } from "./types";
