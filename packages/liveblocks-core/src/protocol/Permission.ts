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

const PERMISSION_RULES = [
  {
    permission: Permission.RoomRead,
    namespace: "room",
    grant: { kind: "all", level: "read" },
    input: { field: "default", level: "read" },
  },
  {
    permission: Permission.RoomWrite,
    namespace: "room",
    grant: { kind: "all", level: "write" },
    input: { field: "default", level: "write" },
  },
  {
    permission: Permission.RoomPresenceRead,
    namespace: "room",
    grant: { kind: "feature", feature: "presence", level: "read" },
    input: { field: "presence", level: "read" },
    request: true,
  },
  {
    permission: Permission.RoomPresenceNone,
    namespace: "room",
    grant: { kind: "feature", feature: "presence", level: "none" },
    input: { field: "presence", level: "none" },
  },
  {
    permission: Permission.RoomStorageRead,
    namespace: "room",
    grant: { kind: "feature", feature: "storage", level: "read" },
    input: { field: "storage", level: "read" },
    request: true,
  },
  {
    permission: Permission.RoomStorageWrite,
    namespace: "room",
    grant: { kind: "feature", feature: "storage", level: "write" },
    input: { field: "storage", level: "write" },
    request: true,
  },
  {
    permission: Permission.RoomStorageNone,
    namespace: "room",
    grant: { kind: "feature", feature: "storage", level: "none" },
    input: { field: "storage", level: "none" },
  },
  {
    permission: Permission.RoomCommentsRead,
    namespace: "room",
    grant: { kind: "feature", feature: "comments", level: "read" },
    input: { field: "comments", level: "read" },
    request: true,
  },
  {
    permission: Permission.RoomCommentsWrite,
    namespace: "room",
    grant: { kind: "feature", feature: "comments", level: "write" },
    input: { field: "comments", level: "write" },
    request: true,
  },
  {
    permission: Permission.RoomCommentsNone,
    namespace: "room",
    grant: { kind: "feature", feature: "comments", level: "none" },
    input: { field: "comments", level: "none" },
  },
  {
    permission: Permission.RoomFeedsRead,
    namespace: "room",
    grant: { kind: "feature", feature: "feeds", level: "read" },
    input: { field: "feeds", level: "read" },
    request: true,
  },
  {
    permission: Permission.RoomFeedsWrite,
    namespace: "room",
    grant: { kind: "feature", feature: "feeds", level: "write" },
    input: { field: "feeds", level: "write" },
    request: true,
  },
  {
    permission: Permission.RoomFeedsNone,
    namespace: "room",
    grant: { kind: "feature", feature: "feeds", level: "none" },
    input: { field: "feeds", level: "none" },
  },
  {
    permission: Permission.LegacyRoomPresenceWrite,
    namespace: "legacy",
    grant: { kind: "feature", feature: "presence", level: "write" },
  },
  {
    permission: Permission.LegacyCommentsRead,
    namespace: "legacy",
    grant: { kind: "feature", feature: "comments", level: "read" },
  },
  {
    permission: Permission.LegacyCommentsWrite,
    namespace: "legacy",
    grant: { kind: "feature", feature: "comments", level: "write" },
  },
  {
    permission: Permission.LegacyFeedsWrite,
    namespace: "legacy",
    grant: { kind: "feature", feature: "feeds", level: "write" },
  },
] as const;

type PermissionRule = (typeof PERMISSION_RULES)[number];
type RoomPermissionRule = Extract<PermissionRule, { namespace: "room" }>;
type LegacyRoomPermissionRule = Extract<
  PermissionRule,
  { namespace: "legacy" }
>;
type PermissionInputRule = Extract<
  PermissionRule,
  { input: { field: string; level: string } }
>;
type RequestedPermissionRule = Extract<PermissionRule, { request: true }>;

