import {
  DocumentUser,
  FetchApiResult,
  UpdateUserAccessProps,
  UpdateUserRequest,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Update User Access
 *
 * Add a collaborator to a given document with their userId
 * Uses custom API endpoint
 *
 * @param userId - The id of the invited user
 * @param documentId - The document id
 * @param access - The access level of the user
 */
export async function updateUserAccess({
  userId,
  documentId,
  access,
}: UpdateUserAccessProps): Promise<FetchApiResult<DocumentUser[]>> {
  const url = `/documents/${documentId}/users`;

  const request: UpdateUserRequest = {
    userId,
    access,
  };

  return fetchApiEndpoint<DocumentUser[]>(url, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
