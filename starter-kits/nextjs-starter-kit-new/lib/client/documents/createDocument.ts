import {
  CreateDocumentProps,
  CreateDocumentRequest,
  Document,
  FetchApiResult,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Create Document
 *
 * Create a new document, with a specified name and type, from userId and groupId
 * Uses custom API endpoint
 *
 * @param name - The name of the new document
 * @param type - The type of the new document e.g. "canvas"
 * @param groupIds - The new document's initial groups
 * @param userId - The user creating the document
 * @param draft - If the document is a draft (no public or group access, but can invite)
 */
export async function createDocument({
  name,
  type,
  groupIds,
  userId,
  draft = false,
}: CreateDocumentProps): Promise<FetchApiResult<Document>> {
  const url = "/documents/create";

  const request: CreateDocumentRequest = {
    name,
    type,
    userId,
    groupIds: draft ? undefined : groupIds?.join(","),
    draft,
  };

  return fetchApiEndpoint<Document>(url, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
