"use server";

import { GetRoomsOptions } from "@liveblocks/node";
import { auth } from "@/auth";
import { buildDocuments, userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { Document, DocumentPermissionGroup, DocumentType } from "@/types";

export type GetDocumentsProps = {
  permissionGroup?: DocumentPermissionGroup;
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
 * @param permissionGroup - The permission group to filter for
 * @param documentType - The document type to filter for
 * @param limit - The amount of documents to retrieve
 */
export async function getDocuments({
  permissionGroup,
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

  const userId = session.user.info.id;
  const tenantId = session.user.currentOrganizationId;

  console.log("tenantId", tenantId);

  // Build getRooms arguments
  // Only include query if there are actual filters to apply
  const query: GetRoomsOptions["query"] | undefined =
    permissionGroup || documentType
      ? {
          metadata: {
            ...(permissionGroup && { permissionGroup }),
            ...(documentType && { type: documentType }),
          },
        }
      : undefined;

  // Check all types of rooms a user is allowed to access, with query options too
  const getRoomsOptions: Parameters<typeof liveblocks.getRooms>[0] = {
    tenantId,
    userId,
    groupIds: [tenantId],
    limit,
    ...(query && { query }),
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
