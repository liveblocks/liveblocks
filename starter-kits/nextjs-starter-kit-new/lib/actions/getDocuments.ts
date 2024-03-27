"use server";

import { RoomInfo } from "@liveblocks/node";
import { auth } from "@/auth";
import {
  buildDocuments,
  getDraftsGroupName,
  userAllowedInRooms,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  FetchApiResult,
  GetDocumentsProps,
  GetDocumentsResponse,
} from "@/types";

/**
 * Get Documents
 *
 * Get a list of documents by groupId, userId, and metadata
 * Uses custom API endpoint
 *
 * @param groupIds - The groups to filter for
 * @param userId - The user to filter for
 * @param documentType - The document type to filter for
 * @param drafts - Get only drafts
 * @param limit - The amount of documents to retrieve
 */
export async function getDocuments({
  groupIds = [],
  userId = undefined,
  documentType,
  drafts = false,
  limit = 20,
}: GetDocumentsProps): Promise<FetchApiResult<GetDocumentsResponse>> {
  // Build getRooms arguments
  const metadata: RoomInfo["metadata"] = {};

  if (documentType) {
    metadata["type"] = documentType;
  }

  let getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    limit,
    metadata,
  };

  const draftGroupName = getDraftsGroupName(userId || "");

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

  let session;
  let rooms;
  try {
    // Get session and rooms
    const result = await Promise.all([
      auth(),
      liveblocks.getRooms(getRoomsOptions),
    ]);
    session = result[0];
    rooms = result[1];
  } catch (err) {
    console.log(err);
    return {
      error: {
        code: 500,
        message: "Error fetching rooms",
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
        suggestion: "Sign in to get documents",
      },
    };
  }

  if (!rooms) {
    return {
      error: {
        code: 400,
        message: "No rooms found",
        suggestion: "Refresh the page and try again",
      },
    };
  }

  const { data, nextCursor } = rooms;

  // Check current logged-in user has access to each room
  if (
    !userAllowedInRooms({
      accessAllowed: "read",
      userId: session.user.info.id,
      groupIds: groupIds,
      rooms: data,
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
  const documents = buildDocuments(data ?? []);

  const result: GetDocumentsResponse = {
    documents,
    nextCursor,
  };

  return { data: result };
}
