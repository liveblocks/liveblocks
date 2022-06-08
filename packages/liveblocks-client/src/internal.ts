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

export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./deprecation";
export {
  isAppOnlyAuthToken,
  isAuthToken,
  isRoomAuthToken,
  isScope,
  parseAuthToken,
} from "./AuthToken";
export type {
  AppOnlyAuthToken,
  AuthToken,
  RoomAuthToken,
  Scope,
} from "./AuthToken";
export {
  lsonToJson,
  patchImmutableObject,
  patchLiveObjectKey,
} from "./immutable";
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  CreateChildOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateRegisterOp,
  CreateRootObjectOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  FetchStorageClientMsg,
  IdTuple,
  InitialDocumentStateServerMsg,
  NodeMap,
  Op,
  ParentToChildNodeMap,
  RoomStateServerMsg,
  SerializedChild,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
  ServerMsg,
  SetParentKeyOp,
  UpdateObjectOp,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UserJoinServerMsg,
} from "./live";
export {
  ClientMsgCode,
  CrdtType,
  OpCode,
  ServerMsgCode,
  WebsocketCloseCodes,
} from "./live";
export { comparePosition, makePosition } from "./position";
export type { Resolve, RoomInitializers } from "./types";
export { isChildCrdt, isRootCrdt } from "./live";
export { assertNever, b64decode, tryParseJson } from "./utils";
export { isJsonArray, isJsonObject, isJsonScalar } from "./json";
