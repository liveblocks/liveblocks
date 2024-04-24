import { RoomInfo } from "@liveblocks/node";
import { getUser } from "@/lib/database/getUser";
import { roomAccessesToDocumentAccess } from "@/lib/utils/convertAccessType";
import { DocumentUser } from "@/types";

/**
 * Convert a Liveblocks room result into a list of DocumentUsers
 *
 * @param result - Liveblocks getRoomById() result
 * @param userId - The current user's id
 */
export async function buildDocumentUsers(result: RoomInfo, userId: string) {
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
