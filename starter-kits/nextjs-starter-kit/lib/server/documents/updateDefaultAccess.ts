import { GetServerSidePropsContext } from "next";
import {
  Document,
  FetchApiResult,
  RoomAccess,
  UpdateDefaultAccessProps,
} from "../../../types";
import { getServerSession } from "../auth";
import { getRoom, updateRoom } from "../liveblocks";
import {
  buildDocument,
  documentAccessToRoomAccesses,
  userAllowedInRoom,
} from "../utils";

/**
 * POST Default access - used in /lib/client/updateDocumentScope.ts
 *
 * Update the default access for a document to public or private
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 * @param access - The new default access: "public" or "private"
 */
export async function updateDefaultAccess(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, access }: UpdateDefaultAccessProps
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
        suggestion: "Sign in to update public access level",
      },
    };
  }

  // Check the room exists
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
        suggestion: "Check that you've been given permission to the room",
      },
    };
  }

  // If room exists, create default access parameter for room
  const defaultAccesses = documentAccessToRoomAccesses(access);

  // Update the room with the new default access
  const { data: updatedRoom, error: updateRoomError } = await updateRoom({
    roomId: documentId,
    defaultAccesses: defaultAccesses,
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

  // If successful, covert to custom document format and return
  const document: Document = buildDocument(updatedRoom);
  return { data: document };
}
