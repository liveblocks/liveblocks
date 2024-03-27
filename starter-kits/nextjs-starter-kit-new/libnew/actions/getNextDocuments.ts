"use server";

import { auth } from "@/auth";
import { buildDocuments, userAllowedInRooms } from "@/lib/server/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  FetchApiResult,
  GetDocumentsResponse,
  GetNextDocumentsProps,
  Room,
} from "@/types";

/**
 * Get Next Documents
 *
 * Get the next set of documents using userId and nextPage.
 * nextPage can be retrieved from getDocumentsByGroup.ts
 * Uses custom API endpoint
 *
 * @param nextPage - nextPage, retrieved from getDocumentByGroup
 */
export async function getNextDocuments({
  nextCursor,
}: GetNextDocumentsProps): Promise<FetchApiResult<GetDocumentsResponse>> {
  console.log("NEXT DOCS", nextCursor);
  let session;
  let rooms;
  try {
    // Get session and rooms
    const result = await Promise.all([
      auth(),
      liveblocks.getRooms({ startingAfter: nextCursor }),
    ]);
    session = result[0];
    rooms = result[1];
  } catch (err) {
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
        code: 404,
        message: "No more rooms found",
        suggestion: "No more rooms to paginate",
      },
    };
  }

  const { data, nextCursor: newNextCursor } = rooms;

  // Check current logged-in user has access to each room
  if (
    !userAllowedInRooms({
      accessesAllowed: ["room:write", "room:read"],
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      rooms: data as unknown as Room[],
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Not allowed access",
        suggestion: "Check that you've been given permission to the documents",
      },
    };
  }

  // Convert to our document format and return
  const documents = buildDocuments((data as unknown as Room[]) ?? []);
  const result: GetDocumentsResponse = {
    documents: documents,
    nextCursor: newNextCursor,
  };
  return { data: result };
}
