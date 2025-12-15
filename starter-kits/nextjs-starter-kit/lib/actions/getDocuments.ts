"use server";

import { auth } from "@/auth";
import {
  buildDocuments,
  getDraftsGroupName,
  userAllowedInRoom,
} from "@/lib/utils";
import { getCurrentOrganizationGroupIds } from "@/lib/utils/getCurrentOrganizationGroupIds";
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
  const session = await auth();

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

  const tenantId = session.user.currentOrganizationId;

  // Build getRooms arguments
  let query: string | undefined = undefined;

  if (documentType) {
    query = `metadata["type"]:${JSON.stringify(documentType)}`;
  }

  let getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    tenantId,
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
    const filteredGroupIds = groupIds.filter((id) => id !== draftGroupName);
    getRoomsOptions = {
      ...getRoomsOptions,
      ...(filteredGroupIds.length > 0 && { groupIds: filteredGroupIds }),
      userId: userId,
    };
  }

  let getRoomsResponse;
  try {
    // Get rooms
    getRoomsResponse = await liveblocks.getRooms(getRoomsOptions);
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
  const currentOrganizationGroupIds = await getCurrentOrganizationGroupIds(
    session.user.info.id
  );
  const finalRooms = [];
  for (const room of rooms) {
    if (
      userAllowedInRoom({
        accessAllowed: "read",
        userId: session.user.info.id,
        groupIds: currentOrganizationGroupIds,
        room,
        tenantId,
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
