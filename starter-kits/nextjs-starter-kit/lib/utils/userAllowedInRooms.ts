import { RoomData } from "@liveblocks/node";

/**
 * Learn more about ID token permissions
 * https://liveblocks.io/docs/authentication/id-token#permission-types
 */

interface UserAccessProps {
  accessAllowed: "write" | "read";
  checkAccessLevel?: "any" | "user" | "default";
  tenantId: string;
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
 * @param rooms - A list of rooms returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */
export function userAllowedInRooms({
  accessAllowed,
  userId,
  tenantId,
  rooms,
  checkAccessLevel,
}: UserAllowedInRoomsProps) {
  return rooms.every((room) =>
    userAllowedInRoom({
      accessAllowed,
      userId,
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
 * @param room - A room returned from Liveblocks APIs
 * @param [checkAccessLevels] - Check permission on only these access levels
 */

export function userAllowedInRoom({
  accessAllowed,
  userId,
  tenantId,
  room,
  checkAccessLevel = "any",
}: UserAllowedInRoomProps) {
  const userAllowed = checkUserAccess({
    accessAllowed,
    userId,
    room,
    tenantId,
  });

  const defaultAllowed = checkDefaultAccess({
    accessAllowed,
    userId,
    room,
    tenantId,
  });

  if (checkAccessLevel === "any") {
    return userAllowed || defaultAllowed;
  }

  if (checkAccessLevel === "user") {
    return userAllowed;
  }

  if (checkAccessLevel === "default") {
    return defaultAllowed;
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
