import { GetServerSidePropsContext } from "next";
import {
  Document,
  FetchApiResult,
  RoomAccess,
  UpdateDocumentProps,
} from "../../../types";
import { getServerSession } from "../auth";
import { getRoom, updateRoom } from "../liveblocks";
import { buildDocument, userAllowedInRoom } from "../utils";

/**
 * Update a document with new data
 * Only allow if user has access to room (including logged-out users and public rooms).
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param res
 * @param documentId - The document id
 * @param documentData - Data to update in the document
 */
export async function updateDocument(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, documentData }: UpdateDocumentProps
): Promise<FetchApiResult<Document>> {
  // Get session and room
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
        suggestion: "Sign in to get rooms information",
      },
    };
  }

  // Get the room to update
  const { data, error } = room;

  if (error) {
    return { error };
  }

  if (!data) {
    return {
      error: {
        code: 404,
        message: "Room not found",
        suggestion: "Check that you're on the correct page",
      },
    };
  }

  // Check current logged-in user has access to the room
  if (
    !userAllowedInRoom({
      accessesAllowed: [RoomAccess.RoomWrite],
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      room: data,
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

  // If successful, update room with new data
  const { data: updatedRoomData, error: updatedRoomError } = await updateRoom({
    ...documentData,
    roomId: documentId,
  });

  if (updatedRoomError) {
    return { error: updatedRoomError };
  }

  if (!updatedRoomData) {
    return {
      error: {
        code: 404,
        message: "Updated room not found",
        suggestion: "Contact an administrator",
      },
    };
  }

  // If update successful, convert to custom document format and return
  const document: Document = buildDocument(updatedRoomData);
  return { data: document };
}
