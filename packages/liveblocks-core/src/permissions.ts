export const Permission = {
  /**
   * Default permission for a room
   */
  RoomWrite: "room:write",
  RoomRead: "room:read",

  /**
   * Presence (LiveRoom Websocket access)
   */
  RoomPresenceRead: "room:presence:read",
  RoomPresenceNone: "room:presence:none",

  /**
   * Storage
   */
  RoomStorageRead: "room:storage:read",
  RoomStorageWrite: "room:storage:write",
  RoomStorageNone: "room:storage:none",

  /**
   * Comments
   */
  RoomCommentsWrite: "room:comments:write",
  RoomCommentsRead: "room:comments:read",
  RoomCommentsNone: "room:comments:none",

  /**
   * Feeds
   */
  RoomFeedsRead: "room:feeds:read",
  RoomFeedsWrite: "room:feeds:write",
  RoomFeedsNone: "room:feeds:none",

  /**
   * Legacy
   */
  LegacyRoomPresenceWrite: "room:presence:write",
  LegacyCommentsWrite: "comments:write",
  LegacyCommentsRead: "comments:read",
  LegacyFeedsWrite: "feeds:write",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export type AccessLevel = "write" | "read" | "none";

export type PermissionCapabilities = {
  creation: AccessLevel;
  presence: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: "write";
};

export type PermissionResources = keyof PermissionCapabilities;

export type RequiredAccessLevel = "read" | "write";

export type ResolvedPermissionCapabilities = {
  hasDefaultPermission: boolean;
  baseAccess: AccessLevel;
  capabilities: Partial<PermissionCapabilities>;
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

type RoomPermissionResource = keyof Omit<RoomPermissionObject, "default">;

type ResourcePermissionMap = Record<
  PermissionResources,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

const ALL_PERMISSIONS = Object.freeze(Object.values(Permission));

const ACCESS_LEVELS = [
  "none",
  "read",
  "write",
] as const satisfies ReadonlyArray<AccessLevel>;

const ACCESS_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const DEFAULT_PERMISSIONS: readonly Permission[] = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

const NO_PERMISSION_CAPABILITIES: PermissionCapabilities = {
  creation: "none",
  presence: "none",
  storage: "none",
  comments: "none",
  feeds: "none",
  personal: "write",
};

// Include legacy scope strings so older tokens still resolve correctly.
const RESOURCE_PERMISSIONS: ResourcePermissionMap = {
  creation: {
    read: [Permission.RoomRead],
    write: [Permission.RoomWrite],
  },
  personal: {
    write: [],
  },
  presence: {
    read: [Permission.RoomPresenceRead, Permission.LegacyRoomPresenceWrite],
    none: [Permission.RoomPresenceNone],
  },
  storage: {
    write: [Permission.RoomStorageWrite],
    read: [Permission.RoomStorageRead],
    none: [Permission.RoomStorageNone],
  },
  comments: {
    write: [Permission.RoomCommentsWrite, Permission.LegacyCommentsWrite],
    read: [Permission.RoomCommentsRead, Permission.LegacyCommentsRead],
    none: [Permission.RoomCommentsNone],
  },
  feeds: {
    write: [Permission.RoomFeedsWrite, Permission.LegacyFeedsWrite],
    read: [Permission.RoomFeedsRead],
    none: [Permission.RoomFeedsNone],
  },
};

const DEFAULT_PERMISSION_RESOURCE = "creation" satisfies PermissionResources;

const ROOM_PERMISSION_RESOURCES = (
  Object.keys(RESOURCE_PERMISSIONS) as PermissionResources[]
).filter(
  (resource): resource is RoomPermissionResource =>
    RESOURCE_PERMISSIONS[resource].none !== undefined
);

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  ...ROOM_PERMISSION_RESOURCES,
]);

const RESOURCE_SPECIFIC_PERMISSIONS = ROOM_PERMISSION_RESOURCES.flatMap(
  (resource) => Object.values(RESOURCE_PERMISSIONS[resource]).flat()
);

function resolveResourceAccess(
  scopes: readonly string[],
  resource: RoomPermissionResource
): AccessLevel | undefined {
  const permissions: Partial<Record<AccessLevel, readonly Permission[]>> =
    RESOURCE_PERMISSIONS[resource];
  let resourceAccess: AccessLevel | undefined;

  for (const access of ACCESS_LEVELS) {
    const scopedPermissions = permissions[access];
    if (
      scopedPermissions !== undefined &&
      scopedPermissions.some((permission: Permission) =>
        scopes.includes(permission)
      )
    ) {
      if (
        resourceAccess === undefined ||
        ACCESS_RANKS[access] > ACCESS_RANKS[resourceAccess]
      ) {
        resourceAccess = access;
      }
    }
  }

  return resourceAccess;
}

function permissionForAccessLevel(
  resource: PermissionResources,
  access: string
): Permission {
  const levels: Partial<Record<AccessLevel, readonly Permission[]>> =
    RESOURCE_PERMISSIONS[resource];
  const permissions = levels[access as AccessLevel];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${resource}: ${String(access)}`
    );
  }
  return permissions[0];
}

export function isPermission(value: string): value is Permission {
  return ALL_PERMISSIONS.includes(value as Permission);
}

export function resolveFullPermissionCapabilities(
  resolved: ResolvedPermissionCapabilities
): PermissionCapabilities {
  if (!resolved.hasDefaultPermission) {
    return { ...NO_PERMISSION_CAPABILITIES, ...resolved.capabilities };
  }

  const capabilities: PermissionCapabilities = {
    ...NO_PERMISSION_CAPABILITIES,
    [DEFAULT_PERMISSION_RESOURCE]: resolved.baseAccess,
  };

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    capabilities[resource] =
      resolved.capabilities[resource] ?? resolved.baseAccess;
  }

  return capabilities;
}

export function permissionCapabilitiesFromScopes(
  scopes: readonly string[]
): PermissionCapabilities {
  return resolveFullPermissionCapabilities(
    resolvePermissionCapabilities(scopes)
  );
}

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

  // Array.isArray does not narrow readonly arrays out of this public union.
  return normalizeRoomPermissionObject(input as RoomPermissionObject);
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
    const permissions = Object.values(RESOURCE_PERMISSIONS[resource]).flat();
    if (permissions.includes(permission)) {
      return permissions;
    }
  }

  return [];
}

export function resolvePermissionCapabilities(
  scopes: readonly string[]
): ResolvedPermissionCapabilities {
  const hasDefaultPermission =
    scopes.includes(Permission.RoomWrite) ||
    scopes.includes(Permission.RoomRead);

  const baseAccess: AccessLevel = scopes.includes(Permission.RoomWrite)
    ? "write"
    : scopes.includes(Permission.RoomRead)
      ? "read"
      : "none";

  const capabilities: Partial<PermissionCapabilities> = {};

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = resolveResourceAccess(scopes, resource);
    if (access !== undefined) {
      capabilities[resource] = access;
    }
  }

  return { hasDefaultPermission, baseAccess, capabilities };
}

export function hasPermissionCapability(
  scopes: readonly string[],
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = permissionCapabilitiesFromScopes(scopes)[resource];
  return ACCESS_RANKS[access] >= ACCESS_RANKS[requiredAccess];
}
