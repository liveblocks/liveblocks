"use server";

import { auth } from "@/auth";
import { userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document } from "@/types";

type Props = {
  documentId: Document["id"];
};

/**
 * Delete Document
 *
 * Deletes a document from its id
 * Uses custom API endpoint
 *
 * @param documentId - The document's id
 */
export async function deleteDocument({ documentId }: Props) {
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

  // Check current user has write access on the room (if not logged in, use empty values)
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      userId: session?.user.info.id ?? "",
      groupIds: session?.user.info.groupIds ?? [],
      room,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Not allowed access",
        suggestion: "Check that you've been given permission to the room",
      },
    };
  }

  // Delete room
  try {
    await liveblocks.deleteRoom(documentId);
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't delete the room",
        suggestion: "Please try again",
      },
    };
  }

  return { data: documentId };
}
