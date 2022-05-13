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
  RoomStateMessage,
  SerializedCrdtWithId,
  ServerMessage,
} from "./live";
export type { Resolve, RoomInitializers } from "./types";

export { ClientMessageType, CrdtType, OpType, ServerMessageType } from "./live";
export { deprecate, deprecateIf } from "./deprecation";

export {
  lsonToJson,
  patchImmutableObject,
  patchLiveObjectKey,
} from "./immutable";
