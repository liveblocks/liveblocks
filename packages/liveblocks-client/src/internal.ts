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
  lsonToJson,
  patchImmutableObject,
  patchLiveObjectKey,
} from "./immutable";
export { parseJson } from "./json";
export type {
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  Op,
  RoomStateServerMsg,
  SerializedCrdt,
  SerializedCrdtWithId,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  ServerMsg,
  SetParentKeyOp,
  UpdateObjectOp,
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