export type RoomPermission = RoomPermissionRule["permission"];
export type LegacyRoomPermission = LegacyRoomPermissionRule["permission"];
export type LiveblocksPermission = PermissionRule["permission"];
export type RequestedScope = RequestedPermissionRule["permission"];
export type LiveblocksPermissions = Record<string, LiveblocksPermission[]>;

type RoomPermissionObjectField = PermissionInputRule["input"]["field"];

export type RoomPermissionObject = Partial<{
  [Field in RoomPermissionObjectField]: Extract<
    PermissionInputRule,
    { input: { field: Field } }
  >["input"]["level"];
}>;

/** Normalized room permission strings for a single room (REST API shape). */
export type RoomPermissionList = LiveblocksPermission[];
export type RoomPermissionInput =
  | readonly LiveblocksPermission[]
  | RoomPermissionObject;
export type RoomAccesses = Record<string, RoomPermissionList>;
export type RoomAccessesInput = Record<string, RoomPermissionInput>;
export type PermissionScopes = readonly string[] | ReadonlySet<string>;

function isRoomPermissionRule(
  rule: PermissionRule
): rule is RoomPermissionRule {
  return rule.namespace === "room";
}

function isLegacyRoomPermissionRule(
  rule: PermissionRule
): rule is LegacyRoomPermissionRule {
  return rule.namespace === "legacy";
}

export const ROOM_PERMISSIONS: readonly RoomPermission[] = Object.freeze(
  PERMISSION_RULES.filter(isRoomPermissionRule).map((rule) => rule.permission)
);

export const LEGACY_ROOM_PERMISSIONS: readonly LegacyRoomPermission[] =
  Object.freeze(
    PERMISSION_RULES.filter(isLegacyRoomPermissionRule).map(
      (rule) => rule.permission
    )
  );

const PERMISSION_RULES_BY_PERMISSION = new Map<string, PermissionRule>(
  PERMISSION_RULES.map((rule) => [rule.permission, rule])
);

const ROOM_PERMISSION_INPUT_FIELDS = [
  "default",
  "presence",
  "storage",
  "comments",
  "feeds",
] as const;

const EXPLICIT_ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  read: 1,
  write: 2,
  none: 3,
};

export function isRoomPermission(value: string): value is RoomPermission {
  const rule = PERMISSION_RULES_BY_PERMISSION.get(value);
  return rule !== undefined && rule.namespace === "room";
}

export function isLiveblocksPermission(
  value: string
): value is LiveblocksPermission {
  return PERMISSION_RULES_BY_PERMISSION.has(value);
}

function formatAllowedValues(field: RoomPermissionObjectField): string {
  const allowedValues: string[] = [];

  for (const rule of PERMISSION_RULES) {
    if ("input" in rule && rule.input.field === field) {
      allowedValues.push(`"${rule.input.level}"`);
    }
  }

  return allowedValues.join(", ");
}

function normalizePermissionValue(
  field: RoomPermissionObjectField,
  value: string | undefined
): LiveblocksPermission | undefined {
  if (value === undefined) {
    return undefined;
  }

  for (const rule of PERMISSION_RULES) {
    if (
      "input" in rule &&
      rule.input.field === field &&
      rule.input.level === value
    ) {
      return rule.permission;
    }
  }

  throw new Error(
    `Invalid room permission object value for "${field}": ${String(
      value
    )}. Expected one of ${formatAllowedValues(field)}.`
  );
}

export function normalizeRoomPermissions(
  permissions: RoomPermissionObject
): RoomPermissionList {
  const normalized: RoomPermissionList = [];

  for (const field of ROOM_PERMISSION_INPUT_FIELDS) {
    const permission = normalizePermissionValue(field, permissions[field]);
    if (permission !== undefined) {
      normalized.push(permission);
    }
  }

  if (normalized.length === 0) {
    throw new Error("Room permission object cannot be empty");
  }

  return normalized;
}

