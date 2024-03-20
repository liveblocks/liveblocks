import { decode } from "base-64";
import { GetServerSidePropsContext } from "next";
import {
  FetchApiResult,
  GetDocumentsResponse,
  GetNextDocumentsProps,
  RoomAccess,
} from "../../../types";
import { getServerSession } from "../auth";
import { getNextRoom } from "../liveblocks";
import { buildDocuments, userAllowedInRooms } from "../utils";

/**
 * Get the next rooms from the next param
 * The `next` param is retrieved from /pages/api/documents/index.ts
 * That API is called on the client within /lib/client/getDocumentsByGroup.ts
 * Only allow if authorized with NextAuth and user has access to each room.
 *
 * @param req
 * @param res
 * @param nextPage - String containing a URL to get the next set of rooms, returned from Liveblocks API
 */
export async function getNextDocuments(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { nextPage }: GetNextDocumentsProps
): Promise<FetchApiResult<GetDocumentsResponse>> {
  // Get session and next rooms
  const [session, nextRooms] = await Promise.all([
    getServerSession(req, res),
    getNextRoom({ next: decode(nextPage) }),
  ]);

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to get documents",
      },
    };
  }

  // Get list of next rooms
  const { data, error } = nextRooms;

  if (error) {
    return { error };
  }

  if (!data) {
    return {
      error: {
        code: 404,
        message: "No more rooms found",
        suggestion: "No more rooms to paginate",
      },
    };
  }

  // Check current logged-in user has access to each room
  if (
    !userAllowedInRooms({
      accessesAllowed: [RoomAccess.RoomWrite, RoomAccess.RoomRead],
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      rooms: data.data,
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

  // Convert to our document format and return
  const documents = buildDocuments(data.data);

  const result: GetDocumentsResponse = {
    documents: documents,
    nextPage: data.nextPage,
  };
  return { data: result };
}
