import { Room, RoomAccess, RoomAccessLevels } from "../../../types";

interface UserAccessProps {
  accessesAllowed: RoomAccess[];
  checkAccessLevels?: RoomAccessLevels[];
  groupIds: string[];
  userId: string;
}

type UserAllowedInRoomProps = UserAccessProps & {
  room: Room;
};

type UserAllowedInRoomsProps = UserAccessProps & {
  rooms: Room[];
};

/**
 * Returns true if a user has any of the allowed accesses in every room
 * @param accessesAllowed - Each of these permission types is checked
 * @param userId - The user's id to check
 * @param groupIds - An array of group names the user is part of
 * @param rooms - A list of rooms returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */
export function userAllowedInRooms({
  accessesAllowed,
  userId,
  groupIds,
  rooms,
  checkAccessLevels,
}: UserAllowedInRoomsProps) {
  return rooms.every((room) =>
    userAllowedInRoom({
      accessesAllowed,
      userId,
      groupIds,
      checkAccessLevels,
      room,
    })
  );
}

/**
 * Returns true if a user has any of the allowed accesses in the room
 * @param accessesAllowed - Each of these permission types is checked
 * @param userId - The user's id to check
 * @param groupIds - An array of group names the user is part of
 * @param room - A room returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */

export function userAllowedInRoom({
  accessesAllowed,
  userId,
  groupIds,
  room,
  checkAccessLevels = [...Object.values(RoomAccessLevels)],
}: UserAllowedInRoomProps) {
  for (const access of accessesAllowed) {
    // User access is set
    if (checkAccessLevels.includes(RoomAccessLevels.USER)) {
      // User is owner
      if (room.metadata.owner === userId) {
        return true;
      }

      if (room.usersAccesses?.[userId]?.includes(access)) {
        return true;
      }
    }

    // A group access is set
    if (checkAccessLevels.includes(RoomAccessLevels.GROUP)) {
      for (const groupId of groupIds) {
        if (room.groupsAccesses?.[groupId]?.includes(access)) {
          return true;
        }
      }
    }

    // Default access is set
    if (
      checkAccessLevels.includes(RoomAccessLevels.DEFAULT) &&
      room.defaultAccesses.includes(access)
    ) {
      return true;
    }
  }

  return false;
}
