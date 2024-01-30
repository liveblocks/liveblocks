import { DocumentAccess, RoomAccess } from "../../../types";

/**
 * Convert from Liveblocks room accesses to a custom document access format
 * If the user was set on userAccesses, give FULL permissions to edit invited users
 * @param roomAccesses - The room access(es) to check
 * @param setOnUserAccesses - If the user was set with userAccesses or not
 */
export function roomAccessesToDocumentAccess(
  roomAccesses: RoomAccess | RoomAccess[] | null,
  setOnUserAccesses = false
): DocumentAccess {
  if (!roomAccesses) {
    return DocumentAccess.NONE;
  }

  if (!Array.isArray(roomAccesses)) {
    roomAccesses = [roomAccesses];
  }

  if (roomAccesses.includes(RoomAccess.RoomWrite)) {
    return setOnUserAccesses ? DocumentAccess.FULL : DocumentAccess.EDIT;
  }

  if (
    roomAccesses.includes(RoomAccess.RoomRead) &&
    roomAccesses.includes(RoomAccess.RoomPresenceWrite)
  ) {
    return DocumentAccess.READONLY;
  }

  return DocumentAccess.NONE;
}

/**
 * Convert from a custom document access format to native Liveblocks room accesses
 * @param documentAccess
 */
export function documentAccessToRoomAccesses(
  documentAccess: DocumentAccess
): RoomAccess[] {
  if (
    documentAccess === DocumentAccess.FULL ||
    documentAccess === DocumentAccess.EDIT
  ) {
    return [RoomAccess.RoomWrite];
  }

  if (documentAccess === DocumentAccess.READONLY) {
    return [RoomAccess.RoomRead, RoomAccess.RoomPresenceWrite];
  }

  return [];
}
