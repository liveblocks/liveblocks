import { FetchApiResult, GetRoomsResponse, RoomMetadata } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  groupIds?: string[] | string;
  limit?: number;
  metadata?: RoomMetadata;
  startingAfter?: string;
  userId?: string;
}

/**
 * Get Rooms
 *
 * Get a list of rooms
 * Uses Liveblocks API
 *
 * @param limit - The amount of rooms to load, between 1 and 100, defaults to 20
 * @param startingAfter - A cursor used for pagination, get the value from the response of the previous page
 * @param userId - The id of the user to filter
 * @param groupIds - The group to filter
 * @param metadata - The metadata to filter
 */
export async function getRooms({
  limit,
  startingAfter,
  userId,
  groupIds,
  metadata,
}: Props): Promise<FetchApiResult<GetRoomsResponse>> {
  let url = `/v2/rooms?`;

  if (limit) {
    url += `&limit=${limit}`;
  }

  if (startingAfter) {
    url += `&startingAfter=${startingAfter}`;
  }

  if (userId) {
    url += `&userId=${userId}`;
  }

  if (groupIds && groupIds.length > 0) {
    url += `&groupIds=${groupIds}`;
  }

  if (metadata) {
    Object.entries(metadata).forEach(([key, val]) => {
      url += `&metadata.${key}=${val}`;
    });
  }

  return fetchLiveblocksApi<GetRoomsResponse>(url);
}
