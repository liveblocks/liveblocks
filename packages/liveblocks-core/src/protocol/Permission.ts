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

export type RoomPermissions = {
  presence: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: "write";
};

export type RoomFeature = keyof RoomPermissions;

export type RequiredAccessLevel = "read" | "write";

const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

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

/**
 * Resolves a permission scope array into per-feature access levels.
 *
 * `room:write` and `room:read` set the default access level for every feature.
 * Feature-specific scopes (e.g. `room:storage:none`) opt in or out of that
 * default. Deprecated scopes are still recognized for backwards compatibility.
 * `personal` is always `write`, independent of scopes.
 */
export function roomPermissionsFromScopes(
  scopes: readonly Permission[]
): RoomPermissions {
  const scopeSet = new Set(scopes);
  const base = getBaseAccessLevel(scopeSet);
  return {
    presence: featureAccessLevel(
      scopeSet,
      [
        { level: "none", permission: Permission.RoomPresenceNone },
        { level: "read", permission: Permission.RoomPresenceRead },
        { level: "write", permission: Permission.LegacyRoomPresenceWrite },
      ],
      base
    ),
    storage: featureAccessLevel(
      scopeSet,
      [
        { level: "none", permission: Permission.RoomStorageNone },
        { level: "read", permission: Permission.RoomStorageRead },
        { level: "write", permission: Permission.RoomStorageWrite },
      ],
      base
    ),
    comments: featureAccessLevel(
      scopeSet,
      [
        { level: "none", permission: Permission.RoomCommentsNone },
        { level: "read", permission: Permission.RoomCommentsRead },
        { level: "write", permission: Permission.RoomCommentsWrite },
        { level: "read", permission: Permission.LegacyCommentsRead },
        { level: "write", permission: Permission.LegacyCommentsWrite },
      ],
      base
    ),
    feeds: featureAccessLevel(
      scopeSet,
      [
        { level: "none", permission: Permission.RoomFeedsNone },
        { level: "read", permission: Permission.RoomFeedsRead },
        { level: "write", permission: Permission.RoomFeedsWrite },
        { level: "write", permission: Permission.LegacyFeedsWrite },
      ],
      base
    ),
    personal: "write",
  };
}

