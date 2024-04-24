"use server";

import { auth } from "@/auth";
import {
  buildDocument,
  documentAccessToRoomAccesses,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentAccess } from "@/types";

type Props = {
  documentId: Document["id"];
  access: DocumentAccess;
};

/**
 * Update Default Access
 *
 * Given a document, update its default access
 * Uses custom API endpoint
 *
 * @param documentId - The document to update
 * @param access - The new DocumentAccess permission level
 */
export async function updateDefaultAccess({ documentId, access }: Props) {
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

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to update public access level",
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

  // Check current logged-in user has write access to the room
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
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

  // If room exists, create default access parameter for room
  const defaultAccesses = documentAccessToRoomAccesses(access);

  // Update the room with the new collaborators
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      defaultAccesses,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't edit default access level in room",
        suggestion: "Please refresh the page and try again",
      },
    };
  }

  if (!updatedRoom) {
    return {
      error: {
        code: 404,
        message: "Updated room not found",
        suggestion: "Contact an administrator",
      },
    };
  }

  // If successful, covert to custom document format and return
  const document: Document = buildDocument(updatedRoom);
  return { data: document };
}
