import { FetchApiResult, RoomActiveUser } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  roomId: string;
}

/**
 * Get Active Users
 *
 * Get the active users in a room, given a roomId
 * Uses Liveblocks API
 *
 * @param roomId - The id of the room
 */
export async function getActiveUsers({
  roomId,
}: Props): Promise<FetchApiResult<RoomActiveUser[]>> {
  const url = `/v2/rooms/${roomId}/active_users`;

  const { data, error } = await fetchLiveblocksApi<{ data: RoomActiveUser[] }>(
    url
  );

  if (error) {
    return { error };
  }

  return { data: data?.data ?? [] };
}
