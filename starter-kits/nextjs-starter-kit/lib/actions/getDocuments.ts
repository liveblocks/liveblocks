"use server";

import { auth } from "@/auth";
import { buildDocuments, userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentType, DocumentUser } from "@/types";

export type GetDocumentsProps = {
  userId?: DocumentUser["id"];
  documentType?: DocumentType;
  limit?: number;
};

export type GetDocumentsResponse = {
  documents: Document[];
  nextCursor: string | null;
};

/**
 * Get Documents
 *
 * Get a list of documents by userId and metadata
 * Uses custom API endpoint
 *
 * @param userId - The user to filter for
 * @param documentType - The document type to filter for
 * @param limit - The amount of documents to retrieve
 */
export async function getDocuments({
  userId = undefined,
  documentType,
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

  const getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    tenantId,
    limit,
    query,
    userId: userId,
  };

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
  const finalRooms = [];
  for (const room of rooms) {
    if (
      userAllowedInRoom({
        accessAllowed: "read",
        userId: session.user.info.id,
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
