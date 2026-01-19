import { RoomPermission } from "@liveblocks/node";
import { DocumentPermissionType } from "@/types";

/**
 * Convert from Liveblocks room accesses to document permission type
 * @param roomAccesses - The room access(es) to check
 */
export function roomAccessesToPermissionType(
  roomAccesses: RoomPermission
): DocumentPermissionType {
  if (!roomAccesses || roomAccesses.length === 0) {
    return "read";
  }

  if (roomAccesses[0] === "room:write") {
    return "write";
  }

  if (
    roomAccesses[0] === "room:read" &&
    roomAccesses[1] === "room:presence:write"
  ) {
    return "read";
  }

  return "read";
}

/**
 * Convert from document permission type to native Liveblocks room accesses
 * @param permissionType - The document permission type
 */
export function permissionTypeToRoomAccesses(
  permissionType: DocumentPermissionType
): RoomPermission {
  if (permissionType === "write") {
    return ["room:write"];
  }

  return ["room:read", "room:presence:write"];
}
