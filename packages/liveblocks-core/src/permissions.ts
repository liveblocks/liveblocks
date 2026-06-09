import type {
  AccessLevel,
  PermissionCapabilities,
  PermissionResources,
} from "./protocol/Permissions";
import {
  ACCESS_RANKS,
  DEFAULT_PERMISSION_RESOURCE,
  Permission,
  resolveFullPermissionCapabilities,
  resolvePermissionCapabilities,
  RESOURCE_PERMISSIONS,
  ROOM_PERMISSION_RESOURCES,
} from "./protocol/Permissions";

export type {
  AccessLevel,
  PermissionCapabilities,
  PermissionResources,
  RequiredAccessLevel,
  ResolvedPermissionCapabilities,
} from "./protocol/Permissions";
export {
  hasPermissionCapability,
  hasPermissionCapabilityAccess,
  Permission,
  permissionCapabilitiesFromScopes,
  resolveFullPermissionCapabilities,
  resolvePermissionCapabilities,
} from "./protocol/Permissions";

export type RoomPermissionScopes = {
  resource: string;
  scopes: readonly string[];
};

export type RoomPermission = Permission[];

export type RoomPermissionObject = {
  default?: "read" | "write";
  presence?: "read" | "none";
  storage?: "read" | "write" | "none";
  comments?: "read" | "write" | "none";
  feeds?: "read" | "write" | "none";
};

export type RoomPermissionInput = readonly Permission[] | RoomPermissionObject;

export type RoomAccesses = Record<string, RoomPermission>;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;
export type RoomAccessesUpdateInput = Record<
  string,
  RoomPermissionInput | null
>;

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

const DEFAULT_PERMISSIONS: readonly Permission[] = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  ...ROOM_PERMISSION_RESOURCES,
]);

const RESOURCE_SPECIFIC_PERMISSIONS_BY_RESOURCE = {
  presence: Object.values(RESOURCE_PERMISSIONS.presence).flat(),
  storage: Object.values(RESOURCE_PERMISSIONS.storage).flat(),
  comments: Object.values(RESOURCE_PERMISSIONS.comments).flat(),
  feeds: Object.values(RESOURCE_PERMISSIONS.feeds).flat(),
} satisfies Record<
  (typeof ROOM_PERMISSION_RESOURCES)[number],
  readonly Permission[]
>;

const RESOURCE_SPECIFIC_PERMISSIONS = ROOM_PERMISSION_RESOURCES.flatMap(
  (resource) => RESOURCE_SPECIFIC_PERMISSIONS_BY_RESOURCE[resource]
);

function permissionForAccessLevel(
  resource: PermissionResources,
  access: AccessLevel
): Permission {
  const levels: Partial<Record<AccessLevel, readonly Permission[]>> =
    RESOURCE_PERMISSIONS[resource];
  const permissions = levels[access];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${resource}: ${String(access)}`
    );
  }
  return permissions[0];
}

export function resolveRoomPermissionCapabilities(
  permissions: readonly RoomPermissionScopes[],
  roomId: string
): PermissionCapabilities | undefined {
  const matchedPermissions = permissions.filter((permission) =>
    resourceMatchesRoomId(permission.resource, roomId)
  );

  if (matchedPermissions.length === 0) {
    return undefined;
  }

  let hasDefaultPermission = false;
  let baseAccess: AccessLevel = "none";
  const explicitCapabilities: Partial<PermissionCapabilities> = {};

  for (const permission of matchedPermissions) {
    const resolved = resolvePermissionCapabilities(permission.scopes);

    if (resolved.hasDefaultPermission) {
      hasDefaultPermission = true;
      baseAccess = strongestAccess(baseAccess, resolved.baseAccess);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = resolved.capabilities[resource];
      if (access !== undefined) {
        explicitCapabilities[resource] = strongestAccess(
          explicitCapabilities[resource] ?? "none",
          access
        );
      }
    }
  }

  return resolveFullPermissionCapabilities({
    hasDefaultPermission,
    baseAccess,
    capabilities: explicitCapabilities,
  });
}

function isRoomPermissionArray(
  input: RoomPermissionInput
): input is readonly Permission[] {
  return Array.isArray(input);
}

export function normalizeRoomPermissionInput(
  input: RoomPermissionInput
): RoomPermission {
  if (isRoomPermissionArray(input)) {
    return input.map((permission) => {
      if (!VALID_PERMISSIONS.has(permission)) {
        throw new Error(`Not a valid permission: ${permission}`);
      }
      return permission;
    });
  }

  return normalizeRoomPermissionObject(input);
}

function normalizeRoomPermissionObject(
  objectInput: RoomPermissionObject
): RoomPermission {
  for (const key of Object.keys(objectInput)) {
    if (!ROOM_PERMISSION_OBJECT_KEYS.has(key)) {
      throw new Error(`Unknown permission field: ${key}`);
    }
  }

  const permissions: RoomPermission = [];

  if (objectInput.default !== undefined) {
    permissions.push(
      permissionForAccessLevel(DEFAULT_PERMISSION_RESOURCE, objectInput.default)
    );
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = objectInput[resource];
    if (access !== undefined) {
      permissions.push(permissionForAccessLevel(resource, access));
    }
  }

  if (permissions.length === 0) {
    throw new Error("Permission object cannot be empty");
  }

  return permissions;
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

// Scopes that cannot coexist with `permission` in the same room/pattern set.
export function getRoomPermissionConflicts(
  permission: Permission
): readonly Permission[] {
  if (DEFAULT_PERMISSIONS.includes(permission)) {
    return [...DEFAULT_PERMISSIONS, ...RESOURCE_SPECIFIC_PERMISSIONS];
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const permissions = RESOURCE_SPECIFIC_PERMISSIONS_BY_RESOURCE[resource];
    if (permissions.includes(permission)) {
      return permissions;
    }
  }

  return [];
}

function strongestAccess(left: AccessLevel, right: AccessLevel): AccessLevel {
  return ACCESS_RANKS[right] > ACCESS_RANKS[left] ? right : left;
}

function resourceMatchesRoomId(resource: string, roomId: string): boolean {
  if (resource.includes("*")) {
    return roomId.startsWith(resource.replace("*", ""));
  }

  return resource === roomId;
}
