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

export type {
  AccessLevel,
  RequiredAccessLevel,
  RoomPermissionFeature,
  RoomPermissionLevels,
} from "@liveblocks/core";
export {
  canReadRoomFeature,
  canWriteRoomFeature,
  hasRoomFeatureAccess,
  LEGACY_ROOM_PERMISSIONS,
  resolveRoomPermissions,
  ROOM_PERMISSIONS,
} from "@liveblocks/core";

type RoomPermissionObjectFields = typeof ROOM_PERMISSION_OBJECT_FIELDS;
type RoomPermissionObjectField = keyof RoomPermissionObjectFields;

export type RoomPermissionObject = Partial<{
  [Field in RoomPermissionObjectField]: keyof RoomPermissionObjectFields[Field];
}>;

export type RoomPermissionString = LiveblocksPermission;

/** Normalized room permission strings for a single room (REST API shape). */
export type RoomPermissionList = RoomPermissionString[];

export type RoomAccesses = Record<string, RoomPermissionList>;
export type RoomPermissionInput = RoomPermissionList | RoomPermissionObject;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;

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

export function normalizeRoomPermissionInput(
  permissions: RoomPermissionInput
): RoomPermissionList {
  return Array.isArray(permissions)
    ? permissions
    : normalizeRoomPermissions(permissions);
}

export function mapRoomAccesses(
  accesses: RoomAccessesInput | undefined,
  options: { allowNull: false }
): RoomAccesses | undefined;
export function mapRoomAccesses(
  accesses: Record<string, RoomPermissionInput | null> | undefined,
  options: { allowNull: true }
): Record<string, RoomPermissionList | null> | undefined;
export function mapRoomAccesses(
  accesses: Record<string, RoomPermissionInput | null> | undefined,
  options: { allowNull: boolean }
): Record<string, RoomPermissionList | null> | undefined {
  if (accesses === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(accesses).map(([id, permissions]) => {
      if (permissions === null) {
        if (!options.allowNull) {
          throw new Error("Unexpected null room permission");
        }
        return [id, null];
      }

      return [id, normalizeRoomPermissionInput(permissions)];
    })
  );
}

export function normalizeCreateRoomOptionsInput<
  T extends {
    defaultAccesses: RoomPermissionInput;
    groupsAccesses?: RoomAccessesInput;
    usersAccesses?: RoomAccessesInput;
  },
>(
  options: T
): Omit<T, "defaultAccesses" | "groupsAccesses" | "usersAccesses"> & {
  defaultAccesses: RoomPermissionList;
  groupsAccesses?: RoomAccesses;
  usersAccesses?: RoomAccesses;
} {
  return {
    ...options,
    defaultAccesses: normalizeRoomPermissionInput(options.defaultAccesses),
    groupsAccesses: mapRoomAccesses(options.groupsAccesses, {
      allowNull: false,
    }),
    usersAccesses: mapRoomAccesses(options.usersAccesses, { allowNull: false }),
  };
}

export function normalizeUpdateRoomOptionsInput<
  T extends {
    defaultAccesses?: RoomPermissionInput | null;
    groupsAccesses?: Record<string, RoomPermissionInput | null>;
    usersAccesses?: Record<string, RoomPermissionInput | null>;
  },
>(
  options: T
): Omit<T, "defaultAccesses" | "groupsAccesses" | "usersAccesses"> & {
  defaultAccesses?: RoomPermissionList | null;
  groupsAccesses?: Record<string, RoomPermissionList | null>;
  usersAccesses?: Record<string, RoomPermissionList | null>;
} {
  const { defaultAccesses } = options;

  return {
    ...options,
    defaultAccesses:
      defaultAccesses === null || defaultAccesses === undefined
        ? defaultAccesses
        : normalizeRoomPermissionInput(defaultAccesses),
    groupsAccesses: mapRoomAccesses(options.groupsAccesses, {
      allowNull: true,
    }),
    usersAccesses: mapRoomAccesses(options.usersAccesses, { allowNull: true }),
  };
}
