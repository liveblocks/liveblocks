import { FetchApiResult, GetStorageResponse } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  roomId: string;
  storage?: Record<string, unknown>;
}

/**
 * Initialize Storage
 *
 * Initialize a room's storage and return the value as a JS object
 * The room must already exist and have an empty storage
 * Uses Liveblocks API
 *
 * @param roomId - The id of the room
 * @param storage - The Liveblocks format storage object to initialize the storage
 */
export async function initializeStorage({
  roomId,
  storage,
}: Props): Promise<FetchApiResult<GetStorageResponse>> {
  const url = `/v2/rooms/${roomId}/storage`;

  const payload = storage ? JSON.stringify(storage) : undefined;

  const { data, error } = await fetchLiveblocksApi<GetStorageResponse>(url, {
    method: "POST",
    body: payload,
  });

  if (error) {
    return { error };
  }

  return { data: data ?? {} };
}
