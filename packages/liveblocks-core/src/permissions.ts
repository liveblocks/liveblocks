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

const ACCESS_LEVELS = ["none", "read", "write"] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export type RequiredAccessLevel = "read" | "write";

export type PermissionMatrix = {
  room: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: AccessLevel;
};

export type PermissionResources = keyof PermissionMatrix;

const basePermissionScopes = new Set<string>([
  Permission.Read,
  Permission.Write,
  Permission.RoomRead,
  Permission.RoomWrite,
]);

type ResolvedPermissionScopes = {
  hasDefaultPermission: boolean;
  baseAccess: AccessLevel;
  matrix: Partial<PermissionMatrix>;
};

export type RoomPermissionsGrant = {
  resource: string;
  scopes: RoomPermissions;
};

export type RoomPermissions = Permission[];

export type RoomAccesses = Record<string, RoomPermissions>;

export type UpdateRoomAccesses = Record<string, RoomPermissions | null>;

type RoomPermissionsResource = Exclude<
  PermissionResources,
  "room" | "personal"
>;

type ResourcePermissionsMap = Record<
  PermissionResources,
  Partial<Record<AccessLevel, RoomPermissions>>
>;

const ACCESS_LEVEL_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const PERMISSIONS_BY_RESOURCE: ResourcePermissionsMap = {
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

const NO_PERMISSION_MATRIX: PermissionMatrix = {
  room: "none",
  storage: "none",
  comments: "none",
  feeds: "none",
  personal: "none",
};

const BASE_PERMISSION_RESOURCE = "room" satisfies PermissionResources;

const ROOM_PERMISSION_RESOURCES = [
  "storage",
  "comments",
  "feeds",
] as const satisfies RoomPermissionsResource[];

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

function isPermission(permission: string): permission is Permission {
  return VALID_PERMISSIONS.has(permission);
}

function resolveResourceAccess(
  scopes: RoomPermissions,
  resource: RoomPermissionsResource
): AccessLevel | undefined {
  const permissions: Partial<Record<AccessLevel, RoomPermissions>> =
    PERMISSIONS_BY_RESOURCE[resource];
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

function permissionMatrixFromResolvedScopes(
  resolved: ResolvedPermissionScopes
): PermissionMatrix {
  if (!resolved.hasDefaultPermission) {
    return { ...NO_PERMISSION_MATRIX };
  }

  const matrix: PermissionMatrix = {
    ...NO_PERMISSION_MATRIX,
    [BASE_PERMISSION_RESOURCE]: resolved.baseAccess,
    personal: "write",
  };

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    matrix[resource] = resolved.matrix[resource] ?? resolved.baseAccess;
  }

  return matrix;
}

export function permissionMatrixFromScopes(
  scopes: RoomPermissions
): PermissionMatrix {
  return permissionMatrixFromResolvedScopes(resolvePermissionScopes(scopes));
}

function resolvePermissionScopes(
  scopes: RoomPermissions
): ResolvedPermissionScopes {
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
  matrix: Partial<PermissionMatrix>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = matrix[resource] ?? "none";
  return ACCESS_LEVEL_RANKS[access] >= ACCESS_LEVEL_RANKS[requiredAccess];
}

export function resolveRoomPermissionMatrix(
  permissions: RoomPermissionsGrant[],
  roomId: string
): PermissionMatrix | undefined {
  const matchedPermissions = permissions.filter((permission) =>
    resourceMatchesRoomId(permission.resource, roomId)
  );

  if (matchedPermissions.length === 0) {
    return undefined;
  }

  let hasDefaultPermission = false;
  let baseAccess: AccessLevel = "none";
  const explicitMatrix: Partial<PermissionMatrix> = {};
  const explicitSpecificity: Partial<Record<PermissionResources, number>> = {};

  for (const permission of matchedPermissions) {
    const resolved = resolvePermissionScopes(permission.scopes);
    const specificity = getResourceSpecificity(permission.resource);

    if (resolved.hasDefaultPermission) {
      hasDefaultPermission = true;
      baseAccess = strongestAccess(baseAccess, resolved.baseAccess);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = resolved.matrix[resource];
      if (access !== undefined) {
        const currentSpecificity = explicitSpecificity[resource] ?? -1;

        if (specificity > currentSpecificity) {
          explicitMatrix[resource] = access;
          explicitSpecificity[resource] = specificity;
        } else if (specificity === currentSpecificity) {
          explicitMatrix[resource] = strongestAccess(
            explicitMatrix[resource] ?? "none",
            access
          );
        }
      }
    }
  }

  return permissionMatrixFromResolvedScopes({
    hasDefaultPermission,
    baseAccess,
    matrix: explicitMatrix,
  });
}

export function normalizeRoomPermissions(
  permissions: string[] | readonly string[]
): RoomPermissions {
  if (!Array.isArray(permissions)) {
    throw new Error("Permission list must be an array");
  }

  return permissions.map((permission) => {
    if (!isPermission(permission)) {
      throw new Error(`Not a valid permission: ${permission}`);
    }
    return permission;
  });
}

export function normalizeRoomAccesses(
  accesses: RoomAccesses | undefined
): RoomAccesses | undefined {
  if (accesses === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(accesses).map(([id, permissions]) => [
      id,
      normalizeRoomPermissions(permissions),
    ])
  );
}

export function normalizeUpdateRoomAccesses(
  accesses: UpdateRoomAccesses | undefined
): UpdateRoomAccesses | undefined {
  if (accesses === undefined) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(accesses).map(([id, permissions]) => [
      id,
      permissions === null ? null : normalizeRoomPermissions(permissions),
    ])
  );
}

