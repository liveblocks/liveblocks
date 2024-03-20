import { GetServerSidePropsContext } from "next";
import {
  DocumentGroup,
  FetchApiResult,
  GetDocumentGroupsProps,
} from "../../../types";
import { getRoom } from "../liveblocks";
import { buildDocumentGroups } from "../utils";

/**
 * Get all groups attached to a given document.
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 */
export async function getDocumentGroups(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId }: GetDocumentGroupsProps
): Promise<FetchApiResult<DocumentGroup[]>> {
  // Get session and room
  const room = await getRoom({ roomId: documentId });

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

  // If successful, convert room to a list of groups and send
  const result: DocumentGroup[] = await buildDocumentGroups(data);
  return { data: result };
}
