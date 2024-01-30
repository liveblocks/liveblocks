import {
  Document,
  FetchApiResult,
  UpdateDefaultAccessProps,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Update Default Access
 *
 * Given a document, update its default access
 * Uses custom API endpoint
 *
 * @param documentId - The document to update
 * @param access - The new DocumentAccess permission level
 */
export async function updateDefaultAccess({
  documentId,
  access,
}: UpdateDefaultAccessProps): Promise<FetchApiResult<Document>> {
  const url = `/documents/${documentId}/defaultAccess`;

  return fetchApiEndpoint<Document>(url, {
    method: "POST",
    body: JSON.stringify({ access: access }),
  });
}
