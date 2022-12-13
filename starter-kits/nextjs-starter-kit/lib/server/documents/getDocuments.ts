import { GetServerSidePropsContext } from "next";
import {
  GetDocumentsProps,
  GetDocumentsResponse,
  RoomAccess,
  RoomMetadata,
} from "../../../types";
import { getServerSession } from "../auth";
import { getRooms } from "../liveblocks";
import { buildDocuments, userAllowedInRooms } from "../utils";
import { getDraftsGroupName } from "../utils";

/**
 * Get a list of documents.
 * Filter by sending userId, groupIds, or metadata in the query, otherwise return all.
 * Only allow if authorized with NextAuth and user has access to each room.
 *
 * @param req
 * @param res
 * @param [userId] - Optional, filter to rooms with this userAccess set
 * @param [groupIds] - Optional, filter to rooms with these groupIds set (comma separated)
 * @param [documentType] - Optional, filter for this type of document e.g. "canvas"
 * @param [drafts] - Optional, retrieve only draft documents
 * @param [limit] - Optional, the amount of documents to retrieve
 */
export async function getDocuments(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { userId = "", groupIds = [], documentType, drafts, limit }: GetDocumentsProps
) {
  // Build getRooms arguments
  const metadata: RoomMetadata = {};

  if (documentType) {
    metadata["type"] = documentType;
  }

  let getRoomsOptions: Parameters<typeof getRooms>[0] = {
    limit,
    metadata,
  };

  const draftGroupName = getDraftsGroupName(userId);

  if (drafts) {
    // Drafts are stored as a group that uses the userId
    getRoomsOptions = {
      ...getRoomsOptions,
      groupIds: [draftGroupName],
    };
  } else {
    // Not a draft, use other info
    getRoomsOptions = {
      ...getRoomsOptions,
      groupIds: groupIds.filter((id) => id !== draftGroupName),
      userId: userId,
    };
  }

  // Get session and rooms
  const [session, rooms] = await Promise.all([
    getServerSession(req, res),
    getRooms(getRoomsOptions),
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

  // Call Liveblocks API and get rooms
  const { data, error } = rooms;

  if (error || !data) {
    return { error };
  }

  // Check current logged-in user has access to each room
  if (
    !userAllowedInRooms({
      accessesAllowed: [RoomAccess.RoomWrite, RoomAccess.RoomRead],
      userId: session.user.info.id,
      groupIds: groupIds,
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

  // Convert rooms to custom document format
  const documents = buildDocuments(data.data ?? []);

  const result: GetDocumentsResponse = {
    documents: documents,
    nextPage: data.nextPage,
  };

  return { data: result };
}
