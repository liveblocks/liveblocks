import { DocumentUser, Room } from "../../../types";
import { getUser } from "../database";
import { roomAccessesToDocumentAccess } from "./convertAccessType";

/**
 * Convert a Liveblocks room result into a list of DocumentUsers
 *
 * @param result - Liveblocks getRoomById() result
 * @param userId - The current user's id
 */
export async function buildDocumentUsers(result: Room, userId: string) {
  const users: DocumentUser[] = [];

  for (const [id, accessValue] of Object.entries(result.usersAccesses)) {
    const user = await getUser(id);

    if (user) {
      users.push({
        ...user,
        access: roomAccessesToDocumentAccess(accessValue, true),
        isCurrentUser: id === userId,
      });
    }
  }

  return users;
}
