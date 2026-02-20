"use server";

import { RoomPermission } from "@liveblocks/node";
import { auth } from "@/auth";
import {
  buildDocument,
  permissionTypeToRoomAccesses,
  userAllowedInRoom,
} from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import {
  Document,
  DocumentPermissionGroup,
  DocumentPermissionType,
  DocumentRoomMetadata,
} from "@/types";

type Props = {
  documentId: Document["id"];
  permissionGroup: DocumentPermissionGroup;
  permissionType: DocumentPermissionType;
};

/**
 * Update General Access
 *
 * Given a document, update its general access and permission group
 * Uses custom API endpoint
 *
 * @param documentId - The document to update
 * @param permissionGroup - The new permission group (private, organization, public)
 * @param permissionType - The new permission type (read, write)
 */
export async function updateGeneralAccess({
  documentId,
  permissionGroup,
  permissionType,
}: Props) {
  let session;
  let room;
  try {
    // Get session and room
    const result = await Promise.all([auth(), liveblocks.getRoom(documentId)]);
    session = result[0];
    room = result[1];
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Error fetching document",
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
        suggestion: "Sign in to update public access level",
      },
    };
  }

  if (!room) {
    return {
      error: {
        code: 404,
        message: "Document not found",
        suggestion: "Check that you're on the correct page",
      },
    };
  }

  // Check current logged-in user has write access to the room
  if (
    !userAllowedInRoom({
      accessAllowed: "write",
      userId: session.user.info.id,
      room,
      organizationId: session.user.currentOrganizationId,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Not allowed access",
        suggestion: "Check that you've been given permission to the room",
      },
    };
  }

  const metadata = room.metadata as DocumentRoomMetadata;
  const organizationId = session.user.currentOrganizationId;

  // Update metadata with new permission group and type
  const updatedMetadata = {
    ...metadata,
    permissionGroup,
    permissionType,
  };

  // Set up room access based on permission group
  let defaultAccesses: RoomPermission = [];
  const groupsAccesses: Record<string, RoomPermission | null> = {};

  if (permissionGroup === "public") {
    // Public access is defined in defaultAccesses
    // Visible for everyone in workspace too, so set groupAccesses
    defaultAccesses = permissionTypeToRoomAccesses(permissionType);
    groupsAccesses[organizationId] =
      permissionTypeToRoomAccesses(permissionType);
  } else if (permissionGroup === "organization") {
    // Has no public/default access
    // Permission defined in groupsAccesses so workspace can see it
    groupsAccesses[organizationId] =
      permissionTypeToRoomAccesses(permissionType);
    defaultAccesses = [];
  } else if (permissionGroup === "private") {
    // Private access has no default accesses
    // No group access, so not visible in workspace
    groupsAccesses[organizationId] = null;
    defaultAccesses = [];
  }

  // Update the room with the new permissions
  let updatedRoom;
  try {
    updatedRoom = await liveblocks.updateRoom(documentId, {
      metadata: updatedMetadata,
      defaultAccesses,
      groupsAccesses: groupsAccesses as Record<
        string,
        ["room:write"] | ["room:read", "room:presence:write"] | null
      >,
    });
  } catch (err) {
    return {
      error: {
        code: 401,
        message: "Can't edit default access level in room",
        suggestion: "Please refresh the page and try again",
      },
    };
  }

  if (!updatedRoom) {
    return {
      error: {
        code: 404,
        message: "Updated room not found",
        suggestion: "Contact an administrator",
      },
    };
  }

  // If successful, covert to custom document format and return
  const document: Document = buildDocument(updatedRoom);
  return { data: document };
}
