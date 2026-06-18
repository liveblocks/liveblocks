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

export type RoomPatternPermissions = {
  pattern: string;
  scopes: RoomPermissions;
};

type ResolvedPermissionScopes = {
  baseAccess?: AccessLevel;
  leafAccesses: Partial<Record<RoomPermissionsResource, AccessLevel>>;
};

const ACCESS_LEVEL_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const BASE_PERMISSIONS_BY_ACCESS: Partial<
  Record<AccessLevel, RoomPermissions>
> = {
  read: [Permission.Read, Permission.RoomRead],
  write: [Permission.Write, Permission.RoomWrite],
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

const BASE_PERMISSION_RESOURCE = "room" satisfies PermissionResources;

const basePermissionScopes = new Set<string>([
  Permission.Read,
  Permission.Write,
  Permission.RoomRead,
  Permission.RoomWrite,
]);

type ResourcePermissionsByAccess = Partial<
  Record<AccessLevel, RoomPermissions>
>;

const ROOM_PERMISSION_RESOURCES = Object.freeze([
  "storage",
  "comments",
  "comments:public",
  "comments:private",
  "feeds",
] as const satisfies readonly RoomPermissionsResource[]);

const CHILD_ROOM_PERMISSION_RESOURCES: ReadonlyMap<
  RoomPermissionsResource,
  readonly RoomPermissionsResource[]
> = (() => {
  const result = new Map<
    RoomPermissionsResource,
    readonly RoomPermissionsResource[]
  >();

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const childResourcePrefix = `${resource}:`;
    result.set(
      resource,
      Object.freeze(
        ROOM_PERMISSION_RESOURCES.filter((candidate) => {
          if (!candidate.startsWith(childResourcePrefix)) {
            return false;
          }

          return !candidate.slice(childResourcePrefix.length).includes(":");
        })
      )
    );
  }

  return result;
})();

const LEAF_ROOM_PERMISSION_RESOURCES_BY_PARENT: ReadonlyMap<
  RoomPermissionsResource,
  readonly RoomPermissionsResource[]
> = (() => {
  const result = new Map<
    RoomPermissionsResource,
    readonly RoomPermissionsResource[]
  >();

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    result.set(resource, Object.freeze(getLeafResources(resource)));
  }

  return result;
})();

const PARENT_ROOM_PERMISSION_RESOURCES: ReadonlyMap<
  RoomPermissionsResource,
  RoomPermissionsResource
> = (() => {
  const result = new Map<RoomPermissionsResource, RoomPermissionsResource>();

  for (const parentResource of ROOM_PERMISSION_RESOURCES) {
    for (const childResource of childResourcesOf(parentResource)) {
      result.set(childResource, parentResource);
    }
  }

  return result;
})();

export const LEAF_ROOM_PERMISSION_RESOURCES = Object.freeze(
  ROOM_PERMISSION_RESOURCES.filter(
    (resource) => childResourcesOf(resource).length === 0
  )
);

const PERMISSIONS_BY_ROOM_RESOURCE: Record<
  RoomPermissionsResource,
  ResourcePermissionsByAccess
> = {
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

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

export function normalizeRoomPermissions(
  permissions: string[] | readonly string[]
): RoomPermissions {
  if (!Array.isArray(permissions)) {
    throw new Error("Permission list must be an array");
  }

  const result: RoomPermissions = [];

  for (const permission of permissions) {
    const knownPermission = Object.values(Permission).find(
      (value) => value === permission
    );
    if (knownPermission === undefined) {
      throw new Error(`Not a valid permission: ${permission}`);
    }
    result.push(knownPermission);
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

    const feature = scope.split(":").slice(0, -1).join(":");
    if (seenFeatures.has(feature)) {
      return `Permissions can include at most one scope per feature, got multiple "${feature}" scopes`;
    }
    seenFeatures.add(feature);
  }

  return true;
}

export function permissionMatrixFromScopes(
  scopes: RoomPermissions
): PermissionMatrix {
  return permissionMatrixFromResolvedScopes(resolvePermissionScopes(scopes));
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
    if (parentResourceOf(resource) === undefined) {
      pushResourcePermissions(scopes, matrix, resource, baseAccess);
    }
  }

  return scopes;
}

