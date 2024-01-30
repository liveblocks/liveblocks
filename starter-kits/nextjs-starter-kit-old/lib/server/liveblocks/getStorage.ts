import { FetchApiResult, GetStorageResponse } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  roomId: string;
}

/**
 * Get Storage
 *
 * Get a room's storage as a JS object
 * Note that this returns an object using the Liveblocks data structure
 * Uses Liveblocks API
 *
 * @param roomId - The id of the room
 */
export async function getStorage({
  roomId,
}: Props): Promise<FetchApiResult<GetStorageResponse>> {
  const url = `/v2/rooms/${roomId}/storage`;

  const { data, error } = await fetchLiveblocksApi<GetStorageResponse>(url);

  if (error) {
    return { error };
  }

  return { data: data ?? {} };
}
