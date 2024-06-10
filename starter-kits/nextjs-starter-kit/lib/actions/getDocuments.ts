"use server";

import { auth } from "@/auth";
import {
  buildDocuments,
  getDraftsGroupName,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentGroup, DocumentType, DocumentUser } from "@/types";

export type GetDocumentsProps = {
  groupIds?: DocumentGroup["id"][];
  userId?: DocumentUser["id"];
  documentType?: DocumentType;
  drafts?: boolean;
  limit?: number;
};

export type GetDocumentsResponse = {
  documents: Document[];
  nextCursor: string | null;
};

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
}: GetDocumentsProps) {
  // Build getRooms arguments
  let query: string | undefined = undefined;

  if (documentType) {
    query = `metadata["type"]:${JSON.stringify(documentType)}`;
  }

  let getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    limit,
    query,
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
  let getRoomsResponse;
  try {
    // Get session and rooms
    const result = await Promise.all([
      auth(),
      liveblocks.getRooms(getRoomsOptions),
    ]);
    session = result[0];
    getRoomsResponse = result[1];
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

  const { data: rooms, nextCursor } = getRoomsResponse;

  if (!rooms) {
    return {
      error: {
        code: 400,
        message: "No rooms found",
        suggestion: "Refresh the page and try again",
      },
    };
  }

  // In case a room has changed, filter rooms the user no longer has access to
  const finalRooms = [];
  for (const room of rooms) {
    if (
      userAllowedInRoom({
        accessAllowed: "read",
        userId: session.user.info.id,
        groupIds: session.user.info.groupIds,
        room,
      })
    ) {
      finalRooms.push(room);
    }
  }

  // Convert rooms to custom document format
  const documents = buildDocuments(finalRooms);
  const result: GetDocumentsResponse = {
    documents,
    nextCursor,
  };

  return { data: result };
}
