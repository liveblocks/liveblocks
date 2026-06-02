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
   * Deprecated
   */
  RoomPresenceWrite: "room:presence:write",
  CommentsWrite: "comments:write",
  CommentsRead: "comments:read",
  FeedsWrite: "feeds:write",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export type AccessLevel = "write" | "read" | "none";

export type RoomFeatures = {
  creation: AccessLevel;
  presence: AccessLevel;
  storage: AccessLevel;
  comments: AccessLevel;
  feeds: AccessLevel;
  personal: "write";
};

export type RoomFeature = keyof RoomFeatures;

export type RequiredAccessLevel = "read" | "write";

export type RoomFeaturePermissions = {
  features: RoomFeatures;
  explicitFeatures: ReadonlySet<Exclude<RoomFeature, "creation" | "personal">>;
};

export type RoomPermission = Permission[];

export type RoomPermissionObject = {
  default?: "read" | "write";
  presence?: "read" | "none";
  storage?: "read" | "write" | "none";
  comments?: "read" | "write" | "none";
  feeds?: "read" | "write" | "none";
};

export type RoomPermissionInput =
  | readonly Permission[]
  | RoomPermissionObject;

export type RoomAccesses = Record<string, RoomPermission>;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;
export type RoomAccessesUpdateInput = Record<string, RoomPermissionInput | null>;

const ALL_PERMISSIONS = Object.freeze(Object.values(Permission));

const ACCESS_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const DEFAULT_PERMISSIONS: readonly Permission[] = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  "presence",
  "storage",
  "comments",
  "feeds",
]);

// Include legacy scope strings so older tokens still resolve correctly.
const FEATURE_PERMISSIONS = {
  creation: {
    read: [Permission.RoomRead],
    write: [Permission.RoomWrite],
  },
  personal: {
    write: [],
  },
  presence: {
    read: [Permission.RoomPresenceRead, Permission.RoomPresenceWrite],
    none: [Permission.RoomPresenceNone],
  },
  storage: {
    write: [Permission.RoomStorageWrite],
    read: [Permission.RoomStorageRead],
    none: [Permission.RoomStorageNone],
  },
  comments: {
    write: [Permission.RoomCommentsWrite, Permission.CommentsWrite],
    read: [Permission.RoomCommentsRead, Permission.CommentsRead],
    none: [Permission.RoomCommentsNone],
  },
  feeds: {
    write: [Permission.RoomFeedsWrite, Permission.FeedsWrite],
    read: [Permission.RoomFeedsRead],
    none: [Permission.RoomFeedsNone],
  },
} satisfies Record<
  RoomFeature,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

const ROOM_FEATURE_PERMISSIONS: Record<
  Exclude<RoomFeature, "creation" | "personal">,
  Partial<Record<AccessLevel, readonly Permission[]>>
> = {
  presence: FEATURE_PERMISSIONS.presence,
  storage: FEATURE_PERMISSIONS.storage,
  comments: FEATURE_PERMISSIONS.comments,
  feeds: FEATURE_PERMISSIONS.feeds,
};

const FEATURE_SPECIFIC_PERMISSIONS = [
  ...FEATURE_PERMISSIONS.presence.read,
  ...FEATURE_PERMISSIONS.presence.none,
  ...FEATURE_PERMISSIONS.storage.write,
  ...FEATURE_PERMISSIONS.storage.read,
  ...FEATURE_PERMISSIONS.storage.none,
  ...FEATURE_PERMISSIONS.comments.write,
  ...FEATURE_PERMISSIONS.comments.read,
  ...FEATURE_PERMISSIONS.comments.none,
  ...FEATURE_PERMISSIONS.feeds.write,
  ...FEATURE_PERMISSIONS.feeds.read,
  ...FEATURE_PERMISSIONS.feeds.none,
] as const;

export function isPermission(value: string): value is Permission {
  return ALL_PERMISSIONS.includes(value as Permission);
}

