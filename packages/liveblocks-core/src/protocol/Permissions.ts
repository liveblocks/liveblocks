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

export type RequiredAccessLevel = "read" | "write";

export type PermissionCapabilities = {
  creation: AccessLevel;
  presence: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: "write";
};

export type PermissionResources = keyof PermissionCapabilities;

export type ResolvedPermissionCapabilities = {
  hasDefaultPermission: boolean;
  baseAccess: AccessLevel;
  capabilities: Partial<PermissionCapabilities>;
};

type RoomPermissionResource = Exclude<
  PermissionResources,
  "creation" | "personal"
>;

type ResourcePermissionMap = Record<
  PermissionResources,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

const ACCESS_LEVELS = [
  "none",
  "read",
  "write",
] as const satisfies ReadonlyArray<AccessLevel>;

export const ACCESS_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const NO_PERMISSION_CAPABILITIES: PermissionCapabilities = {
  creation: "none",
  presence: "none",
  storage: "none",
  comments: "none",
  feeds: "none",
  personal: "write",
};

// Include legacy scope strings so older tokens still resolve correctly.
export const RESOURCE_PERMISSIONS: ResourcePermissionMap = {
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

export const DEFAULT_PERMISSION_RESOURCE =
  "creation" satisfies PermissionResources;

export const ROOM_PERMISSION_RESOURCES = [
  "presence",
  "storage",
  "comments",
  "feeds",
] as const satisfies ReadonlyArray<RoomPermissionResource>;

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
      scopedPermissions.some((permission) => scopes.includes(permission))
    ) {
      resourceAccess = access;
    }
  }

  return resourceAccess;
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

export function hasPermissionCapabilityAccess(
  capabilities: Partial<PermissionCapabilities>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = capabilities[resource] ?? "none";
  return ACCESS_RANKS[access] >= ACCESS_RANKS[requiredAccess];
}
