import { RoomInfo } from "@liveblocks/node";
import { DocumentGroup } from "@/types";
import { getGroup } from "../database";
import { roomAccessesToDocumentAccess } from "./convertAccessType";

/**
 * Convert a Liveblocks room result into a list of DocumentGroups
 *
 * @param result - Liveblocks getRoomById() result
 */
export async function buildDocumentGroups(result: RoomInfo) {
  const groups: DocumentGroup[] = [];

  for (const [id, accessValue] of Object.entries(result.groupsAccesses)) {
    const group = await getGroup(id);

    if (group) {
      groups.push({
        ...group,
        access: roomAccessesToDocumentAccess(accessValue, false),
      });
    }
  }

  return groups;
}
