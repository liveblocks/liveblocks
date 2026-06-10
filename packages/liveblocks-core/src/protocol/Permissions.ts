export const Permission = {
  /**
   * Default permission for a room.
   */
  Read: "*:read",
  Write: "*:write",

  /**
   * Legacy aliases for default room permissions.
   */
  RoomWrite: "room:write",
  RoomRead: "room:read",

  /**
   * Storage
   */
  StorageRead: "storage:read",
  StorageWrite: "storage:write",
  StorageNone: "storage:none",

  /**
   * Comments
   */
  CommentsWrite: "comments:write",
  CommentsRead: "comments:read",
  CommentsNone: "comments:none",

  /**
   * Feeds
   */
  FeedsRead: "feeds:read",
  FeedsWrite: "feeds:write",
  FeedsNone: "feeds:none",

  /**
   * Legacy
   */
  LegacyRoomPresenceWrite: "room:presence:write",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export type AccessLevel = "write" | "read" | "none";

export type RequiredAccessLevel = "read" | "write";

export type PermissionMatrix = {
  room: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: "write";
};

export type PermissionResources = keyof PermissionMatrix;

export type ResolvedPermissionMatrix = {
  hasDefaultPermission: boolean;
  baseAccess: AccessLevel;
  matrix: Partial<PermissionMatrix>;
};

type RoomPermissionResource = Exclude<PermissionResources, "room" | "personal">;

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

const NO_PERMISSION_MATRIX: PermissionMatrix = {
  room: "none",
  storage: "none",
  comments: "none",
  feeds: "none",
  personal: "write",
};

export const RESOURCE_PERMISSIONS: ResourcePermissionMap = {
  room: {
    read: [Permission.Read, Permission.RoomRead],
    write: [Permission.Write, Permission.RoomWrite],
  },
  personal: {
    write: [],
  },
  storage: {
    write: [Permission.StorageWrite],
    read: [Permission.StorageRead],
    none: [Permission.StorageNone],
  },
  comments: {
    write: [Permission.CommentsWrite],
    read: [Permission.CommentsRead],
    none: [Permission.CommentsNone],
  },
  feeds: {
    write: [Permission.FeedsWrite],
    read: [Permission.FeedsRead],
    none: [Permission.FeedsNone],
  },
};

export const DEFAULT_PERMISSION_RESOURCE = "room" satisfies PermissionResources;

export const ROOM_PERMISSION_RESOURCES = [
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

export function resolveFullPermissionMatrix(
  resolved: ResolvedPermissionMatrix
): PermissionMatrix {
  if (!resolved.hasDefaultPermission) {
    return NO_PERMISSION_MATRIX;
  }

  const matrix: PermissionMatrix = {
    ...NO_PERMISSION_MATRIX,
    [DEFAULT_PERMISSION_RESOURCE]: resolved.baseAccess,
  };

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    matrix[resource] = resolved.matrix[resource] ?? resolved.baseAccess;
  }

  return matrix;
}

export function permissionMatrixFromScopes(
  scopes: readonly string[]
): PermissionMatrix {
  return resolveFullPermissionMatrix(resolvePermissionMatrix(scopes));
}

export function resolvePermissionMatrix(
  scopes: readonly string[]
): ResolvedPermissionMatrix {
  const hasDefaultPermission =
    scopes.includes(Permission.Write) ||
    scopes.includes(Permission.Read) ||
    scopes.includes(Permission.RoomWrite) ||
    scopes.includes(Permission.RoomRead);

  const baseAccess: AccessLevel =
    scopes.includes(Permission.Write) || scopes.includes(Permission.RoomWrite)
      ? "write"
      : scopes.includes(Permission.Read) || scopes.includes(Permission.RoomRead)
        ? "read"
        : "none";

  const matrix: Partial<PermissionMatrix> = {};

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = resolveResourceAccess(scopes, resource);
    if (access !== undefined) {
      matrix[resource] = access;
    }
  }

  return { hasDefaultPermission, baseAccess, matrix };
}

export function hasPermissionAccess(
  scopes: readonly string[],
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean;
export function hasPermissionAccess(
  matrix: Partial<PermissionMatrix>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean;
export function hasPermissionAccess(
  source: readonly string[] | Partial<PermissionMatrix>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const matrix = isPermissionScopes(source)
    ? permissionMatrixFromScopes(source)
    : source;
  const access = matrix[resource] ?? "none";
  return ACCESS_RANKS[access] >= ACCESS_RANKS[requiredAccess];
}

function isPermissionScopes(
  source: readonly string[] | Partial<PermissionMatrix>
): source is readonly string[] {
  return Array.isArray(source);
}
