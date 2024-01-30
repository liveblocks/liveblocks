import {
  FetchApiResult,
  LiveUsersResponse,
  RoomActiveUser,
} from "../../../types";
import { getActiveUsers } from "./getActiveUsers";

interface Props {
  roomIds: string[];
}

/**
 * Get Active Users in Rooms
 *
 * Get the active users in a list of rooms, given roomIds
 * Uses Liveblocks API
 *
 * @param roomId - The ids of the rooms
 */
export async function getActiveUsersInRooms({
  roomIds,
}: Props): Promise<FetchApiResult<LiveUsersResponse[]>> {
  const promises: Promise<FetchApiResult<RoomActiveUser[]>>[] = [];

  // Call Liveblocks API for each room
  for (const roomId of roomIds) {
    promises.push(getActiveUsers({ roomId: roomId }));
  }

  const currentActiveUsers = await Promise.all(promises);
  const result: LiveUsersResponse[] = [];

  // Add active user info to list ready to return
  for (const [i, roomId] of roomIds.entries()) {
    const { data, error } = currentActiveUsers[i];

    if (error) {
      return { error };
    }

    const users = data ?? [];

    result.push({
      documentId: roomId,
      users: users,
    });
  }

  return { data: result };
}
