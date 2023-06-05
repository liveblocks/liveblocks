import {
  DocumentGroup,
  FetchApiResult,
  RemoveGroupAccessProps,
  RemoveGroupRequest,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Remove Group Access
 *
 * Remove a group from a given document with its groupId
 * Uses custom API endpoint
 *
 * @param groupId - The id of the removed group
 * @param documentId - The document id
 */
export async function removeGroupAccess({
  groupId,
  documentId,
}: RemoveGroupAccessProps): Promise<FetchApiResult<DocumentGroup[]>> {
  const url = `/documents/${documentId}/groups`;

  const request: RemoveGroupRequest = {
    groupId,
  };

  return fetchApiEndpoint<DocumentGroup[]>(url, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}
