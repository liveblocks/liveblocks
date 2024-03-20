import { GetServerSidePropsContext } from "next";
import {
  DocumentGroup,
  FetchApiResult,
  RemoveGroupAccessProps,
  RoomAccess,
  RoomAccessLevels,
} from "../../../types";
import { getServerSession } from "../auth";
import { getGroup } from "../database";
import { getRoom, updateRoom } from "../liveblocks";
import { buildDocumentGroups, userAllowedInRoom } from "../utils";

/**
 * Remove a group from a document
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 * @param groupId - The removed group's id
 */
export async function removeGroupAccess(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, groupId }: RemoveGroupAccessProps
): Promise<FetchApiResult<DocumentGroup[]>> {
  // Get session, room, and group
  const [session, room, group] = await Promise.all([
    getServerSession(req, res),
    getRoom({ roomId: documentId }),
    getGroup(groupId),
  ]);

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to delete groups",
      },
    };
  }

  // Check the room `documentId` exists
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

  // Check current logged-in user is set as a user with id, ignoring groupIds and default access
  if (
    !userAllowedInRoom({
      accessesAllowed: [RoomAccess.RoomWrite],
      checkAccessLevels: [RoomAccessLevels.USER],
      userId: session.user.info.id,
      groupIds: [],
      room: data,
    })
  ) {
    return {
      error: {
        code: 403,
        message: "Not allowed access",
        suggestion:
          "Check that you've been given permission to remove groups from the room",
      },
    };
  }

  // Check group exists in system
  if (!group) {
    return {
      error: {
        code: 400,
        message: "Group does not exist",
        suggestion: `Check that that group ${groupId} exists in the system`,
      },
    };
  }

  // If room exists, create groupsAccess element for removing the current group
  const groupsAccesses = {
    [groupId]: null,
  };

  // Update the room with the new group
  const { data: updatedRoom, error: updateRoomError } = await updateRoom({
    roomId: documentId,
    groupsAccesses: groupsAccesses,
  });

  if (updateRoomError) {
    return { error: updateRoomError };
  }

  if (!updatedRoom) {
    return {
      error: {
        code: 404,
        message: "Updated group not found",
        suggestion: "Contact an administrator",
      },
    };
  }

  // If successful, convert room to a list of groups and send
  const result: DocumentGroup[] = await buildDocumentGroups(updatedRoom);
  return { data: result };
}
