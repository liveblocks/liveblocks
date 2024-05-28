"use server";

import { auth } from "@/auth";
import { userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document } from "@/types";

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
 * @param documentId - The documentId to update
 * @param name - The document's new name
 */
export async function renameDocument({ documentId, name }: Props) {
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

  // Update room name metadata
  try {
    await liveblocks.updateRoom(documentId, {
      metadata: { name },
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't update room name metadata",
        suggestion: "Please refresh the page and try again",
      },
    };
  }

  return { data: true };
}
