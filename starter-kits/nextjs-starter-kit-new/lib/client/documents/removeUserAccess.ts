import {
  DocumentUser,
  FetchApiResult,
  RemoveUserAccessProps,
  RemoveUserRequest,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Remove User Access
 *
 * Remove a user from a given document with their userId
 * Uses custom API endpoint
 *
 * @param userId - The id of the removed user
 * @param documentId - The document id
 */
export async function removeUserAccess({
  userId,
  documentId,
}: RemoveUserAccessProps): Promise<FetchApiResult<DocumentUser[]>> {
  const url = `/documents/${documentId}/users`;

  const request: RemoveUserRequest = {
    userId,
  };

  return fetchApiEndpoint<DocumentUser[]>(url, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}
