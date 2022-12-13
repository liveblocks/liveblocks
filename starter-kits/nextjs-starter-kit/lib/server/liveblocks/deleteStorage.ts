import { FetchApiResult, Room } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  roomId: string;
}

/**
 * Delete Storage
 *
 * Delete the storage by the room's id
 * Uses Liveblocks API
 *
 * @param roomId - The id of the room
 */
export async function deleteStorage({
  roomId,
}: Props): Promise<FetchApiResult<Room>> {
  const url = `/v2/rooms/${roomId}/storage`;
  return fetchLiveblocksApi<Room>(url, {
    method: "DELETE",
  });
}
