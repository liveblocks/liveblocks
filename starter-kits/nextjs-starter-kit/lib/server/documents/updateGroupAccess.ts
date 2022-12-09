import { GetServerSidePropsContext } from "next";
import {
  DocumentGroup,
  FetchApiResult,
  RoomAccess,
  RoomAccesses,
  RoomAccessLevels,
  UpdateGroupAccessProps,
} from "../../../types";
import { getServerSession } from "../auth";
import { getGroup } from "../database";
import { getRoom, updateRoom } from "../liveblocks";
import {
  buildDocumentGroups,
  documentAccessToRoomAccesses,
  getDraftsGroupName,
  userAllowedInRoom,
} from "../utils";

/**
 * Add a new group to a document, or edit an old group's permissions
 * Only allow if authorized with NextAuth and if user is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param res
 * @param documentId - The document's id
 * @param groupId - The edit group's id
 * @param access - The invited user's new document access
 */
export async function updateGroupAccess(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentId, groupId, access }: UpdateGroupAccessProps
): Promise<FetchApiResult<DocumentGroup[]>> {
  // Get session and room
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
        suggestion: "Sign in to update groups",
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

  // Check current logged-in user has edit access to the room
  if (
    !userAllowedInRoom({
      accessesAllowed: [RoomAccess.RoomWrite],
      checkAccessLevels: [RoomAccessLevels.USER],
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      room: data,
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

  // If room exists, create userAccesses element for new collaborator with passed access level
  const groupsAccesses: RoomAccesses = {
    [groupId]: documentAccessToRoomAccesses(access),
  };

  // If draft and adding a group, remove drafts group
  const draftGroupId = getDraftsGroupName(session.user.info.id);
  if (groupId !== draftGroupId && draftGroupId in data.groupsAccesses) {
    groupsAccesses[draftGroupId] = null;
  }

  // Update the room with the new collaborators
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
        message: "Updated room not found",
        suggestion: "Contact an administrator",
      },
    };
  }

  // If successful, convert room to a list of groups and send
  const result: DocumentGroup[] = await buildDocumentGroups(updatedRoom);
  return { data: result };
}
