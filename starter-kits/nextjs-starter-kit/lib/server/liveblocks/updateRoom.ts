import { FetchApiResult, Room } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  defaultAccesses?: Room["defaultAccesses"];
  groupsAccesses?: Room["groupsAccesses"];
  metadata?: Room["metadata"];
  roomId: Room["id"];
  usersAccesses?: Room["usersAccesses"];
}

/**
 * Update Room
 *
 * Get the room by the room's id
 * Uses Liveblocks API
 *
 * @param roomId - The id/name of the room
 * @param metadata - The room's metadata object
 * @param usersAccesses - The room's user accesses
 * @param groupsAccesses - The room's group accesses
 * @param defaultAccesses - The default access value
 */
export async function updateRoom({
  roomId,
  metadata,
  usersAccesses,
  groupsAccesses,
  defaultAccesses,
}: Props): Promise<FetchApiResult<Room>> {
  const url = `/v2/rooms/${roomId}`;

  let payload = {};

  if (metadata) {
    payload = { ...payload, metadata };
  }

  if (usersAccesses) {
    payload = { ...payload, usersAccesses };
  }

  if (groupsAccesses) {
    payload = { ...payload, groupsAccesses };
  }

  if (defaultAccesses) {
    payload = { ...payload, defaultAccesses };
  }

  return fetchLiveblocksApi<Room>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
