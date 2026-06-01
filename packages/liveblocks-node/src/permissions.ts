import type {
  LiveblocksPermission,
  Permission as CorePermissionType,
} from "@liveblocks/core";
import {
  Permission as CorePermission,
  ROOM_PERMISSION_OBJECT_FIELDS,
} from "@liveblocks/core";

export const Permission = CorePermission;
export type Permission = CorePermissionType;

export {
  LEGACY_ROOM_PERMISSIONS,
  ROOM_PERMISSIONS,
  canReadRoomFeature,
  canWriteRoomFeature,
  hasRoomFeatureAccess,
  roomPermissionsFromScopes,
} from "@liveblocks/core";
export type {
  AccessLevel,
  RequiredAccessLevel,
  RoomFeature,
  RoomPermissions,
} from "@liveblocks/core";

type RoomPermissionObjectFields = typeof ROOM_PERMISSION_OBJECT_FIELDS;
type RoomPermissionObjectField = keyof RoomPermissionObjectFields;

export type RoomPermissionObject = Partial<{
  [Field in RoomPermissionObjectField]: keyof RoomPermissionObjectFields[Field];
}>;

export type RoomPermissionString = LiveblocksPermission;

function formatAllowedValues(
  permissions: Readonly<Record<string, RoomPermissionString>>
) {
  return Object.keys(permissions)
    .map((value) => `"${value}"`)
    .join(", ");
}

function normalizePermissionValue<
  TPermissions extends Readonly<Record<string, RoomPermissionString>>,
>(
  field: string,
  value: Extract<keyof TPermissions, string> | undefined,
  permissions: TPermissions
): RoomPermissionString | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(permissions, value)) {
    throw new Error(
      `Invalid room permission object value for "${field}": ${String(
        value
      )}. Expected one of ${formatAllowedValues(permissions)}.`
    );
  }

  return permissions[value];
}

export function normalizeRoomPermissions(
  permissions: RoomPermissionObject
): RoomPermissionString[] {
  const normalized = [
    normalizePermissionValue(
      "default",
      permissions.default,
      ROOM_PERMISSION_OBJECT_FIELDS.default
    ),
    normalizePermissionValue(
      "presence",
      permissions.presence,
      ROOM_PERMISSION_OBJECT_FIELDS.presence
    ),
    normalizePermissionValue(
      "storage",
      permissions.storage,
      ROOM_PERMISSION_OBJECT_FIELDS.storage
    ),
    normalizePermissionValue(
      "comments",
      permissions.comments,
      ROOM_PERMISSION_OBJECT_FIELDS.comments
    ),
    normalizePermissionValue(
      "feeds",
      permissions.feeds,
      ROOM_PERMISSION_OBJECT_FIELDS.feeds
    ),
  ].filter(
    (permission): permission is RoomPermissionString => permission !== undefined
  );

  if (normalized.length === 0) {
    throw new Error("Room permission object cannot be empty");
  }

  return normalized;
}
