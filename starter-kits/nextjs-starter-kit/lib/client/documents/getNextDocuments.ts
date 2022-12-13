import { encode } from "base-64";
import {
  FetchApiResult,
  GetDocumentsResponse,
  GetNextDocumentsProps,
} from "../../../types";
import { fetchApiEndpoint } from "../utils";

/**
 * Get Next Documents
 *
 * Get the next set of documents using userId and nextPage.
 * nextPage can be retrieved from getDocumentsByGroup.ts
 * Uses custom API endpoint
 *
 * @param nextPage - nextPage, retrieved from getDocumentByGroup
 */
export async function getNextDocuments({
  nextPage,
}: GetNextDocumentsProps): Promise<FetchApiResult<GetDocumentsResponse>> {
  const next = encode(nextPage);
  const url = `/documents/next?nextPage=${next}`;
  return fetchApiEndpoint<GetDocumentsResponse>(url);
}
