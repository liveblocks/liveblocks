"use server";

import { auth } from "@/auth";
import { buildDocumentUsers } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentUser } from "@/types";

type Props = {
  documentId: Document["id"];
};

/**
 * Get Document Users
 *
 * Get the DocumentUsers in a given document
 * Uses custom API endpoint
 *
 * @param documentId - The document id
 */
export async function getDocumentUsers({ documentId }: Props) {
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
    room,
    session?.user.info.id ?? ""
  );
  return { data: result };
}
