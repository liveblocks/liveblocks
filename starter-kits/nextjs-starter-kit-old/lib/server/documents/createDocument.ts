import { nanoid } from "nanoid";
import { GetServerSidePropsContext } from "next";
import { buildDocument, createRoom, getServerSession } from "../";
import {
  CreateDocumentProps,
  Document,
  DocumentRoomMetadata,
  FetchApiResult,
  RoomAccess,
  RoomAccesses,
} from "../../../types";
import { getDraftsGroupName } from "../utils";

/**
 * Create Document
 *
 * Create a new document, with a specified name and type, from userId and groupId
 *
 * @param name - The name of the new document
 * @param type - The type of the new document e.g. "canvas"
 * @param userId - The user creating the document
 * @param [groupIds] - The new document's initial groups
 * @param [draft] - If the document is a draft (no public or group access, but can invite)
 * @param req
 * @param res
 */
export async function createDocument(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { name, type, userId, groupIds, draft }: CreateDocumentProps
): Promise<FetchApiResult<Document>> {
  // Check user is logged in
  const session = await getServerSession(req, res);

  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to create a new document",
      },
    };
  }

  const id = nanoid();

  // Custom metadata for our document
  const metadata: DocumentRoomMetadata = {
    name: name,
    type: type,
    owner: userId,
    draft: draft ? "yes" : "no",
  };

  // Give creator of document full access
  const usersAccesses: RoomAccesses = {
    [userId]: [RoomAccess.RoomWrite],
  };

  const groupsAccesses: RoomAccesses = {};

  if (draft) {
    // If draft, only add draft group access
    groupsAccesses[getDraftsGroupName(userId)] = [RoomAccess.RoomWrite];
  } else if (groupIds) {
    // If groupIds sent, limit access to these groups
    groupIds.forEach((groupId: string) => {
      groupsAccesses[groupId] = [RoomAccess.RoomWrite];
    });
  }

  // Calling Liveblocks API with required info
  const { data, error } = await createRoom({
    id,
    metadata,
    usersAccesses,
    groupsAccesses,
  });

  if (error || !data) {
    return { error };
  }

  // Build createRoom result into our custom document format and return
  const document: Document = buildDocument(data);
  return { data: document };
}
