import {
  DocumentUser,
  FetchApiResult,
  UpdateGroupAccessProps,
  UpdateGroupRequest,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Update Group Access
 *
 * Add a group to a given document with their groupId
 * Uses custom API endpoint
 *
 * @param groupId - The id of the group
 * @param documentId - The document id
 * @param access - The access level of the user
 */
export async function updateGroupAccess({
  groupId,
  documentId,
  access,
}: UpdateGroupAccessProps): Promise<FetchApiResult<DocumentUser[]>> {
  const url = `/documents/${documentId}/groups`;

  const request: UpdateGroupRequest = {
    groupId,
    access,
  };

  return fetchApiEndpoint<DocumentUser[]>(url, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
