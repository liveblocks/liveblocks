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
  CommentsPublicWrite: "comments:public:write",
  CommentsPublicRead: "comments:public:read",
  CommentsPublicNone: "comments:public:none",
  CommentsPrivateWrite: "comments:private:write",
  CommentsPrivateRead: "comments:private:read",
  CommentsPrivateNone: "comments:private:none",

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
  "comments:public": AccessLevel;
  "comments:private": AccessLevel;
  feeds: AccessLevel;
  personal: AccessLevel;
};

export type PermissionResources = keyof PermissionMatrix;

export type RoomPermissions = Permission[];

export type RoomAccesses = Record<string, RoomPermissions>;

export type UpdateRoomAccesses = Record<string, RoomPermissions | null>;

export type RoomPermissionsResource = Exclude<
  PermissionResources,
  "room" | "personal"
>;

type PermissionScopeResource = Exclude<PermissionResources, "personal">;

type ExplicitPermissionMatrix = Partial<
  Record<PermissionScopeResource, AccessLevel>
>;

export type RoomPatternPermissions = {
  pattern: string;
  scopes: RoomPermissions;
};

type ResourcePermissionsMap = Record<
  PermissionScopeResource,
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
  "comments:public": {
    write: [Permission.CommentsPublicWrite],
    read: [Permission.CommentsPublicRead],
    none: [Permission.CommentsPublicNone],
  },
  "comments:private": {
    write: [Permission.CommentsPrivateWrite],
    read: [Permission.CommentsPrivateRead],
    none: [Permission.CommentsPrivateNone],
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
  "comments:public": "none",
  "comments:private": "none",
  feeds: "none",
  personal: "none",
};

const BASE_PERMISSION_RESOURCE = "room" satisfies PermissionScopeResource;

const ROOM_PERMISSION_RESOURCES = [
  "storage",
  "comments",
  "comments:public",
  "comments:private",
  "feeds",
] as const satisfies readonly RoomPermissionsResource[];

const COMMENT_VISIBILITY_RESOURCES = [
  "comments:public",
  "comments:private",
] as const satisfies readonly RoomPermissionsResource[];

const basePermissionScopes = new Set<string>([
  Permission.Read,
  Permission.Write,
  Permission.RoomRead,
  Permission.RoomWrite,
]);

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

function isPermission(permission: string): permission is Permission {
  return VALID_PERMISSIONS.has(permission);
}