export function normalizeRoomPermissionList(
  permissions: readonly string[]
): RoomPermissionList {
  const normalized: RoomPermissionList = [];

  for (const permission of permissions) {
    if (!isLiveblocksPermission(permission)) {
      throw new Error(`Not a valid permission: ${String(permission)}`);
    }

    normalized.push(permission);
  }

  return normalized;
}

function isRoomPermissionList(
  permissions: RoomPermissionInput
): permissions is readonly LiveblocksPermission[] {
  return Array.isArray(permissions);
}

export function normalizeRoomPermissionInput(
  permissions: RoomPermissionInput
): RoomPermissionList {
  return isRoomPermissionList(permissions)
    ? normalizeRoomPermissionList(permissions)
    : normalizeRoomPermissions(permissions);
}

function asPermissionSet(
  scopes: PermissionScopes
): ReadonlySet<PermissionRule> {
  const permissionSet = new Set<PermissionRule>();

  for (const scope of scopes) {
    const rule = PERMISSION_RULES_BY_PERMISSION.get(scope);
    if (rule !== undefined) {
      permissionSet.add(rule);
    }
  }

  return permissionSet;
}

function emptyRoomPermissionLevels(level: AccessLevel): RoomPermissionLevels {
  return {
    presence: level,
    storage: level,
    comments: level,
    feeds: level,
  };
}

function getBaseAccessLevel(rules: ReadonlySet<PermissionRule>): AccessLevel {
  for (const rule of rules) {
    if (rule.grant.kind === "all" && rule.grant.level === "write") {
      return "write";
    }
  }

  for (const rule of rules) {
    if (rule.grant.kind === "all" && rule.grant.level === "read") {
      return "read";
    }
  }

  return "none";
}

export function resolveRoomPermissions(
  scopes: PermissionScopes
): RoomPermissionLevels {
  const rules = asPermissionSet(scopes);
  const levels = emptyRoomPermissionLevels(getBaseAccessLevel(rules));
  const explicitRanks = new Map<RoomPermissionFeature, number>();

  for (const rule of rules) {
    if (rule.grant.kind !== "feature") {
      continue;
    }

    const { feature, level } = rule.grant;
    const rank = EXPLICIT_ACCESS_LEVEL_RANK[level];
    const previousRank = explicitRanks.get(feature);

    if (previousRank === undefined || rank > previousRank) {
      levels[feature] = level;
      explicitRanks.set(feature, rank);
    }
  }

  return levels;
}

function resolveRoomPermissionOverrides(
  rules: ReadonlySet<PermissionRule>
): Partial<RoomPermissionLevels> {
  const resolved = resolveRoomPermissions(
    Array.from(rules, (rule) => rule.permission)
  );
  const overrides: Partial<RoomPermissionLevels> = {};

  for (const rule of rules) {
    if (rule.grant.kind === "all") {
      for (const feature of ROOM_PERMISSION_FEATURES) {
        overrides[feature] = resolved[feature];
      }
    } else {
      overrides[rule.grant.feature] = resolved[rule.grant.feature];
    }
  }

  return overrides;
}

export function resolveRoomPermissionsWithOverrides(
  scopesByPrecedence: readonly PermissionScopes[]
): RoomPermissionLevels {
  const levels = emptyRoomPermissionLevels("none");

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

function requestedScopeAccess(requestedScope: RequestedScope): {
  feature: RoomPermissionFeature;
  level: RequiredAccessLevel;
} {
  const rule = PERMISSION_RULES_BY_PERMISSION.get(requestedScope);

  if (
    rule === undefined ||
    rule.grant.kind !== "feature" ||
    rule.grant.level === "none"
  ) {
    throw new Error(`Not a valid requested permission: ${requestedScope}`);
  }

  return {
    feature: rule.grant.feature,
    level: rule.grant.level,
  };
}

export function canUseResolvedRoomPermission(
  levels: RoomPermissionLevels,
  requestedScope: RequestedScope
): boolean {
  const { feature, level } = requestedScopeAccess(requestedScope);
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
