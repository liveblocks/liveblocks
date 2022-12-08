import { GetServerSidePropsContext } from "next";
import {
  DocumentUser,
  FetchApiResult,
  RemoveUserAccessProps,
  RoomAccess,
  RoomAccessLevels,
} from "../../../types";
import { getServerSession } from "../auth";
import { getUser } from "../database";
import { getRoom, updateRoom } from "../liveblocks";
import {
  buildDocumentUsers,
  isUserDocumentOwner,
  userAllowedInRoom,
} from "../utils";

/**
 * Remove a collaborator from a document
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 * @param userId - The removed user's id
 */
export async function removeUserAccess(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, userId }: RemoveUserAccessProps
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
        suggestion: "Sign in to remove a user",
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

  // Check current logged-in user is set as a user with id, ignoring groupIds and default access
  if (
    !userAllowedInRoom({
      accessesAllowed: [RoomAccess.RoomWrite],
      checkAccessLevels: [RoomAccessLevels.USER],
      userId: session.user.info.id,
      groupIds: [],
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
        code: 400,
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

  // If room exists, create userAccess element for removing the current collaborator
  const usersAccesses = {
    [userId]: null,
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

  const result: DocumentUser[] = await buildDocumentUsers(
    updatedRoom,
    session.user.info.id
  );
  return { data: result };
}
