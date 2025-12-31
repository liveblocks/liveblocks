import { RoomData } from "@liveblocks/node";
import {
  Document,
  DocumentPermissionType,
  DocumentPermissions,
  DocumentRoomMetadata,
} from "@/types";
import { roomAccessesToPermissionType } from "./convertAccessType";

/**
 * Convert Liveblocks rooms into our custom document format
 *
 * @param rooms - Liveblocks rooms
 */
export function buildDocuments(rooms: RoomData[]): Document[] {
  if (!rooms) return [];

  return rooms.map((x) => {
    return buildDocument(x);
  });
}

export function buildDocument(room: RoomData): Document {
  // Get document info from metadatachat
  const metadata = room.metadata as DocumentRoomMetadata;

  // Check all metadata fields exist
  const requiredKeys = ["name", "owner", "permissionGroup", "permissionType"];
  if (
    !requiredKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(metadata, key)
    )
  ) {
    throw new Error(
      `Missing required metadata fields here: ${JSON.stringify(metadata)}`
    );
  }

  // Add times to document
  const created = room.createdAt.toString();
  const lastConnection = room.lastConnectionAt
    ? room.lastConnectionAt.toString()
    : created;

  // Add general permissions
  const generalPermissions: DocumentPermissions = {
    group: metadata.permissionGroup,
    type: metadata.permissionType,
  };

  // Add individual user permissions
  const userPermissions: Record<string, DocumentPermissionType> = {};
  for (const [userId, accessValue] of Object.entries(room.usersAccesses)) {
    userPermissions[userId] = roomAccessesToPermissionType(accessValue);
  }

  // Return our custom Document format
  return {
    id: room.id,
    created,
    lastConnection,
    type: metadata.type,
    name: metadata.name || "Untitled",
    owner: metadata.owner,
    generalPermissions,
    userPermissions,
  };
}
