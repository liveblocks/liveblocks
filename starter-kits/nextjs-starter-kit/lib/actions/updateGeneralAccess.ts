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
      tenantId: session.user.currentOrganizationId,
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
  const tenantId = session.user.currentOrganizationId;

  // Update metadata with new permission group and type
  const updatedMetadata = {
    ...metadata,
    permissionGroup,
    permissionType,
  };

  // Set up room access based on permission group
  let defaultAccesses: RoomPermission = [];
  let groupsAccesses: Record<string, RoomPermission> = {};

  if (permissionGroup === "public") {
    // Public access is defined in defaultAccesses, and no group accesses should be defined
    defaultAccesses = permissionTypeToRoomAccesses(permissionType);
    groupsAccesses = {};
  } else if (permissionGroup === "organization") {
    // Organization access is defined in groupsAccesses and has no default access
    groupsAccesses[tenantId] = permissionTypeToRoomAccesses(permissionType);
    defaultAccesses = [];
  } else if (permissionGroup === "private") {
    // Private access has no group or default accesses
    defaultAccesses = [];
    groupsAccesses = {};
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