function resolveResourceAccess(
  scopes: RoomPermissions,
  resource: PermissionScopeResource
): AccessLevel | undefined {
  const permissions = PERMISSIONS_BY_RESOURCE[resource];
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

function explicitPermissionMatrixFromScopes(
  scopes: RoomPermissions
): ExplicitPermissionMatrix {
  const matrix: ExplicitPermissionMatrix = {};

  const baseAccess = resolveResourceAccess(scopes, BASE_PERMISSION_RESOURCE);
  if (baseAccess !== undefined) {
    matrix.room = baseAccess;
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = resolveResourceAccess(scopes, resource);
    if (access !== undefined) {
      matrix[resource] = access;
    }
  }

  return matrix;
}

function permissionMatrixFromExplicitPermissions(
  explicitMatrix: ExplicitPermissionMatrix
): PermissionMatrix {
  const baseAccess = explicitMatrix.room;
  if (baseAccess === undefined) {
    return { ...NO_PERMISSION_MATRIX };
  }

  const commentsAccess = explicitMatrix.comments ?? baseAccess;

  return {
    room: baseAccess,
    storage: explicitMatrix.storage ?? baseAccess,
    comments: commentsAccess,
    "comments:public": explicitMatrix["comments:public"] ?? commentsAccess,
    "comments:private": explicitMatrix["comments:private"] ?? commentsAccess,
    feeds: explicitMatrix.feeds ?? baseAccess,
    personal: "write",
  };
}

export function permissionMatrixFromScopes(
  scopes: RoomPermissions
): PermissionMatrix {
  return permissionMatrixFromExplicitPermissions(
    explicitPermissionMatrixFromScopes(scopes)
  );
}

export function hasPermissionAccess(
  matrix: Partial<PermissionMatrix>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const requiredRank = ACCESS_LEVEL_RANKS[requiredAccess];

  if (resource === "comments") {
    const commentsRank = Math.max(
      ACCESS_LEVEL_RANKS[matrix.comments ?? "none"],
      ACCESS_LEVEL_RANKS[matrix["comments:public"] ?? "none"],
      ACCESS_LEVEL_RANKS[matrix["comments:private"] ?? "none"]
    );
    return commentsRank >= requiredRank;
  }

  const access = matrix[resource] ?? "none";
  return ACCESS_LEVEL_RANKS[access] >= requiredRank;
}

export function resolveRoomPermissionMatrix(
  permissions: RoomPatternPermissions[],
  roomId: string
): PermissionMatrix | undefined {
  const matchedPermissions = permissions.filter((entry) =>
    roomPatternMatches(entry.pattern, roomId)
  );

  if (matchedPermissions.length === 0) {
    return undefined;
  }

  const matrix: ExplicitPermissionMatrix = {};
  const specificityByResource: Partial<
    Record<RoomPermissionsResource, number>
  > = {};

  for (const entry of matchedPermissions) {
    const explicitMatrix = explicitPermissionMatrixFromScopes(entry.scopes);
    const specificity = roomPatternSpecificity(entry.pattern);

    if (explicitMatrix.room !== undefined) {
      // Base access is additive across all matching patterns (highest wins),
      // unlike resource-specific overrides which use most-specific-wins.
      matrix.room = strongestAccess(matrix.room ?? "none", explicitMatrix.room);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = explicitAccessForResource(explicitMatrix, resource);
      if (access === undefined) {
        continue;
      }

      const currentSpecificity = specificityByResource[resource] ?? -1;
      if (specificity > currentSpecificity) {
        matrix[resource] = access;
        specificityByResource[resource] = specificity;
      } else if (specificity === currentSpecificity) {
        matrix[resource] = strongestAccess(matrix[resource] ?? "none", access);
      }
    }
  }

  return permissionMatrixFromExplicitPermissions(matrix);
}

export function normalizeRoomPermissions(
  permissions: string[] | readonly string[]
): RoomPermissions {
  if (!Array.isArray(permissions)) {
    throw new Error("Permission list must be an array");
  }

  const result: RoomPermissions = [];

  for (const permission of permissions) {
    if (!isPermission(permission)) {
      throw new Error(`Not a valid permission: ${permission}`);
    }
    result.push(permission);
  }

  return result;
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

  if (matrix.storage !== baseAccess) {
    scopes.push(permissionForAccessLevel("storage", matrix.storage));
  }

  const commentsAccess = matrix.comments;
  if (commentsAccess !== baseAccess) {
    scopes.push(permissionForAccessLevel("comments", commentsAccess));
  }

  for (const resource of COMMENT_VISIBILITY_RESOURCES) {
    if (matrix[resource] !== commentsAccess) {
      scopes.push(permissionForAccessLevel(resource, matrix[resource]));
    }
  }

  if (matrix.feeds !== baseAccess) {
    scopes.push(permissionForAccessLevel("feeds", matrix.feeds));
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
    explicitPermissionMatrixFromScopes(defaultAccesses),
    mergeExplicitPermissionMatricesByHighestAccess(
      groupsAccesses.map(explicitPermissionMatrixFromScopes)
    ),
    explicitPermissionMatrixFromScopes(userAccesses),
  ];

  const merged: ExplicitPermissionMatrix = {};

  for (const source of sources) {
    if (source.room !== undefined) {
      merged.room = source.room;
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = explicitAccessForResource(source, resource);
      if (access !== undefined) {
        merged[resource] = access;
      }
    }
  }

  return permissionMatrixToScopes(
    permissionMatrixFromExplicitPermissions(merged)
  );
}

function mergeExplicitPermissionMatricesByHighestAccess(
  sources: ExplicitPermissionMatrix[]
): ExplicitPermissionMatrix {
  const merged: ExplicitPermissionMatrix = {};

  for (const source of sources) {
    if (source.room !== undefined) {
      merged.room = strongestAccess(merged.room ?? "none", source.room);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = explicitAccessForResource(source, resource);
      if (access !== undefined) {
        merged[resource] = strongestAccess(merged[resource] ?? "none", access);
      }
    }
  }

  return merged;
}

function explicitAccessForResource(
  source: ExplicitPermissionMatrix,
  resource: RoomPermissionsResource
): AccessLevel | undefined {
  return (
    source[resource] ??
    (isCommentVisibilityResource(resource) ? source.comments : undefined)
  );
}

function permissionForAccessLevel(
  resource: PermissionScopeResource,
  access: AccessLevel,
  field: string = resource
): Permission {
  const permissions = PERMISSIONS_BY_RESOURCE[resource][access];
  const permission = permissions?.[0];
  if (permission !== undefined) {
    return permission;
  }

  throw new Error(
    `Invalid permission level for ${field}: ${JSON.stringify(access) ?? String(access)}`
  );
}

function strongestAccess(left: AccessLevel, right: AccessLevel): AccessLevel {
  return ACCESS_LEVEL_RANKS[right] > ACCESS_LEVEL_RANKS[left] ? right : left;
}

function roomPatternMatches(pattern: string, roomId: string): boolean {
  if (pattern.includes("*")) {
    return roomId.startsWith(pattern.replace("*", ""));
  }

  return pattern === roomId;
}

function roomPatternSpecificity(pattern: string): number {
  return pattern.replace("*", "").length;
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

    const feature = permissionFeature(scope);
    if (seenFeatures.has(feature)) {
      return `Permissions can include at most one scope per feature, got multiple "${feature}" scopes`;
    }
    seenFeatures.add(feature);
  }

  return true;
}

function permissionFeature(scope: string): string {
  const accessSeparatorIndex = scope.lastIndexOf(":");
  return accessSeparatorIndex === -1
    ? scope
    : scope.slice(0, accessSeparatorIndex);
}

function isCommentVisibilityResource(
  resource: RoomPermissionsResource
): resource is (typeof COMMENT_VISIBILITY_RESOURCES)[number] {
  return resource.startsWith("comments:");
}
