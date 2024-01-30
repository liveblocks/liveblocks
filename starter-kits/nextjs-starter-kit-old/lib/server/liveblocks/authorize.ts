import { UserInfo } from "../../../liveblocks.config";
import { FetchApiResult, Room } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  groupIds?: string[];
  roomId: Room["id"];
  userId?: string;
  userInfo?: UserInfo;
}

/**
 * Authorize
 *
 * Authorize a user in your Liveblocks app. Used within liveblocks.config.ts
 * Uses Liveblocks API
 *
 * Similar to using `authorize` from `@liveblocks/node`:
 * https://liveblocks.io/docs/api-reference/liveblocks-node#authorize
 *
 * @param roomId - The current room's id
 * @param userId - The current user's id
 * @param groupIds - The current user's group ids
 * @param userInfo - The current user's user info
 */
export async function authorize({
  roomId,
  userId,
  groupIds,
  userInfo,
}: Props): Promise<FetchApiResult<{ token: string }>> {
  const url = `/v2/rooms/${roomId}/authorize`;

  const payload = JSON.stringify({
    roomId,
    userId,
    groupIds,
    userInfo,
  });

  return fetchLiveblocksApi<{ token: string }>(url, {
    method: "POST",
    body: payload,
  });
}
