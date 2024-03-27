"use server";

import { auth } from "@/auth";
import { buildDocumentUsers } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  DocumentUser,
  FetchApiResult,
  GetDocumentGroupsProps,
  Room,
} from "@/types";

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
}: GetDocumentGroupsProps): Promise<FetchApiResult<DocumentUser[]>> {
  let session;
  let room;
  try {
    // Get session and room
    const result = await Promise.all([auth(), liveblocks.getRoom(documentId)]);
    session = result[0];
    room = result[1];
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Error fetching document",
        suggestion: "Refresh the page and try again",
      },
    };
  }

  if (!room) {
    return {
      error: {
        code: 404,
        message: "Document not found",
        suggestion: "Check that you're on the correct page",
      },
    };
  }

  // If successful, convert room to a list of groups and send
  const result: DocumentUser[] = await buildDocumentUsers(
    room as unknown as Room,
    session?.user.info.id ?? ""
  );
  return { data: result };
}