export function roomFeaturesFromScopes(
  scopes: readonly string[]
): RoomFeatures {
  return resolveRoomFeaturePermissions(scopes).features;
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

  if (!isRoomPermissionObject(input)) {
    throw new Error("Permissions must be an array or an object");
  }

  for (const key of Object.keys(input)) {
    if (!ROOM_PERMISSION_OBJECT_KEYS.has(key)) {
      throw new Error(`Unknown permission field: ${key}`);
    }
  }

  const permissions: RoomPermission = [];

  if (input.default !== undefined) {
    permissions.push(normalizeDefaultPermission(input.default));
  }
  if (input.presence !== undefined) {
    permissions.push(normalizeFeaturePermission("presence", input.presence));
  }
  if (input.storage !== undefined) {
    permissions.push(normalizeFeaturePermission("storage", input.storage));
  }
  if (input.comments !== undefined) {
    permissions.push(normalizeFeaturePermission("comments", input.comments));
  }
  if (input.feeds !== undefined) {
    permissions.push(normalizeFeaturePermission("feeds", input.feeds));
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
    return [...DEFAULT_PERMISSIONS, ...FEATURE_SPECIFIC_PERMISSIONS];
  }

  for (const feature of [
    "presence",
    "storage",
    "comments",
    "feeds",
  ] satisfies Array<Exclude<RoomFeature, "creation" | "personal">>) {
    const permissions = Object.values(FEATURE_PERMISSIONS[feature]).flat();
    if (permissions.includes(permission)) {
      return permissions;
    }
  }

  return [];
}

export function resolveRoomFeaturePermissions(
  scopes: readonly string[]
): RoomFeaturePermissions {
  // room:read/write set the default for all features; feature-specific scopes
  // override. explicitFeatures tracks which features were set explicitly (for
  // auth-manager token merging). A feature-specific "none" wins immediately.
  const baseAccess = scopes.includes(Permission.RoomWrite)
    ? "write"
    : scopes.includes(Permission.RoomRead)
      ? "read"
      : "none";

  const features: RoomFeatures = {
    creation: baseAccess,
    presence: baseAccess,
    storage: baseAccess,
    comments: baseAccess,
    feeds: baseAccess,
    personal: "write",
  };
  const explicitFeatures = new Set<
    Exclude<RoomFeature, "creation" | "personal">
  >();

  for (const feature of Object.keys(ROOM_FEATURE_PERMISSIONS) as Array<
    Exclude<RoomFeature, "creation" | "personal">
  >) {
    const permissions = ROOM_FEATURE_PERMISSIONS[feature];
    let featureAccess: AccessLevel | undefined;

    for (const access of ["none", "read", "write"] satisfies AccessLevel[]) {
      const scopedPermissions = permissions[access];
      if (
        scopedPermissions !== undefined &&
        scopedPermissions.some((permission) => scopes.includes(permission))
      ) {
        explicitFeatures.add(feature);
        if (access === "none") {
          featureAccess = "none";
          break;
        }
        if (
          featureAccess === undefined ||
          ACCESS_RANKS[access] > ACCESS_RANKS[featureAccess]
        ) {
          featureAccess = access;
        }
      }
    }

    if (featureAccess !== undefined) {
      features[feature] = featureAccess;
    }
  }

  return { features, explicitFeatures };
}

export function hasRoomFeatureAccess(
  scopes: readonly string[],
  feature: RoomFeature,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = roomFeaturesFromScopes(scopes)[feature];
  return ACCESS_RANKS[access] >= ACCESS_RANKS[requiredAccess];
}

function isRoomPermissionObject(
  value: RoomPermissionInput
): value is RoomPermissionObject {
  return typeof value === "object" && value !== null;
}

function normalizeDefaultPermission(
  access: RoomPermissionObject["default"]
): Permission {
  switch (access) {
    case "read":
      return Permission.RoomRead;
    case "write":
      return Permission.RoomWrite;
    default:
      throw new Error(`Invalid permission level for default: ${String(access)}`);
  }
}

function normalizeFeaturePermission(
  feature: Exclude<RoomFeature, "creation" | "personal">,
  access: string
): Permission {
  switch (feature) {
    case "presence":
      switch (access) {
        case "read":
          return FEATURE_PERMISSIONS.presence.read[0];
        case "none":
          return FEATURE_PERMISSIONS.presence.none[0];
      }
      break;
    case "storage":
      switch (access) {
        case "read":
          return FEATURE_PERMISSIONS.storage.read[0];
        case "write":
          return FEATURE_PERMISSIONS.storage.write[0];
        case "none":
          return FEATURE_PERMISSIONS.storage.none[0];
      }
      break;
    case "comments":
      switch (access) {
        case "read":
          return FEATURE_PERMISSIONS.comments.read[0];
        case "write":
          return FEATURE_PERMISSIONS.comments.write[0];
        case "none":
          return FEATURE_PERMISSIONS.comments.none[0];
      }
      break;
    case "feeds":
      switch (access) {
        case "read":
          return FEATURE_PERMISSIONS.feeds.read[0];
        case "write":
          return FEATURE_PERMISSIONS.feeds.write[0];
        case "none":
          return FEATURE_PERMISSIONS.feeds.none[0];
      }
      break;
  }

  throw new Error(`Invalid permission level for ${feature}: ${String(access)}`);
}
