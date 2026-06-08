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
  hasDefaultPermission: boolean;
  features: Partial<RoomFeatures>;
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

type RoomPermissionFeature = keyof Omit<RoomPermissionObject, "default">;

type FeaturePermissionMap = Record<
  RoomFeature,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

const ALL_PERMISSIONS = Object.freeze(Object.values(Permission));

const ACCESS_LEVELS = ["none", "read", "write"] as const satisfies ReadonlyArray<
  AccessLevel
>;

const ACCESS_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const DEFAULT_PERMISSIONS: readonly Permission[] = [
  Permission.RoomRead,
  Permission.RoomWrite,
] as const;

const NO_ACCESS_ROOM_FEATURES: RoomFeatures = {
  creation: "none",
  presence: "none",
  storage: "none",
  comments: "none",
  feeds: "none",
  personal: "write",
};

// Include legacy scope strings so older tokens still resolve correctly.
const FEATURE_PERMISSIONS: FeaturePermissionMap = {
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

const DEFAULT_PERMISSION_FEATURE = "creation" satisfies RoomFeature;

const ROOM_PERMISSION_FEATURES = (
  Object.keys(FEATURE_PERMISSIONS) as RoomFeature[]
).filter(
  (feature): feature is RoomPermissionFeature =>
    FEATURE_PERMISSIONS[feature].none !== undefined
);

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  ...ROOM_PERMISSION_FEATURES,
]);

const FEATURE_SPECIFIC_PERMISSIONS = ROOM_PERMISSION_FEATURES.flatMap((feature) =>
  Object.values(FEATURE_PERMISSIONS[feature]).flat()
);

function resolveFeatureAccess(
  scopes: readonly string[],
  feature: RoomPermissionFeature
): AccessLevel | undefined {
  const permissions: Partial<Record<AccessLevel, readonly Permission[]>> =
    FEATURE_PERMISSIONS[feature];
  let featureAccess: AccessLevel | undefined;

  for (const access of ACCESS_LEVELS) {
    const scopedPermissions = permissions[access];
    if (
      scopedPermissions !== undefined &&
      scopedPermissions.some((permission: Permission) =>
        scopes.includes(permission)
      )
    ) {
      if (access === "none") {
        return "none";
      }
      if (
        featureAccess === undefined ||
        ACCESS_RANKS[access] > ACCESS_RANKS[featureAccess]
      ) {
        featureAccess = access;
      }
    }
  }

  return featureAccess;
}

function permissionForAccessLevel(
  feature: RoomFeature,
  access: string
): Permission {
  const levels: Partial<Record<AccessLevel, readonly Permission[]>> =
    FEATURE_PERMISSIONS[feature];
  const permissions = levels[access as AccessLevel];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${feature}: ${String(access)}`
    );
  }
  return permissions[0];
}

export function isPermission(value: string): value is Permission {
  return ALL_PERMISSIONS.includes(value as Permission);
}

export function resolveFullRoomFeatures(
  resolved: RoomFeaturePermissions
): RoomFeatures {
  if (resolved.hasDefaultPermission) {
    return resolved.features as RoomFeatures;
  }

  return { ...NO_ACCESS_ROOM_FEATURES, ...resolved.features };
}

export function roomFeaturesFromScopes(
  scopes: readonly string[]
): RoomFeatures {
  return resolveFullRoomFeatures(resolveRoomFeaturePermissions(scopes));
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
      permissionForAccessLevel(DEFAULT_PERMISSION_FEATURE, objectInput.default)
    );
  }

  for (const feature of ROOM_PERMISSION_FEATURES) {
    const access = objectInput[feature];
    if (access !== undefined) {
      permissions.push(permissionForAccessLevel(feature, access));
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
    return [...DEFAULT_PERMISSIONS, ...FEATURE_SPECIFIC_PERMISSIONS];
  }

  for (const feature of ROOM_PERMISSION_FEATURES) {
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
  const hasDefaultPermission =
    scopes.includes(Permission.RoomWrite) ||
    scopes.includes(Permission.RoomRead);

  const baseAccess: AccessLevel = scopes.includes(Permission.RoomWrite)
    ? "write"
    : scopes.includes(Permission.RoomRead)
      ? "read"
      : "none";

  const features: Partial<RoomFeatures> = {};

  for (const feature of ROOM_PERMISSION_FEATURES) {
    const access = resolveFeatureAccess(scopes, feature);
    if (access !== undefined) {
      features[feature] = access;
    }
  }

  if (!hasDefaultPermission) {
    return { hasDefaultPermission: false, features };
  }

  const fullFeatures: RoomFeatures = {
    ...NO_ACCESS_ROOM_FEATURES,
    [DEFAULT_PERMISSION_FEATURE]: baseAccess,
  };

  for (const feature of ROOM_PERMISSION_FEATURES) {
    fullFeatures[feature] = features[feature] ?? baseAccess;
  }

  return { hasDefaultPermission: true, features: fullFeatures };
}

export function hasRoomFeatureAccess(
  scopes: readonly string[],
  feature: RoomFeature,
  requiredAccess: RequiredAccessLevel
): boolean {
  const access = roomFeaturesFromScopes(scopes)[feature];
  return ACCESS_RANKS[access] >= ACCESS_RANKS[requiredAccess];
}