export function permissionMatrixToScopes(
  matrix: PermissionMatrix
): RoomPermissions {
  const scopes: RoomPermissions = [];
  const baseAccess = matrix.room;

  if (baseAccess !== "none") {
    scopes.push(permissionForAccessLevel(BASE_PERMISSION_RESOURCE, baseAccess));
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = matrix[resource];
    if (access !== baseAccess) {
      scopes.push(permissionForAccessLevel(resource, access));
    }
  }

  return scopes;
}

/**
 * Merges permission scopes from multiple sources, by priority: explicit user
 * accesses override group accesses, which override the room defaults. Groups
 * all share the same priority, so they are first merged together by taking
 * the highest access level per feature (and base).
 */
export function mergeRoomPermissionScopes({
  defaultAccesses,
  groupsAccesses,
  userAccesses,
}: {
  defaultAccesses: RoomPermissions;
  groupsAccesses: RoomPermissions[];
  userAccesses: RoomPermissions;
}): RoomPermissions {
  // Ordered from lowest to highest priority
  const sources = [
    resolvePermissionScopes(defaultAccesses),
    mergeResolvedScopesByHighestAccess(
      groupsAccesses.map(resolvePermissionScopes)
    ),
    resolvePermissionScopes(userAccesses),
  ];

  const merged: ResolvedPermissionScopes = {
    hasDefaultPermission: false,
    baseAccess: "none",
    matrix: {},
  };

  for (const source of sources) {
    if (source.hasDefaultPermission) {
      merged.hasDefaultPermission = true;
      merged.baseAccess = source.baseAccess;
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = source.matrix[resource];
      if (access !== undefined) {
        merged.matrix[resource] = access;
      }
    }
  }

  return permissionMatrixToScopes(permissionMatrixFromResolvedScopes(merged));
}

function mergeResolvedScopesByHighestAccess(
  sources: ResolvedPermissionScopes[]
): ResolvedPermissionScopes {
  const merged: ResolvedPermissionScopes = {
    hasDefaultPermission: false,
    baseAccess: "none",
    matrix: {},
  };

  for (const source of sources) {
    if (source.hasDefaultPermission) {
      merged.hasDefaultPermission = true;
      merged.baseAccess = strongestAccess(merged.baseAccess, source.baseAccess);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = source.matrix[resource];
      if (access !== undefined) {
        merged.matrix[resource] = strongestAccess(
          merged.matrix[resource] ?? "none",
          access
        );
      }
    }
  }

  return merged;
}

function permissionForAccessLevel(
  resource: PermissionResources,
  access: AccessLevel,
  field: string = resource
): Permission {
  const levels: Partial<Record<AccessLevel, RoomPermissions>> =
    PERMISSIONS_BY_RESOURCE[resource];
  const permissions = levels[access];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${field}: ${JSON.stringify(access) ?? String(access)}`
    );
  }
  return permissions[0];
}

function strongestAccess(left: AccessLevel, right: AccessLevel): AccessLevel {
  return ACCESS_LEVEL_RANKS[right] > ACCESS_LEVEL_RANKS[left] ? right : left;
}

function resourceMatchesRoomId(resource: string, roomId: string): boolean {
  if (resource.includes("*")) {
    return roomId.startsWith(resource.replace("*", ""));
  }

  return resource === roomId;
}

function getResourceSpecificity(resource: string): number {
  return resource.replace("*", "").length;
}

/**
 * Validates a set of permissions:
 * - every scope must be a known permission scope,
 * - exactly one base permission is required (*:read, *:write, or the legacy
 *   aliases room:read, room:write),
 * - at most one scope per feature (storage, comments, feeds, ...),
 * - room:presence:write is accepted as an extra legacy scope.
 *
 * Returns `true` when the set is valid, or an error message otherwise.
 */
export function validatePermissionsSet(
  scopes: readonly string[]
): true | string {
  const unknownScopes = scopes.filter((scope) => !VALID_PERMISSIONS.has(scope));
  if (unknownScopes.length > 0) {
    return `Unknown permission scope(s): ${unknownScopes.join(", ")}`;
  }

  const baseScopes = scopes.filter((scope) => basePermissionScopes.has(scope));
  if (baseScopes.length !== 1) {
    return (
      `Permissions must include exactly one of ${Permission.Read}, ${Permission.Write} ` +
      `(or the legacy aliases ${Permission.RoomRead}, ${Permission.RoomWrite}), ` +
      `got ${baseScopes.length === 0 ? "none" : baseScopes.join(", ")}`
    );
  }

  const seenFeatures = new Set<string>();
  for (const scope of scopes) {
    if (
      basePermissionScopes.has(scope) ||
      scope === Permission.LegacyRoomPresenceWrite
    ) {
      continue;
    }

    const feature = scope.slice(0, scope.indexOf(":"));
    if (seenFeatures.has(feature)) {
      return `Permissions can include at most one scope per feature, got multiple "${feature}" scopes`;
    }
    seenFeatures.add(feature);
  }

  return true;
}
