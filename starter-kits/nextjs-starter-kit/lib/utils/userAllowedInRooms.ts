import { RoomData } from "@liveblocks/node";

/**
 * Learn more about ID token permissions
 * https://liveblocks.io/docs/authentication/id-token#permission-types
 */

interface UserAccessProps {
  accessAllowed: "write" | "read";
  checkAccessLevel?: "any" | "user" | "group" | "default";
  tenantId: string;
  groupIds: string[];
  userId: string;
}

type UserAllowedInRoomProps = UserAccessProps & {
  room: RoomData;
};

type UserAllowedInRoomsProps = UserAccessProps & {
  rooms: RoomData[];
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
  accessAllowed,
  userId,
  groupIds,
  tenantId,
  rooms,
  checkAccessLevel,
}: UserAllowedInRoomsProps) {
  return rooms.every((room) =>
    userAllowedInRoom({
      accessAllowed,
      userId,
      groupIds,
      tenantId,
      checkAccessLevel,
      room,
    })
  );
}

/**
 * Returns true if a user has one of the allowed accesses in the room
 * @param accessesAllowed - Each of these permission types is checked
 * @param userId - The user's id to check
 * @param groupIds - An array of group names the user is part of
 * @param room - A room returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */

export function userAllowedInRoom({
  accessAllowed,
  userId,
  groupIds,
  tenantId,
  room,
  checkAccessLevel = "any",
}: UserAllowedInRoomProps) {
  const userAllowed = checkUserAccess({
    accessAllowed,
    userId,
    groupIds,
    room,
    tenantId,
  });

  const groupAllowed = checkGroupsAccess({
    accessAllowed,
    userId,
    groupIds,
    room,
    tenantId,
  });

  const defaultAllowed = checkDefaultAccess({
    accessAllowed,
    userId,
    groupIds,
    room,
    tenantId,
  });

  if (checkAccessLevel === "any") {
    return userAllowed || groupAllowed || defaultAllowed;
  }

  if (checkAccessLevel === "user") {
    return userAllowed;
  }

  if (checkAccessLevel === "group") {
    return groupAllowed;
  }

  if (checkAccessLevel === "default") {
    return groupAllowed;
  }

  return false;
}

function checkDefaultAccess({ room, accessAllowed }: UserAllowedInRoomProps) {
  const defaultAccess = room.defaultAccesses as string[];
  if (accessAllowed === "write") {
    if (defaultAccess.includes("room:write")) {
      return true;
    }
  }

  if (accessAllowed === "read") {
    if (
      defaultAccess.includes("room:write") ||
      defaultAccess.includes("room:read")
    ) {
      return true;
    }
  }

  return false;
}

function checkTenantAccess({
  room,
  accessAllowed,
  tenantId,
}: UserAllowedInRoomProps) {
  const roomTenantId = room.tenantId;

  // TODO a way to check the tenantId of a room then give a user access
}

function checkGroupsAccess({
  room,
  accessAllowed,
  groupIds,
}: UserAllowedInRoomProps) {
  for (const groupId of groupIds) {
    const groupAccess = (room.groupsAccesses[groupId] || []) as string[];

    // Checking for write access on current group
    if (accessAllowed === "write" && groupAccess.includes("room:write")) {
      return true;
    }

    // Checking for read (and write) access on current group
    if (
      accessAllowed === "read" &&
      (groupAccess.includes("room:write") || groupAccess.includes("room:read"))
    ) {
      return true;
    }
  }

  return false;
}

function checkUserAccess({
  room,
  accessAllowed,
  userId,
}: UserAllowedInRoomProps) {
  // User has access if they created the document
  if (room.metadata.owner === userId) {
    return true;
  }

  const userAccesses = (room.usersAccesses?.[userId] || []) as string[];

  // Write access requires "room:write"
  if (accessAllowed === "write") {
    if (userAccesses.includes("room:write")) {
      return true;
    }
  }

  // Read access requires "room:write" or "room:read"
  if (accessAllowed === "read") {
    if (
      userAccesses.includes("room:write") ||
      userAccesses.includes("room:read")
    ) {
      return true;
    }
  }

  // No access on userId level
  return false;
}
