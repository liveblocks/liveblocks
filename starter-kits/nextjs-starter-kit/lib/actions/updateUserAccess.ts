"use server";

import { auth } from "@/auth";
import { getUser } from "@/lib/database/getUser";
import {
  buildDocument,
  buildDocumentUsers,
  documentAccessToRoomAccesses,
  isUserDocumentOwner,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentAccess, DocumentUser } from "@/types";

type Props = {
  userId: DocumentUser["id"];
  documentId: Document["id"];
  access: DocumentAccess;
};

/**
 * Update User Access
 *
 * Add a collaborator to a given document with their userId
 * Uses custom API endpoint
 *
 * @param userId - The id of the invited user
 * @param documentId - The document id
 * @param access - The access level of the user
 */
export async function updateUserAccess({ userId, documentId, access }: Props) {
  let session;
  let room;
  let user;
  try {
    // Get session and room
    const result = await Promise.all([
      auth(),
      liveblocks.getRoom(documentId),
      getUser(userId),
    ]);
    session = result[0];
    room = result[1];
    user = result[2];
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
        suggestion: "Sign in to remove a user",
      },
    };
  }

  // Check current logged-in user is set as a user with id, ignoring groupIds and default access
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      checkAccessLevel: "user",
      userId: session.user.info.id,
      groupIds: [],
      room,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Not allowed access",
        suggestion: "Check that you've been given permission to the document",
      },
    };
  }

  // Check the room `documentId` exists
  if (!room) {
    return {
      error: {
        code: 404,
        message: "Document not found",
        suggestion: "Check that you're on the correct page",
      },
    };
  }

  const document = await buildDocument(room);

  // Check user exists in system
  if (!user) {
    return {
      error: {
        code: 400,
        message: "User not found",
        suggestion: "Check that you've used the correct user id",
      },
    };
  }

  // If user exists, check that they are not the owner
  if (isUserDocumentOwner({ room, userId })) {
    return {
      error: {
        code: 400,
        message: "User is owner",
        suggestion: `User ${userId} is the document owner and cannot be edited`,
      },
    };
  }

  // If room exists, create userAccesses element for new collaborator with passed access level
  const userAccess = documentAccessToRoomAccesses(access);
  const usersAccesses: Record<
    string,
    ["room:write"] | ["room:read", "room:presence:write"] | null
  > = {
    [userId]: userAccess.length === 0 ? null : userAccess,
  };

  // Send userAccesses to room and remove user
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      usersAccesses,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't remove user from room",
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

  // If the user previously had no access to document, send a notification saying they've been added
  const previousAccessLevel = document.accesses.users[userId];
  if (!previousAccessLevel || previousAccessLevel === DocumentAccess.NONE) {
    liveblocks.triggerInboxNotification({
      userId,
      kind: "$addedToDocument",
      subjectId: document.id,
      roomId: room.id,
      activityData: {
        documentId: document.id,
      },
    });
  }

  const result: DocumentUser[] = await buildDocumentUsers(
    updatedRoom,
    session.user.info.id
  );
  return { data: result };
}
