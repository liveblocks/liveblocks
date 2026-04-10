import { RoomData } from "@liveblocks/node";

/**
 * Learn more about ID token permissions
 * https://liveblocks.io/docs/authentication/id-token#permission-types
 */

interface UserAccessProps {
  accessAllowed: "write" | "read";
  checkAccessLevel?: "any" | "user" | "organization" | "general";
  organizationId: string;
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
 * @param organizationId - The organization's id to check
 * @param rooms - A list of rooms returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */
export function userAllowedInRooms({
  accessAllowed,
  userId,
  organizationId,
  rooms,
  checkAccessLevel,
}: UserAllowedInRoomsProps) {
  return rooms.every((room) =>
    userAllowedInRoom({
      accessAllowed,
      userId,
      organizationId,
      checkAccessLevel,
      room,
    })
  );
}

/**
 * Returns true if a user has one of the allowed accesses in the room
 * @param accessesAllowed - Each of these permission types is checked
 * @param userId - The user's id to check
 * @param organizationId - The organization's id to check
 * @param room - A room returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */

export function userAllowedInRoom({
  accessAllowed,
  userId,
  organizationId,
  room,
  checkAccessLevel = "any",
}: UserAllowedInRoomProps) {
  const userAllowed = checkUserAccess({
    accessAllowed,
    userId,
    room,
    organizationId,
  });

  const organizationAllowed = checkOrganizationAccess({
    accessAllowed,
    userId,
    room,
    organizationId,
  });

  const generalAllowed = checkGeneralAccess({
    accessAllowed,
    userId,
    room,
    organizationId,
  });

  if (checkAccessLevel === "any") {
    return userAllowed || organizationAllowed || generalAllowed;
  }

  if (checkAccessLevel === "user") {
    return userAllowed;
  }

  if (checkAccessLevel === "organization") {
    return organizationAllowed;
  }

  if (checkAccessLevel === "general") {
    return generalAllowed;
  }

  return false;
}

function checkGeneralAccess({ room, accessAllowed }: UserAllowedInRoomProps) {
  const generalAccess = room.defaultAccesses as string[];
  if (accessAllowed === "write") {
    if (generalAccess.includes("room:write")) {
      return true;
    }
  }

  if (accessAllowed === "read") {
    if (
      generalAccess.includes("room:write") ||
      generalAccess.includes("room:read")
    ) {
      return true;
    }
  }

  return false;
}

function checkOrganizationAccess({
  room,
  accessAllowed,
  organizationId,
}: UserAllowedInRoomProps) {
  const groupAccess = (room.groupsAccesses?.[organizationId] || []) as string[];

  if (!groupAccess) {
    return false;
  }

  // Write access requires "room:write"
  if (accessAllowed === "write") {
    if (groupAccess.includes("room:write")) {
      return true;
    }
  }

  // Read access requires "room:write" or "room:read"
  if (accessAllowed === "read") {
    if (
      groupAccess.includes("room:write") ||
      groupAccess.includes("room:read")
    ) {
      return true;
    }
  }

  // No access on organization level
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
