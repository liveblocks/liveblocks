import { Document, FetchApiResult, Room } from "../../../types";
import { fetchApiEndpoint } from "../utils";

interface Props {
  documentId: Document["id"];
  name: Document["name"];
}

/**
 * Update Document Name
 *
 * Given a document, update its name
 * Uses custom API endpoint
 *
 * @param document - The document to update
 * @param name - The document's new name
 */
export async function updateDocumentName({
  documentId,
  name,
}: Props): Promise<FetchApiResult<Document>> {
  const url = `/documents/${documentId}`;

  const documentData: { metadata: Partial<Room["metadata"]> } = {
    metadata: { name },
  };

  return fetchApiEndpoint(url, {
    method: "POST",
    body: JSON.stringify({
      documentData,
    }),
  });
}
