import {
  FetchApiResult,
  GetLiveUsersProps,
  LiveUsersResponse,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Live Users
 *
 * Get the online users in the documents passed
 * Uses custom API endpoint
 *
 * @param documentIds - An array of document ids
 */
export async function getLiveUsers({
  documentIds,
}: GetLiveUsersProps): Promise<FetchApiResult<LiveUsersResponse[]>> {
  const url = "/documents/liveUsers";
  return fetchApiEndpoint<LiveUsersResponse[]>(url, {
    method: "POST",
    body: JSON.stringify(documentIds),
  });
}
