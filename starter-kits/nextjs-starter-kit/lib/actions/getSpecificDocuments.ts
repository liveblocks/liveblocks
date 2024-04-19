"use server";

import { Document } from "@/types";
import { getDocument } from "./getDocument";

type Props = {
  documentIds: Document["id"][];
};

/**
 * Get Specific Documents
 *
 * Get a list of documents by their IDs
 *
 * @param documentIds - The IDs of the documents
 */
export async function getSpecificDocuments({ documentIds }: Props) {
  const promises = [];

  for (const documentId of documentIds) {
    promises.push(getDocument({ documentId }));
  }

  const documentResults = await Promise.allSettled(promises);

  // If an error occurs when fetching a document, replace it with `null` instead
  const documents = [];
  for (const result of documentResults) {
    if (result.status === "fulfilled") {
      if (result.value.error) {
        console.error(result.value.error);
        documents.push(null);
      } else {
        documents.push(result.value.data);
      }
    } else {
      console.error("Problem fetching documents by ID");
      documents.push(null);
    }
  }

  return documents;
}