export function hasPermissionAccess(
  matrix: Partial<PermissionMatrix>,
  resource: PermissionResources,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = matrix[resource] ?? "none";
  return ACCESS_LEVEL_RANKS[access] >= ACCESS_LEVEL_RANKS[requiredAccess];
}

export function permissionScopesSpecifyResource(
  scopes: RoomPermissions,
  resource: RoomPermissionsResource
): boolean {
  if (resolveResourceAccess(scopes, resource) !== undefined) {
    return true;
  }

  let parentResource = parentResourceOf(resource);
  while (parentResource !== undefined) {
    if (resolveResourceAccess(scopes, parentResource) !== undefined) {
      return true;
    }

    parentResource = parentResourceOf(parentResource);
  }

  return childResourcesOf(resource).some((childResource) =>
    permissionScopesSpecifyResource(scopes, childResource)
  );
}

export function resolveRoomPermissionMatrix(
  permissions: RoomPatternPermissions[],
  roomId: string
): PermissionMatrix | undefined {
  const matchedPermissions = permissions.filter((entry) => {
    if (entry.pattern.includes("*")) {
      return roomId.startsWith(entry.pattern.replace("*", ""));
    }

    return entry.pattern === roomId;
  });

  if (matchedPermissions.length === 0) {
    return undefined;
  }

  let hasDefaultPermission = false;
  let baseAccess: AccessLevel = "none";
  const leafAccesses: ResolvedPermissionScopes["leafAccesses"] = {};
  const leafSpecificity: Partial<Record<RoomPermissionsResource, number>> = {};

  for (const entry of matchedPermissions) {
    const resolved = resolvePermissionScopes(entry.scopes);
    const specificity = entry.pattern.replace("*", "").length;

    if (resolved.baseAccess !== undefined) {
      hasDefaultPermission = true;
      // Base access is additive across all matching patterns (highest wins),
      // unlike resource-specific overrides which use most-specific-wins.
      baseAccess = strongestAccess(baseAccess, resolved.baseAccess);
    }

    for (const resource of LEAF_ROOM_PERMISSION_RESOURCES) {
      if (resolved.leafAccesses[resource] === undefined) {
        continue;
      }

      const access = resolveLeafAccessFromSource(resolved, resource);
      const currentSpecificity = leafSpecificity[resource] ?? -1;

      if (specificity > currentSpecificity) {
        leafAccesses[resource] = access;
        leafSpecificity[resource] = specificity;
      } else if (specificity === currentSpecificity) {
        leafAccesses[resource] = strongestAccess(
          leafAccesses[resource] ?? "none",
          access
        );
      }
    }
  }

  return permissionMatrixFromResolvedScopes({
    baseAccess: hasDefaultPermission ? baseAccess : undefined,
    leafAccesses,
  });
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
    leafAccesses: {},
  };

  for (const source of sources) {
    if (source.baseAccess !== undefined) {
      merged.baseAccess = source.baseAccess;
    }

    for (const resource of LEAF_ROOM_PERMISSION_RESOURCES) {
      const sourceAccess = source.leafAccesses[resource];
      if (sourceAccess === undefined) {
        continue;
      }

      merged.leafAccesses[resource] = sourceAccess;
    }
  }

  return permissionMatrixToScopes(permissionMatrixFromResolvedScopes(merged));
}

function resolvePermissionScopes(
  scopes: RoomPermissions
): ResolvedPermissionScopes {
  const baseAccess = resolveAccess(scopes, BASE_PERMISSIONS_BY_ACCESS);
  const leafAccesses: ResolvedPermissionScopes["leafAccesses"] = {};

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = resolveResourceAccess(scopes, resource);
    if (access !== undefined) {
      for (const leafResource of leafResourcesOf(resource)) {
        leafAccesses[leafResource] = access;
      }
    }
  }

  return { baseAccess, leafAccesses };
}

function resolveResourceAccess(
  scopes: RoomPermissions,
  resource: RoomPermissionsResource
): AccessLevel | undefined {
  return resolveAccess(scopes, PERMISSIONS_BY_ROOM_RESOURCE[resource]);
}

