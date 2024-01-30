import { FetchApiResult, Room } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  roomId: string;
}

/**
 * Get Room
 *
 * Get the room by the room's id
 * Uses Liveblocks API
 *
 * @param roomId - The id of the room
 */
export async function getRoom({
  roomId,
}: Props): Promise<FetchApiResult<Room>> {
  const url = `/v2/rooms/${roomId}`;
  return fetchLiveblocksApi<Room>(url);
}
