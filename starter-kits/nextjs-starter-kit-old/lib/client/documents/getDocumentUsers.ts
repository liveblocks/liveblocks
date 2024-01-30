import {
  DocumentUser,
  FetchApiResult,
  GetDocumentUsersProps,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Document Users
 *
 * Get the DocumentUsers in a given document
 * Uses custom API endpoint
 *
 * @param documentId - The document id
 */
export async function getDocumentUsers({
  documentId,
}: GetDocumentUsersProps): Promise<FetchApiResult<DocumentUser[]>> {
  const url = `/documents/${documentId}/users`;

  return fetchApiEndpoint<DocumentUser[]>(url);
}
