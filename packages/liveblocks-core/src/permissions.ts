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

type ResolvedPermissionScopes = {
  hasDefaultPermission: boolean;
  baseAccess: AccessLevel;
  matrix: Partial<PermissionMatrix>;
};

export type RoomPermissionGrant = {
  resource: string;
  scopes: readonly Permission[];
};

export type RoomPermission = Permission[];

export type RoomPermissionInput = readonly Permission[];

export type RoomAccesses = Record<string, RoomPermission>;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;
export type RoomAccessesUpdateInput = Record<
  string,
  RoomPermissionInput | null
>;

export type RoomPermissionSources = {
  defaultAccesses: readonly Permission[];
  groupsAccesses: readonly (readonly Permission[])[];
  userAccesses?: readonly Permission[] | undefined;
};

type RoomPermissionResource = Exclude<PermissionResources, "room" | "personal">;

type ResourcePermissionMap = Record<
  PermissionResources,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

const ACCESS_LEVEL_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const PERMISSIONS_BY_RESOURCE: ResourcePermissionMap = {
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
] as const satisfies ReadonlyArray<RoomPermissionResource>;

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

function resolveResourceAccess(
  scopes: readonly string[],
  resource: RoomPermissionResource
): AccessLevel | undefined {
  const permissions: Partial<Record<AccessLevel, readonly Permission[]>> =
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
  scopes: readonly string[]
): PermissionMatrix {
  return permissionMatrixFromResolvedScopes(resolvePermissionScopes(scopes));
}

function resolvePermissionScopes(
  scopes: readonly string[]
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
  permissions: readonly RoomPermissionGrant[],
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

export function normalizeRoomPermissionInput(
  input: RoomPermissionInput
): RoomPermission {
  if (!Array.isArray(input)) {
    throw new Error("Permission list must be an array");
  }

  return input.map((permission) => {
    if (!VALID_PERMISSIONS.has(permission)) {
      throw new Error(`Not a valid permission: ${permission}`);
    }
    return permission;
  });
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

export function mergePermissionMatrices(
  sources: readonly PermissionMatrix[]
): PermissionMatrix {
  return {
    room: strongestMatrixAccess(sources, "room"),
    storage: strongestMatrixAccess(sources, "storage"),
    comments: strongestMatrixAccess(sources, "comments"),
    feeds: strongestMatrixAccess(sources, "feeds"),
    personal: strongestMatrixAccess(sources, "personal"),
  };
}

export function permissionMatrixToScopes(
  matrix: PermissionMatrix
): RoomPermission {
  const scopes: RoomPermission = [];
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

export function mergeRoomPermissionScopes({
  defaultAccesses,
  groupsAccesses,
  userAccesses,
}: RoomPermissionSources): Permission[] {
  const sources = [
    permissionMatrixFromScopes(defaultAccesses),
    ...groupsAccesses.map((scopes) => permissionMatrixFromScopes(scopes)),
    ...(userAccesses !== undefined
      ? [permissionMatrixFromScopes(userAccesses)]
      : []),
  ];

  return permissionMatrixToScopes(mergePermissionMatrices(sources));
}

function permissionForAccessLevel(
  resource: PermissionResources,
  access: AccessLevel,
  field: string = resource
): Permission {
  const levels: Partial<Record<AccessLevel, readonly Permission[]>> =
    PERMISSIONS_BY_RESOURCE[resource];
  const permissions = levels[access];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${field}: ${JSON.stringify(access) ?? String(access)}`
    );
  }
  return permissions[0];
}

function strongestMatrixAccess(
  sources: readonly PermissionMatrix[],
  resource: PermissionResources
): AccessLevel {
  return sources.reduce<AccessLevel>(
    (strongest, source) => strongestAccess(strongest, source[resource]),
    "none"
  );
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
