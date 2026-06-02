import type {
  Permission,
  RoomAccesses,
  RoomAccessesInput,
  RoomAccessesUpdateInput,
  RoomPermission,
  RoomPermissionInput,
  RoomPermissionObject,
} from "@liveblocks/core";

export {
  getRoomPermissionConflicts,
  normalizeRoomAccessesInput,
  normalizeRoomAccessesUpdateInput,
  normalizeRoomPermissionInput,
} from "@liveblocks/core";

export type RoomPermissionString = Permission;

export type {
  RoomAccesses,
  RoomAccessesInput,
  RoomAccessesUpdateInput,
  RoomPermission,
  RoomPermissionInput,
  RoomPermissionObject,
};
