"use server";

import { auth } from "@/auth";
import { GetDocumentsResponse } from "@/lib/actions/getDocuments";
import { buildDocuments, userAllowedInRooms } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";

type Props = {
  nextCursor: string;
};

/**
 * Get Next Documents
 *
 * Get the next set of documents using userId and nextPage.
 * nextPage can be retrieved from getDocumentsByGroup.ts
 * Uses custom API endpoint
 *
 * @param nextPage - nextPage, retrieved from getDocumentByGroup
 */
export async function getNextDocuments({ nextCursor }: Props) {
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
      accessAllowed: "read",
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      rooms: data,
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
  const documents = buildDocuments(data ?? []);
  const result: GetDocumentsResponse = {
    documents: documents,
    nextCursor: newNextCursor,
  };
  return { data: result };
}
