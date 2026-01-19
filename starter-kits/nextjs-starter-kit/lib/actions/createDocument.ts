"use server";

import { RoomAccesses } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DOCUMENT_URL } from "@/constants";
import { buildDocument } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  Document,
  DocumentRoomMetadata,
  DocumentType,
  DocumentUser,
} from "@/types";

type Props = {
  name: Document["name"];
  type: DocumentType;
  userId: DocumentUser["id"];
};

/**
 * Create Document
 *
 * Create a new document, with a specified name and type, from userId
 * Uses custom API endpoint
 *
 * @param options - Document creation options
 * @param options.name - The name of the new document
 * @param options.type - The type of the new document e.g. "canvas"
 * @param options.userId - The user creating the document
 * @param redirectToDocument - Redirect to the newly created document on success
 */
export async function createDocument(
  { name, type, userId }: Props,
  redirectToDocument?: boolean
) {
  const session = await auth();

  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to create a new document",
      },
    };
  }

  const tenantId = session.user.currentOrganizationId;

  // Custom metadata for our document. Documents always start private.
  const metadata: DocumentRoomMetadata = {
    name: name,
    type: type,
    owner: userId,
    permissionGroup: "private",
    permissionType: "write",
  };

  // Give owner of document write access
  const usersAccesses: RoomAccesses = {
    [userId]: ["room:write"],
  };

  const roomId = nanoid();

  let room;
  try {
    room = await liveblocks.createRoom(roomId, {
      metadata,
      usersAccesses,
      defaultAccesses: [],
      tenantId,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't create room",
        suggestion: "Please refresh the page and try again",
      },
    };
  }

  const document: Document = buildDocument(room);

  if (redirectToDocument) {
    // Has to return `undefined`
    return redirect(DOCUMENT_URL(document.type, document.id));
  }

  return { data: document };
}