export function hasRoomFeatureAccess(
  scopes: readonly Permission[],
  feature: RoomFeature,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = roomPermissionsFromScopes(scopes)[feature];

  if (requiredAccess === "write") {
    return access === "write";
  }

  return access === "read" || access === "write";
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
export type RoomPermissionFeature =
  | "presence"
  | "storage"
  | "comments"
  | "feeds";
export type ResolvedRoomPermissionLevel = AccessLevel;
export type RoomPermissionLevels = Readonly<
  Record<RoomPermissionFeature, ResolvedRoomPermissionLevel>
>;

const ROOM_PERMISSION_FEATURES: readonly RoomPermissionFeature[] = [
  "presence",
  "storage",
  "comments",
  "feeds",
];

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

function hasPermission(
  scopes: ReadonlySet<Permission>,
  permission: Permission
) {
  return scopes.has(permission);
}

function hasAnyPermission(
  scopes: ReadonlySet<Permission>,
  permissions: readonly Permission[]
): boolean {
  for (const permission of permissions) {
    if (hasPermission(scopes, permission)) {
      return true;
    }
  }
  return false;
}

export function resolveRoomPermissions(
  scopes: PermissionScopes
): RoomPermissionLevels {
  const permissionSet = asPermissionSet(scopes);
  const resolved = roomPermissionsFromScopes(Array.from(permissionSet));

  return {
    presence: resolved.presence,
    storage: resolved.storage,
    comments: resolved.comments,
    feeds: resolved.feeds,
  };
}

function resolveRoomPermissionOverrides(
  scopes: ReadonlySet<Permission>
): Partial<RoomPermissionLevels> {
  const resolved = resolveRoomPermissions(scopes);
  const overrides: Partial<
    Record<RoomPermissionFeature, ResolvedRoomPermissionLevel>
  > = {};

  if (hasAnyPermission(scopes, [Permission.RoomRead, Permission.RoomWrite])) {
    for (const feature of ROOM_PERMISSION_FEATURES) {
      overrides[feature] = resolved[feature];
    }
  }

  if (
    hasAnyPermission(scopes, [
      Permission.RoomPresenceRead,
      Permission.RoomPresenceNone,
      Permission.LegacyRoomPresenceWrite,
    ])
  ) {
    overrides.presence = resolved.presence;
  }

  if (
    hasAnyPermission(scopes, [
      Permission.RoomStorageRead,
      Permission.RoomStorageWrite,
      Permission.RoomStorageNone,
    ])
  ) {
    overrides.storage = resolved.storage;
  }

  if (
    hasAnyPermission(scopes, [
      Permission.RoomCommentsRead,
      Permission.RoomCommentsWrite,
      Permission.RoomCommentsNone,
      Permission.LegacyCommentsRead,
      Permission.LegacyCommentsWrite,
    ])
  ) {
    overrides.comments = resolved.comments;
  }

  if (
    hasAnyPermission(scopes, [
      Permission.RoomFeedsRead,
      Permission.RoomFeedsWrite,
      Permission.RoomFeedsNone,
      Permission.LegacyFeedsWrite,
    ])
  ) {
    overrides.feeds = resolved.feeds;
  }

  return overrides;
}

export function resolveRoomPermissionsWithOverrides(
  scopesByPrecedence: readonly PermissionScopes[]
): RoomPermissionLevels {
  const levels: Record<RoomPermissionFeature, ResolvedRoomPermissionLevel> = {
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

function canReadLevel(level: ResolvedRoomPermissionLevel): boolean {
  return level === "read" || level === "write";
}

function canWriteLevel(level: ResolvedRoomPermissionLevel): boolean {
  return level === "write";
}

function canUseFeature(
  levels: RoomPermissionLevels,
  feature: RoomPermissionFeature,
  level: Exclude<ResolvedRoomPermissionLevel, "none">
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

export function canUseResolvedRoomPermission(
  levels: RoomPermissionLevels,
  requestedScope: RequestedScope
): boolean {
  switch (requestedScope) {
    case Permission.RoomPresenceRead:
      return canUseFeature(levels, "presence", "read");
    case Permission.RoomStorageRead:
      return canUseFeature(levels, "storage", "read");
    case Permission.RoomStorageWrite:
      return canUseFeature(levels, "storage", "write");
    case Permission.RoomCommentsRead:
      return canUseFeature(levels, "comments", "read");
    case Permission.RoomCommentsWrite:
      return canUseFeature(levels, "comments", "write");
    case Permission.RoomFeedsRead:
      return canUseFeature(levels, "feeds", "read");
    case Permission.RoomFeedsWrite:
      return canUseFeature(levels, "feeds", "write");
    default: {
      const _exhaustive: never = requestedScope;
      return _exhaustive;
    }
  }
}

export function canUseRoomPermission(
  scopes: PermissionScopes,
  requestedScope: RequestedScope
): boolean {
  const scopeList = Array.from(asPermissionSet(scopes));

  switch (requestedScope) {
    case Permission.RoomPresenceRead:
      return hasRoomFeatureAccess(scopeList, "presence", "read");
    case Permission.RoomStorageRead:
      return hasRoomFeatureAccess(scopeList, "storage", "read");
    case Permission.RoomStorageWrite:
      return hasRoomFeatureAccess(scopeList, "storage", "write");
    case Permission.RoomCommentsRead:
      return hasRoomFeatureAccess(scopeList, "comments", "read");
    case Permission.RoomCommentsWrite:
      return hasRoomFeatureAccess(scopeList, "comments", "write");
    case Permission.RoomFeedsRead:
      return hasRoomFeatureAccess(scopeList, "feeds", "read");
    case Permission.RoomFeedsWrite:
      return hasRoomFeatureAccess(scopeList, "feeds", "write");
    default: {
      const _exhaustive: never = requestedScope;
      return _exhaustive;
    }
  }
}
