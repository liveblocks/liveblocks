import { isPermission, Permission } from "@liveblocks/core";

export type RoomPermissionString =
  (typeof Permission)[keyof typeof Permission];

export type RoomPermission = RoomPermissionString[];

export type RoomPermissionObject = {
  default?: "read" | "write";
  presence?: "read" | "none";
  storage?: "read" | "write" | "none";
  comments?: "read" | "write" | "none";
  feeds?: "read" | "write" | "none";
};

export type RoomPermissionInput =
  | readonly RoomPermissionString[]
  | RoomPermissionObject;

export type RoomAccesses = Record<string, RoomPermission>;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;
export type RoomAccessesUpdateInput = Record<
  string,
  RoomPermissionInput | null
>;

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  "presence",
  "storage",
  "comments",
  "feeds",
]);

const DEFAULT_PERMISSIONS: readonly RoomPermissionString[] = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

const PRESENCE_PERMISSIONS: readonly RoomPermissionString[] = [
  Permission.RoomPresenceRead,
  Permission.RoomPresenceWrite,
  Permission.RoomPresenceNone,
] as const;

const STORAGE_PERMISSIONS: readonly RoomPermissionString[] = [
  Permission.RoomStorageRead,
  Permission.RoomStorageWrite,
  Permission.RoomStorageNone,
] as const;

const COMMENTS_PERMISSIONS: readonly RoomPermissionString[] = [
  Permission.RoomCommentsRead,
  Permission.RoomCommentsWrite,
  Permission.RoomCommentsNone,
  Permission.CommentsRead,
  Permission.CommentsWrite,
] as const;

const FEEDS_PERMISSIONS: readonly RoomPermissionString[] = [
  Permission.RoomFeedsRead,
  Permission.RoomFeedsWrite,
  Permission.RoomFeedsNone,
  Permission.FeedsWrite,
] as const;

const FEATURE_PERMISSIONS: readonly RoomPermissionString[] = [
  ...PRESENCE_PERMISSIONS,
  ...STORAGE_PERMISSIONS,
  ...COMMENTS_PERMISSIONS,
  ...FEEDS_PERMISSIONS,
] as const;

export function normalizeRoomPermissionInput(
  input: RoomPermissionInput
): RoomPermission {
  if (Array.isArray(input)) {
    return input.map((permission) => {
      if (!isPermission(permission)) {
        throw new Error(`Not a valid permission: ${permission}`);
      }
      return permission;
    });
  }

  if (!isRoomPermissionObject(input)) {
    throw new Error("Permissions must be an array or an object");
  }

  for (const key of Object.keys(input)) {
    if (!ROOM_PERMISSION_OBJECT_KEYS.has(key)) {
      throw new Error(`Unknown permission field: ${key}`);
    }
  }

  const permissions: RoomPermission = [];

  if (input.default !== undefined) {
    permissions.push(normalizeDefaultPermission(input.default));
  }
  if (input.presence !== undefined) {
    permissions.push(normalizePresencePermission(input.presence));
  }
  if (input.storage !== undefined) {
    permissions.push(normalizeStoragePermission(input.storage));
  }
  if (input.comments !== undefined) {
    permissions.push(normalizeCommentsPermission(input.comments));
  }
  if (input.feeds !== undefined) {
    permissions.push(normalizeFeedsPermission(input.feeds));
  }

  if (permissions.length === 0) {
    throw new Error("Permission object cannot be empty");
  }

  return permissions;
}

export function getRoomPermissionConflicts(
  permission: RoomPermissionString
): readonly RoomPermissionString[] {
  if (DEFAULT_PERMISSIONS.includes(permission)) {
    return [...DEFAULT_PERMISSIONS, ...FEATURE_PERMISSIONS];
  }
  if (PRESENCE_PERMISSIONS.includes(permission)) {
    return PRESENCE_PERMISSIONS;
  }
  if (STORAGE_PERMISSIONS.includes(permission)) {
    return STORAGE_PERMISSIONS;
  }
  if (COMMENTS_PERMISSIONS.includes(permission)) {
    return COMMENTS_PERMISSIONS;
  }
  if (FEEDS_PERMISSIONS.includes(permission)) {
    return FEEDS_PERMISSIONS;
  }
  return [];
}

export function normalizeRoomAccessesInput(
  input: RoomAccessesInput | undefined
): RoomAccesses | undefined {
  if (input === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(input).map(([id, permissions]) => [
      id,
      normalizeRoomPermissionInput(permissions),
    ])
  );
}

export function normalizeRoomAccessesUpdateInput(
  input: RoomAccessesUpdateInput | undefined
): Record<string, RoomPermission | null> | undefined {
  if (input === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(input).map(([id, permissions]) => [
      id,
      permissions === null ? null : normalizeRoomPermissionInput(permissions),
    ])
  );
}

function isRoomPermissionObject(
  value: RoomPermissionInput
): value is RoomPermissionObject {
  return typeof value === "object" && value !== null;
}

function normalizeDefaultPermission(
  access: RoomPermissionObject["default"]
): RoomPermissionString {
  switch (access) {
    case "read":
      return Permission.RoomRead;
    case "write":
      return Permission.RoomWrite;
    default:
      throw new Error(`Invalid permission level for default: ${String(access)}`);
  }
}

function normalizePresencePermission(
  access: RoomPermissionObject["presence"]
): RoomPermissionString {
  switch (access) {
    case "read":
      return Permission.RoomPresenceRead;
    case "none":
      return Permission.RoomPresenceNone;
    default:
      throw new Error(
        `Invalid permission level for presence: ${String(access)}`
      );
  }
}

function normalizeStoragePermission(
  access: RoomPermissionObject["storage"]
): RoomPermissionString {
  switch (access) {
    case "read":
      return Permission.RoomStorageRead;
    case "write":
      return Permission.RoomStorageWrite;
    case "none":
      return Permission.RoomStorageNone;
    default:
      throw new Error(`Invalid permission level for storage: ${String(access)}`);
  }
}

function normalizeCommentsPermission(
  access: RoomPermissionObject["comments"]
): RoomPermissionString {
  switch (access) {
    case "read":
      return Permission.RoomCommentsRead;
    case "write":
      return Permission.RoomCommentsWrite;
    case "none":
      return Permission.RoomCommentsNone;
    default:
      throw new Error(
        `Invalid permission level for comments: ${String(access)}`
      );
  }
}

function normalizeFeedsPermission(
  access: RoomPermissionObject["feeds"]
): RoomPermissionString {
  switch (access) {
    case "read":
      return Permission.RoomFeedsRead;
    case "write":
      return Permission.RoomFeedsWrite;
    case "none":
      return Permission.RoomFeedsNone;
    default:
      throw new Error(`Invalid permission level for feeds: ${String(access)}`);
  }
}
