import { GetServerSidePropsContext } from "next";
import { getRoom, getServerSession, userAllowedInRoom } from "../";
import {
  DeleteDocumentProps,
  Document,
  FetchApiResult,
  RoomAccess,
  RoomAccessLevels,
} from "../../../types";
import { deleteRoom } from "../liveblocks/deleteRoom";

/**
 * Delete Document
 *
 * Delete a document
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param documentId - The document to delete
 * @param req
 * @param res
 */
export async function deleteDocument(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId }: DeleteDocumentProps
): Promise<FetchApiResult<Document["id"]>> {
  const [session, room] = await Promise.all([
    getServerSession(req, res),
    getRoom({ roomId: documentId }),
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

  const { error: deleteRoomError } = await deleteRoom({ roomId: documentId });

  if (deleteRoomError) {
    return { error: deleteRoomError };
  }

  return { data: documentId };
}
