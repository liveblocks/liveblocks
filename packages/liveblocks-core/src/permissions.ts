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

const ALL_PERMISSIONS = Object.freeze(Object.values(Permission));

const ACCESS_RANKS: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

const FEATURE_PERMISSIONS = {
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
  Exclude<RoomFeature, "creation" | "personal">,
  Partial<Record<AccessLevel, readonly Permission[]>>
>;

export function isPermission(value: string): value is Permission {
  return ALL_PERMISSIONS.includes(value as Permission);
}

export function roomFeaturesFromScopes(
  scopes: readonly string[]
): RoomFeatures {
  return resolveRoomFeaturePermissions(scopes).features;
}

export function resolveRoomFeaturePermissions(
  scopes: readonly string[]
): RoomFeaturePermissions {
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

  for (const feature of Object.keys(FEATURE_PERMISSIONS) as Array<
    Exclude<RoomFeature, "creation" | "personal">
  >) {
    const permissions = FEATURE_PERMISSIONS[feature];
    let strongestAccess: AccessLevel | undefined;

    for (const access of ["none", "read", "write"] satisfies AccessLevel[]) {
      const scopedPermissions = permissions[access];
      if (
        scopedPermissions !== undefined &&
        scopedPermissions.some((permission) => scopes.includes(permission))
      ) {
        explicitFeatures.add(feature);
        if (
          strongestAccess === undefined ||
          ACCESS_RANKS[access] > ACCESS_RANKS[strongestAccess]
        ) {
          strongestAccess = access;
        }
      }
    }

    if (strongestAccess !== undefined) {
      features[feature] = strongestAccess;
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
