import {
  normalizeRoomPermissionInput,
  normalizeRoomPermissions,
} from "@liveblocks/core";
import type {
  RoomAccesses,
  RoomAccessesInput,
  RoomPermissionInput,
  RoomPermissionList,
} from "@liveblocks/core";

export type {
  RoomAccesses,
  RoomAccessesInput,
  RoomPermissionInput,
  RoomPermissionList,
  RoomPermissionObject,
} from "@liveblocks/core";
export { normalizeRoomPermissionInput, normalizeRoomPermissions };

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
