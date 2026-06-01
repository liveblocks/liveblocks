export const Permission = {
  /**
   * Default permission for a room
   */
  RoomWrite: "room:write",
  RoomRead: "room:read",

  /**
   * Presence (and WebSocket access)
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
  Read: "room:read",
  Write: "room:write",
  PresenceWrite: "room:presence:write",
  CommentsWrite: "comments:write",
  CommentsRead: "comments:read",
  FeedsWrite: "feeds:write",
  LegacyRoomPresenceWrite: "room:presence:write",
  LegacyCommentsWrite: "comments:write",
  LegacyCommentsRead: "comments:read",
  LegacyFeedsWrite: "feeds:write",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROOM_PERMISSIONS = Object.freeze([
  Permission.RoomRead,
  Permission.RoomWrite,
  Permission.RoomPresenceRead,
  Permission.RoomPresenceNone,
  Permission.RoomStorageRead,
  Permission.RoomStorageWrite,
  Permission.RoomStorageNone,
  Permission.RoomCommentsRead,
  Permission.RoomCommentsWrite,
  Permission.RoomCommentsNone,
  Permission.RoomFeedsRead,
  Permission.RoomFeedsWrite,
  Permission.RoomFeedsNone,
] as const);

export const LEGACY_ROOM_PERMISSIONS = Object.freeze([
  Permission.LegacyRoomPresenceWrite,
  Permission.LegacyCommentsRead,
  Permission.LegacyCommentsWrite,
  Permission.LegacyFeedsWrite,
] as const);

export const ROOM_PERMISSION_OBJECT_FIELDS = Object.freeze({
  default: {
    read: Permission.RoomRead,
    write: Permission.RoomWrite,
  },
  presence: {
    none: Permission.RoomPresenceNone,
    read: Permission.RoomPresenceRead,
  },
  storage: {
    none: Permission.RoomStorageNone,
    read: Permission.RoomStorageRead,
    write: Permission.RoomStorageWrite,
  },
  comments: {
    none: Permission.RoomCommentsNone,
    read: Permission.RoomCommentsRead,
    write: Permission.RoomCommentsWrite,
  },
  feeds: {
    none: Permission.RoomFeedsNone,
    read: Permission.RoomFeedsRead,
    write: Permission.RoomFeedsWrite,
  },
} as const);

export type RoomPermission = `${(typeof ROOM_PERMISSIONS)[number]}`;
export type LegacyRoomPermission =
  `${(typeof LEGACY_ROOM_PERMISSIONS)[number]}`;
export type LiveblocksPermission = RoomPermission | LegacyRoomPermission;
export type LiveblocksPermissions = Record<string, LiveblocksPermission[]>;

const ROOM_PERMISSION_SET: ReadonlySet<string> = new Set(ROOM_PERMISSIONS);

const LIVEBLOCKS_PERMISSIONS_SET: ReadonlySet<string> = new Set([
  ...ROOM_PERMISSIONS,
  ...LEGACY_ROOM_PERMISSIONS,
]);

export function isRoomPermission(value: string): value is RoomPermission {
  return ROOM_PERMISSION_SET.has(value);
}

export function isLiveblocksPermission(
  value: string
): value is LiveblocksPermission {
  return LIVEBLOCKS_PERMISSIONS_SET.has(value);
}

export type AccessLevel = "write" | "read" | "none";
export type RequiredAccessLevel = Exclude<AccessLevel, "none">;

const ROOM_PERMISSION_FEATURES = [
  "presence",
  "storage",
  "comments",
  "feeds",
] as const;

export type RoomPermissionFeature = (typeof ROOM_PERMISSION_FEATURES)[number];
export type RoomPermissionLevels = Record<RoomPermissionFeature, AccessLevel>;

const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

type FeaturePermissionCandidate = {
  readonly level: AccessLevel;
  readonly permission: Permission;
};

type FeaturePermissionConfig = {
  readonly candidates: readonly FeaturePermissionCandidate[];
};

const ROOM_FEATURE_PERMISSION_CONFIG: Record<
  RoomPermissionFeature,
  FeaturePermissionConfig
> = {
  presence: {
    candidates: [
      { level: "none", permission: Permission.RoomPresenceNone },
      { level: "read", permission: Permission.RoomPresenceRead },
      { level: "write", permission: Permission.LegacyRoomPresenceWrite },
    ],
  },
  storage: {
    candidates: [
      { level: "none", permission: Permission.RoomStorageNone },
      { level: "read", permission: Permission.RoomStorageRead },
      { level: "write", permission: Permission.RoomStorageWrite },
    ],
  },
  comments: {
    candidates: [
      { level: "none", permission: Permission.RoomCommentsNone },
      { level: "read", permission: Permission.RoomCommentsRead },
      { level: "write", permission: Permission.RoomCommentsWrite },
      { level: "read", permission: Permission.LegacyCommentsRead },
      { level: "write", permission: Permission.LegacyCommentsWrite },
    ],
  },
  feeds: {
    candidates: [
      { level: "none", permission: Permission.RoomFeedsNone },
      { level: "read", permission: Permission.RoomFeedsRead },
      { level: "write", permission: Permission.RoomFeedsWrite },
      { level: "write", permission: Permission.LegacyFeedsWrite },
    ],
  },
};

const GLOBAL_ROOM_PERMISSIONS = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

function featurePermissionStrings(
  feature: RoomPermissionFeature
): readonly Permission[] {
  return ROOM_FEATURE_PERMISSION_CONFIG[feature].candidates.map(
    (candidate) => candidate.permission
  );
}

function getBaseAccessLevel(scopes: ReadonlySet<Permission>): AccessLevel {
  if (scopes.has(Permission.RoomWrite)) {
    return "write";
  }

  if (scopes.has(Permission.RoomRead)) {
    return "read";
  }

  return "none";
}

function featureAccessLevel(
  scopes: ReadonlySet<Permission>,
  candidates: readonly { level: AccessLevel; permission: Permission }[],
  fallback: AccessLevel
): AccessLevel {
  let resolved: AccessLevel | undefined;

  for (const { level, permission } of candidates) {
    if (!scopes.has(permission)) {
      continue;
    }

    if (
      resolved === undefined ||
      ACCESS_LEVEL_RANK[level] > ACCESS_LEVEL_RANK[resolved]
    ) {
      resolved = level;
    }
  }

  return resolved ?? fallback;
}

function roomFeatureAccessLevel(
  feature: RoomPermissionFeature,
  scopes: ReadonlySet<Permission>,
  fallback: AccessLevel
): AccessLevel {
  return featureAccessLevel(
    scopes,
    ROOM_FEATURE_PERMISSION_CONFIG[feature].candidates,
    fallback
  );
}

export function hasRoomFeatureAccess(
  scopes: readonly Permission[],
  feature: RoomPermissionFeature,
  requiredAccess: RequiredAccessLevel
): boolean {
  const levels = resolveRoomPermissions(scopes);
  return requiredAccess === "write"
    ? canWriteRoomFeature(levels, feature)
    : canReadRoomFeature(levels, feature);
}

export type PermissionScopes = readonly string[] | ReadonlySet<string>;
export type RequestedScope =
  | typeof Permission.RoomPresenceRead
  | typeof Permission.RoomStorageRead
  | typeof Permission.RoomStorageWrite
  | typeof Permission.RoomCommentsRead
  | typeof Permission.RoomCommentsWrite
  | typeof Permission.RoomFeedsRead
  | typeof Permission.RoomFeedsWrite;

export type PermissionRequest = {
  readonly requestedScope?: RequestedScope;
  readonly roomId?: string;
};

export type PermissionGrantMatcher = {
  canUse(request: PermissionRequest): boolean;
};

export function asPermissionSet(
  scopes: PermissionScopes
): ReadonlySet<Permission> {
  const permissionSet = new Set<Permission>();

  for (const scope of scopes) {
    if (isLiveblocksPermission(scope)) {
      permissionSet.add(scope);
    }
  }

  return permissionSet;
}

function hasAnyPermission(
  scopes: ReadonlySet<Permission>,
  permissions: readonly Permission[]
): boolean {
  for (const permission of permissions) {
    if (scopes.has(permission)) {
      return true;
    }
  }
  return false;
}

export function resolveRoomPermissions(
  scopes: PermissionScopes
): RoomPermissionLevels {
  const permissionSet = asPermissionSet(scopes);
  const base = getBaseAccessLevel(permissionSet);

  return {
    presence: roomFeatureAccessLevel("presence", permissionSet, base),
    storage: roomFeatureAccessLevel("storage", permissionSet, base),
    comments: roomFeatureAccessLevel("comments", permissionSet, base),
    feeds: roomFeatureAccessLevel("feeds", permissionSet, base),
  };
}

function resolveRoomPermissionOverrides(
  scopes: ReadonlySet<Permission>
): Partial<RoomPermissionLevels> {
  const resolved = resolveRoomPermissions(scopes);
  const overrides: Partial<RoomPermissionLevels> = {};

  if (hasAnyPermission(scopes, GLOBAL_ROOM_PERMISSIONS)) {
    for (const feature of ROOM_PERMISSION_FEATURES) {
      overrides[feature] = resolved[feature];
    }
  }

  for (const feature of ROOM_PERMISSION_FEATURES) {
    if (hasAnyPermission(scopes, featurePermissionStrings(feature))) {
      overrides[feature] = resolved[feature];
    }
  }

  return overrides;
}

export function resolveRoomPermissionsWithOverrides(
  scopesByPrecedence: readonly PermissionScopes[]
): RoomPermissionLevels {
  const levels: Record<RoomPermissionFeature, AccessLevel> = {
    presence: "none",
    storage: "none",
    comments: "none",
    feeds: "none",
  };

  for (const scopes of scopesByPrecedence) {
    const overrides = resolveRoomPermissionOverrides(asPermissionSet(scopes));

    for (const feature of ROOM_PERMISSION_FEATURES) {
      const level = overrides[feature];
      if (level !== undefined) {
        levels[feature] = level;
      }
    }
  }

  return levels;
}

function canReadLevel(level: AccessLevel): boolean {
  return level === "read" || level === "write";
}

function canWriteLevel(level: AccessLevel): boolean {
  return level === "write";
}

function canUseFeature(
  levels: RoomPermissionLevels,
  feature: RoomPermissionFeature,
  level: RequiredAccessLevel
): boolean {
  const actualLevel = levels[feature];
  return level === "read"
    ? canReadLevel(actualLevel)
    : canWriteLevel(actualLevel);
}

export function canReadRoomFeature(
  levels: RoomPermissionLevels,
  feature: RoomPermissionFeature
): boolean {
  return canUseFeature(levels, feature, "read");
}

export function canWriteRoomFeature(
  levels: RoomPermissionLevels,
  feature: RoomPermissionFeature
): boolean {
  return canUseFeature(levels, feature, "write");
}

const REQUESTED_SCOPE_ACCESS: Record<
  RequestedScope,
  {
    feature: RoomPermissionFeature;
    level: RequiredAccessLevel;
  }
> = {
  [Permission.RoomPresenceRead]: { feature: "presence", level: "read" },
  [Permission.RoomStorageRead]: { feature: "storage", level: "read" },
  [Permission.RoomStorageWrite]: { feature: "storage", level: "write" },
  [Permission.RoomCommentsRead]: { feature: "comments", level: "read" },
  [Permission.RoomCommentsWrite]: { feature: "comments", level: "write" },
  [Permission.RoomFeedsRead]: { feature: "feeds", level: "read" },
  [Permission.RoomFeedsWrite]: { feature: "feeds", level: "write" },
};

export function canUseResolvedRoomPermission(
  levels: RoomPermissionLevels,
  requestedScope: RequestedScope
): boolean {
  const { feature, level } = REQUESTED_SCOPE_ACCESS[requestedScope];
  return canUseFeature(levels, feature, level);
}

export function canUseRoomPermission(
  scopes: PermissionScopes,
  requestedScope: RequestedScope
): boolean {
  return canUseResolvedRoomPermission(
    resolveRoomPermissions(scopes),
    requestedScope
  );
}

function getMatchingPermissionScopes(
  permissions: LiveblocksPermissions,
  roomId: string
): LiveblocksPermission[][] {
  return Object.entries(permissions)
    .map(([resource, scopes]) => {
      if (resource === roomId) {
        return { scopes, specificity: resource.length + 1 };
      }

      if (resource.includes("*")) {
        const prefix = resource.replace("*", "");
        if (roomId.startsWith(prefix)) {
          return { scopes, specificity: prefix.length };
        }
      }

      return undefined;
    })
    .filter(
      (
        entry
      ): entry is {
        scopes: LiveblocksPermission[];
        specificity: number;
      } => {
        return entry !== undefined;
      }
    )
    .sort((left, right) => left.specificity - right.specificity)
    .map((entry) => entry.scopes);
}

export function createPermissionGrantMatcher(
  permissions: LiveblocksPermissions
): PermissionGrantMatcher {
  const roomPermissionsById = new Map<string, RoomPermissionLevels | null>();
  const roomlessPermissionsByResource = new Map<string, RoomPermissionLevels>();

  function getResolvedRoomPermissions(
    roomId: string
  ): RoomPermissionLevels | undefined {
    if (roomPermissionsById.has(roomId)) {
      return roomPermissionsById.get(roomId) ?? undefined;
    }

    const matchingScopes = getMatchingPermissionScopes(permissions, roomId);

    if (matchingScopes.length === 0) {
      roomPermissionsById.set(roomId, null);
      return undefined;
    }

    const resolved = resolveRoomPermissionsWithOverrides(matchingScopes);
    roomPermissionsById.set(roomId, resolved);
    return resolved;
  }

  function getResolvedRoomlessPermissions(
    resource: string,
    scopes: readonly LiveblocksPermission[]
  ): RoomPermissionLevels {
    const cachedPermissions = roomlessPermissionsByResource.get(resource);

    if (cachedPermissions !== undefined) {
      return cachedPermissions;
    }

    const resolved = resolveRoomPermissions(scopes);
    roomlessPermissionsByResource.set(resource, resolved);
    return resolved;
  }

  return {
    canUse(request: PermissionRequest): boolean {
      if (!request.roomId && request.requestedScope === undefined) {
        return true;
      }

      if (!request.roomId && Object.entries(permissions).length === 0) {
        return request.requestedScope === Permission.RoomCommentsRead;
      }

      if (request.requestedScope === undefined) {
        return false;
      }

      if (request.roomId) {
        const roomPermissions = getResolvedRoomPermissions(request.roomId);
        return (
          roomPermissions !== undefined &&
          canUseResolvedRoomPermission(
            roomPermissions,
            request.requestedScope
          )
        );
      }

      for (const [resource, scopes] of Object.entries(permissions)) {
        if (!resource.includes("*")) {
          continue;
        }

        if (
          canUseResolvedRoomPermission(
            getResolvedRoomlessPermissions(resource, scopes),
            request.requestedScope
          )
        ) {
          return true;
        }
      }

      return false;
    },
  };
}