function resolveAccess(
  scopes: RoomPermissions,
  permissions: Partial<Record<AccessLevel, RoomPermissions>>
): AccessLevel | undefined {
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
  if (resolved.baseAccess === undefined) {
    return { ...NO_PERMISSION_MATRIX };
  }

  const matrix: PermissionMatrix = {
    ...NO_PERMISSION_MATRIX,
    [BASE_PERMISSION_RESOURCE]: resolved.baseAccess,
    personal: "write",
  };

  for (const resource of LEAF_ROOM_PERMISSION_RESOURCES) {
    matrix[resource] = resolveLeafAccessFromSource(resolved, resource);
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    if (childResourcesOf(resource).length > 0) {
      let strongest: AccessLevel = "none";

      for (const leafResource of leafResourcesOf(resource)) {
        strongest = strongestAccess(strongest, matrix[leafResource]);
      }

      matrix[resource] = strongest;
    }
  }

  return matrix;
}

function resolveLeafAccessFromSource(
  source: ResolvedPermissionScopes,
  resource: RoomPermissionsResource
): AccessLevel {
  const access = source.leafAccesses[resource];
  if (access !== undefined) {
    return access;
  }

  return source.baseAccess ?? "none";
}

function pushResourcePermissions(
  scopes: RoomPermissions,
  matrix: PermissionMatrix,
  resource: RoomPermissionsResource,
  baseAccess: AccessLevel
): void {
  const childResources = childResourcesOf(resource);
  if (childResources.length === 0) {
    const access = matrix[resource];
    if (access !== baseAccess) {
      scopes.push(permissionForAccessLevel(resource, access));
    }
    return;
  }

  const leafResources = leafResourcesOf(resource);
  let sharedAccess: AccessLevel | undefined;
  let allLeavesShareAccess = true;

  for (const leafResource of leafResources) {
    const access = matrix[leafResource];
    sharedAccess ??= access;
    if (access !== sharedAccess) {
      allLeavesShareAccess = false;
      break;
    }
  }

  if (
    sharedAccess !== undefined &&
    sharedAccess !== baseAccess &&
    allLeavesShareAccess
  ) {
    scopes.push(permissionForAccessLevel(resource, sharedAccess));
    return;
  }

  for (const childResource of childResources) {
    pushResourcePermissions(scopes, matrix, childResource, baseAccess);
  }
}

function mergeResolvedScopesByHighestAccess(
  sources: ResolvedPermissionScopes[]
): ResolvedPermissionScopes {
  const merged: ResolvedPermissionScopes = {
    leafAccesses: {},
  };

  for (const source of sources) {
    if (source.baseAccess !== undefined) {
      merged.baseAccess = strongestAccess(
        merged.baseAccess ?? "none",
        source.baseAccess
      );
    }

    for (const resource of LEAF_ROOM_PERMISSION_RESOURCES) {
      const sourceAccess = source.leafAccesses[resource];
      if (sourceAccess === undefined) {
        continue;
      }

      merged.leafAccesses[resource] = strongestAccess(
        merged.leafAccesses[resource] ?? "none",
        sourceAccess
      );
    }
  }

  return merged;
}

function permissionForAccessLevel(
  resource: PermissionResources,
  access: AccessLevel,
  field: string = resource
): Permission {
  const permissions =
    resource === "room"
      ? BASE_PERMISSIONS_BY_ACCESS[access]
      : resource === "personal"
        ? undefined
        : PERMISSIONS_BY_ROOM_RESOURCE[resource][access];
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

function leafResourcesOf(
  resource: RoomPermissionsResource
): readonly RoomPermissionsResource[] {
  return LEAF_ROOM_PERMISSION_RESOURCES_BY_PARENT.get(resource) ?? [];
}

function childResourcesOf(
  resource: RoomPermissionsResource
): readonly RoomPermissionsResource[] {
  return CHILD_ROOM_PERMISSION_RESOURCES.get(resource) ?? [];
}

function parentResourceOf(
  resource: RoomPermissionsResource
): RoomPermissionsResource | undefined {
  return PARENT_ROOM_PERMISSION_RESOURCES.get(resource);
}

function getLeafResources(
  resource: RoomPermissionsResource
): RoomPermissionsResource[] {
  const childResources = childResourcesOf(resource);
  if (childResources.length === 0) {
    return [resource];
  }

  return childResources.flatMap(getLeafResources);
}
