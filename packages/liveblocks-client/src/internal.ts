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

export { assertNever, nn } from "./assert";
export type {
  AppOnlyAuthToken,
  AuthToken,
  RoomAuthToken,
  Scope,
} from "./AuthToken";
export {
  isAppOnlyAuthToken,
  isAuthToken,
  isRoomAuthToken,
  isScope,
} from "./AuthToken";
export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./deprecation";
export {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "./immutable";
export { asArrayWithLegacyMethods } from "./LegacyArray";
export { comparePosition, makePosition } from "./position";
export type {
  BroadcastedEventServerMsg,
  BroadcastEventClientMsg,
  ClientMsg,
  CreateChildOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  CreateRootObjectOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  FetchStorageClientMsg,
  IdTuple,
  InitialDocumentStateServerMsg,
  LiveNode,
  NodeMap,
  Op,
  ParentToChildNodeMap,
  Resolve,
  RoomInitializers,
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
  ToJson,
  UpdateObjectOp,
  UpdatePresenceClientMsg,
  UpdatePresenceServerMsg,
  UpdateStorageClientMsg,
  UpdateStorageServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
} from "./types";
export {
  ClientMsgCode,
  CrdtType,
  OpCode,
  ServerMsgCode,
  WebsocketCloseCodes,
} from "./types";
export type { ToImmutable } from "./types/Immutable";
export { isJsonArray, isJsonObject, isJsonScalar } from "./types/Json";
export { isChildCrdt, isRootCrdt } from "./types/SerializedCrdt";
export { b64decode, freeze, isPlainObject, tryParseJson } from "./utils";
