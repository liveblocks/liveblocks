import { GetServerSidePropsContext } from "next";
import { DOCUMENT_URL } from "../../../constants";
import {
  Document,
  DocumentUser,
  FetchApiResult,
  RoomAccess,
  RoomAccessLevels,
  UpdateUserAccessProps,
} from "../../../types";
import { getServerSession } from "../auth";
import { getUser } from "../database";
import { getRoom, updateRoom } from "../liveblocks";
import { notify } from "../notify";
import {
  buildDocument,
  buildDocumentUsers,
  documentAccessToRoomAccesses,
  isUserDocumentOwner,
  userAllowedInRoom,
} from "../utils";

/**
 * Add a new collaborator to a document, or edit an old collaborator
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 * @param userId - The id of the user we're updating
 * @param access - The user's new document access level
 */
export async function updateUserAccess(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, userId, access }: UpdateUserAccessProps
): Promise<FetchApiResult<DocumentUser[]>> {
  // Get session, room, and user
  const [session, room, user] = await Promise.all([
    getServerSession(req, res),
    getRoom({ roomId: documentId }),
    getUser(userId),
  ]);

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to update document users",
      },
    };
  }

  // Check the room `documentId` exists
  const { data: currentRoom, error } = room;

  if (error) {
    return { error };
  }

  if (!currentRoom) {
    return {
      error: {
        code: 404,
        message: "Room not found",
        suggestion: "Check that you're on the correct page",
      },
    };
  }

  // Check current logged-in user has edit access to the room
  if (
    !userAllowedInRoom({
      accessesAllowed: [RoomAccess.RoomWrite],
      checkAccessLevels: [RoomAccessLevels.USER],
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      room: currentRoom,
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

  // Check user exists in system
  if (!user) {
    return {
      error: {
        code: 200,
        message: "User not found",
        suggestion: "Check that you've used the correct user id",
      },
    };
  }

  // If user exists, check that they are not the owner
  if (isUserDocumentOwner({ room: currentRoom, userId: userId })) {
    return {
      error: {
        code: 400,
        message: "User is owner",
        suggestion: `User ${userId} is the document owner and cannot be edited`,
      },
    };
  }

  // If room exists, create userAccesses element for new collaborator with passed access level
  const usersAccesses = {
    [userId]: documentAccessToRoomAccesses(access),
  };

  // Update the room with the new collaborators
  const { data: updatedRoom, error: updateRoomError } = await updateRoom({
    roomId: documentId,
    usersAccesses: usersAccesses,
  });

  if (updateRoomError) {
    return { error: updateRoomError };
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

  // Send email to user notifying that they've been added or their permission has been changed
  const updatedDocument: Document = buildDocument(updatedRoom);
  const documentUrl = `${req.headers.origin}${DOCUMENT_URL(
    updatedDocument.type,
    updatedDocument.id
  )}`;
  notify({
    to: userId,
    subject: `Permission changed in document ${updatedDocument.name}`,
    html: `In <a href="${documentUrl}">${updatedDocument.name}</a> your permission level has changed to <strong>${access}</strong>.`,
  });

  // If update successful, return the new list of collaborators
  const result: DocumentUser[] = await buildDocumentUsers(
    updatedRoom,
    session.user.info.id
  );
  return { data: result };
}
