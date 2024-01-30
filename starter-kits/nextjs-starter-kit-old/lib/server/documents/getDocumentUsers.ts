import { GetServerSidePropsContext } from "next";
import {
  DocumentUser,
  FetchApiResult,
  GetDocumentUsersProps,
} from "../../../types";
import { getServerSession } from "../auth";
import { getRoom } from "../liveblocks";
import { buildDocumentUsers } from "../utils";

/**
 * Get all collaborators in a given document.
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 */
export async function getDocumentUsers(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId }: GetDocumentUsersProps
): Promise<FetchApiResult<DocumentUser[]>> {
  // Get session and room
  const [session, room] = await Promise.all([
    getServerSession(req, res),
    getRoom({ roomId: documentId }),
  ]);

  // Get the room from documentId
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

  // If successful, convert room to a list of collaborators and send
  const result: DocumentUser[] = await buildDocumentUsers(
    data,
    session?.user.info.id ?? ""
  );
  return { data: result };
}
