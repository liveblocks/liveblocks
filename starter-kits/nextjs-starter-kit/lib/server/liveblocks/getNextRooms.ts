import { FetchApiResult, GetRoomsResponse } from "../../../types";
import { fetchLiveblocksApi } from "../utils";

interface Props {
  next: string;
}

/**
 * Get Next Rooms
 *
 * Get the next rooms from the next param
 * The `next` param is retrieved from /pages/api/documents/index.ts
 * That API is called on the client within /lib/client/getDocumentsByGroup.ts
 * Uses Liveblocks API
 *
 * @param next - String containing a URL to get the next set of rooms, returned from Liveblocks API
 */
export async function getNextRoom({
  next,
}: Props): Promise<FetchApiResult<GetRoomsResponse>> {
  return fetchLiveblocksApi<GetRoomsResponse>(next);
}
