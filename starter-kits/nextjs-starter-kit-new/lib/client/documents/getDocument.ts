import { Document, FetchApiResult, GetDocumentProps } from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Document - Used in /lib/client/getDocumentsByGroup
 *
 * Fetch a liveblocks document from documentId
 * Uses custom API endpoint
 *
 * @param documentId - The document id
 */
export async function getDocument({
  documentId,
}: GetDocumentProps): Promise<FetchApiResult<Document>> {
  const url = `/documents/${documentId}`;

  return fetchApiEndpoint<Document>(url);
}
