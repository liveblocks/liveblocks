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

export type { AppOnlyAuthToken, AuthToken, RoomAuthToken } from "./AuthToken";
export { isAppOnlyAuthToken, isAuthToken, isRoomAuthToken } from "./AuthToken";
export type { Client } from "./client";
export { createClient } from "./client";
export {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "./immutable";
export { assertNever, nn } from "./lib/assert";
export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./lib/deprecation";
export { freeze } from "./lib/freeze";
export type { Json, JsonObject } from "./lib/Json";
export { isJsonArray, isJsonObject, isJsonScalar } from "./lib/Json";
export { asArrayWithLegacyMethods } from "./lib/LegacyArray";
export { comparePosition, makePosition } from "./lib/position";
export { shallow } from "./lib/shallow";
export { LiveList } from "./LiveList";
export { LiveMap } from "./LiveMap";
export { LiveObject } from "./LiveObject";
export type { BroadcastOptions, History, Room } from "./room";
export type { BaseUserMeta } from "./protocol/BaseUserMeta";
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  ClientMsgCode,
  FetchStorageClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
} from "./protocol/ClientMsg";
export type { Immutable } from "./types/Immutable";
export type {
  LiveNode,
  LiveStructure,
  Lson,
  LsonObject,
  ToJson,
} from "./types/Lson";
export type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap";
export type {
  CreateChildOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  CreateRootObjectOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  Op,
  SetParentKeyOp,
  UpdateObjectOp,
} from "./protocol/Op";
export { OpCode } from "./protocol/Op";
export type { Others } from "./types/Others";
export type { Resolve } from "./lib/Resolve";
export type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "./protocol/SerializedCrdt";
export { CrdtType } from "./protocol/SerializedCrdt";
export { isChildCrdt, isRootCrdt } from "./protocol/SerializedCrdt";
export type {
  BroadcastedEventServerMsg,
  InitialDocumentStateServerMsg,
  RoomStateServerMsg,
  ServerMsg,
  UpdatePresenceServerMsg,
  UpdateStorageServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
} from "./protocol/ServerMsg";
export { ServerMsgCode } from "./protocol/ServerMsg";
export type { StorageUpdate } from "./types/StorageUpdates";
export type { ToImmutable } from "./types/ToImmutable";
export type { User } from "./types/User";
export { WebsocketCloseCodes } from "./types/WebsocketCloseCodes";
export { b64decode, isPlainObject, tryParseJson } from "./utils";

/**
 * Helper type to help users adopt to Lson types from interface definitions.
 * You should only use this to wrap interfaces you don't control. For more
 * information, see
 * https://liveblocks.io/docs/guides/limits#lson-constraint-and-interfaces
 */
// prettier-ignore
export type EnsureJson<T> =
  // Retain `unknown` fields
  [unknown] extends [T] ? T :
  // Retain functions
  T extends (...args: unknown[]) => unknown ? T :
  // Resolve all other values explicitly
  { [K in keyof T]: EnsureJson<T[K]> };
