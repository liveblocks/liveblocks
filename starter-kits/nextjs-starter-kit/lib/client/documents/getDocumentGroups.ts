import {
  DocumentGroup,
  FetchApiResult,
  GetDocumentGroupsProps,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Document Groups
 *
 * Get the groupIds attached to a given document
 * Uses custom API endpoint
 *
 * @param documentId - The document id
 */
export async function getDocumentGroups({
  documentId,
}: GetDocumentGroupsProps): Promise<FetchApiResult<DocumentGroup[]>> {
  const url = `/documents/${documentId}/groups`;

  return fetchApiEndpoint<DocumentGroup[]>(url);
}
