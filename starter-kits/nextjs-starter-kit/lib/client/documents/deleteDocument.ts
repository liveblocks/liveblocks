import { DeleteDocumentProps, Document, FetchApiResult } from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Delete Document
 *
 * Deletes a document from its id
 * Uses custom API endpoint
 *
 * @param documentId - The document's id
 */
export async function deleteDocument({
  documentId,
}: DeleteDocumentProps): Promise<FetchApiResult<Document>> {
  const url = `/documents/${documentId}`;

  return fetchApiEndpoint<Document>(url, {
    method: "DELETE",
  });
}
