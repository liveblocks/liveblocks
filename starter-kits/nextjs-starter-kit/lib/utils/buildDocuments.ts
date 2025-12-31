import { RoomData } from "@liveblocks/node";
import { Document, DocumentRoomMetadata } from "@/types";
import { roomAccessesToDocumentAccess } from "./convertAccessType";

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
  let name: Document["name"] = "Untitled";
  let owner: Document["owner"] = "";

  // Get document info from metadata
  const metadata = room.metadata as DocumentRoomMetadata;

  if (metadata.name) {
    name = metadata.name;
  }

  if (metadata.owner) {
    owner = metadata.owner;
  }

  // Get default and user access from metadata
  const defaultAccess: Document["accesses"]["default"] =
    roomAccessesToDocumentAccess(room.defaultAccesses);

  const users: Document["accesses"]["users"] = {};
  Object.entries(room.usersAccesses).map(([id, accessValue]) => {
    if (accessValue) {
      // @ts-ignore
      users[id] = roomAccessesToDocumentAccess(accessValue);
    }
  });

  const created = room.createdAt.toString();
  const lastConnection = room.lastConnectionAt
    ? room.lastConnectionAt.toString()
    : created;

  // Return our custom Document format
  return {
    id: room.id,
    created,
    lastConnection,
    type: metadata.type,
    name,
    owner,
    accesses: {
      default: defaultAccess,
      users: users,
    },
  };
}
