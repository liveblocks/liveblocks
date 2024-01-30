import {
  FetchApiResult,
  GetDocumentsProps,
  GetDocumentsResponse,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Documents
 *
 * Get a list of documents by groupId, userId, and metadata
 * Uses custom API endpoint
 *
 * @param groupIds - The groups to filter for
 * @param userId - The user to filter for
 * @param documentType - The document type to filter for
 * @param drafts - Get only drafts
 * @param limit - The amount of documents to retrieve
 */
export async function getDocuments({
  groupIds,
  userId,
  documentType,
  drafts = false,
  limit,
}: GetDocumentsProps): Promise<FetchApiResult<GetDocumentsResponse>> {
  let url = `/documents?`;

  if (userId) {
    url += `&userId=${userId}`;
  }

  if (groupIds) {
    url += `&groupIds=${groupIds}`;
  }

  if (documentType) {
    url += `&documentType=${documentType}`;
  }

  if (drafts === true) {
    url += `&drafts=${true}`;
  }

  if (limit) {
    url += `&limit=${limit}`;
  }

  return fetchApiEndpoint<GetDocumentsResponse>(url);
}
