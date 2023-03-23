import { Document, DocumentRoomMetadata, Room } from "../../../types";
import { roomAccessesToDocumentAccess } from "./convertAccessType";

/**
 * Convert Liveblocks rooms into our custom document format
 *
 * @param rooms - Liveblocks rooms
 */
export function buildDocuments(rooms: Room[]): Document[] {
  if (!rooms) return [];

  const documents: Document[] = rooms.map((x) => {
    return buildDocument(x);
  });

  return documents;
}

export function buildDocument(room: Room): Document {
  let name: Document["name"] = "Untitled";
  let owner: Document["owner"] = "";
  let draft: Document["draft"] = false;

  // Get document info from metadata
  const metadata: DocumentRoomMetadata = room.metadata;

  if (metadata.name) {
    name = metadata.name;
  }

  if (metadata.owner) {
    owner = metadata.owner;
  }

  if (metadata.draft === "yes") {
    draft = true;
  }

  // Get default, group, and user access from metadata
  const defaultAccess: Document["accesses"]["default"] =
    roomAccessesToDocumentAccess(room.defaultAccesses);

  const groups: Document["accesses"]["groups"] = {};
  Object.entries(room.groupsAccesses).map(([id, accessValue]) => {
    if (accessValue) {
      groups[id] = roomAccessesToDocumentAccess(accessValue);
    }
  });

  const users: Document["accesses"]["users"] = {};
  Object.entries(room.usersAccesses).map(([id, accessValue]) => {
    if (accessValue) {
      users[id] = roomAccessesToDocumentAccess(accessValue);
    }
  });

  // Return our custom Document format
  const document: Document = {
    id: room.id,
    created: (room.createdAt
      ? new Date(room.createdAt)
      : new Date()
    ).toString(),
    lastConnection: new Date(room.lastConnectionAt).toString(),
    type: metadata.type,
    name,
    owner,
    draft,
    accesses: {
      default: defaultAccess,
      groups: groups,
      users: users,
    },
  };

  return document;
}
