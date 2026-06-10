import type {
  AccessLevel,
  PermissionMatrix,
  PermissionResources,
} from "./protocol/Permissions";
import {
  ACCESS_RANKS,
  DEFAULT_PERMISSION_RESOURCE,
  Permission,
  resolveFullPermissionMatrix,
  resolvePermissionMatrix,
  RESOURCE_PERMISSIONS,
  ROOM_PERMISSION_RESOURCES,
} from "./protocol/Permissions";

export type {
  AccessLevel,
  PermissionMatrix,
  PermissionResources,
  RequiredAccessLevel,
  ResolvedPermissionMatrix,
} from "./protocol/Permissions";
export {
  hasPermissionAccess,
  Permission,
  permissionMatrixFromScopes,
  resolveFullPermissionMatrix,
  resolvePermissionMatrix,
} from "./protocol/Permissions";

export type RoomPermissionGrant = {
  resource: string;
  scopes: readonly string[];
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

const VALID_PERMISSIONS = new Set<string>(Object.values(Permission));

const ROOM_PERMISSION_OBJECT_KEYS = new Set<string>([
  "default",
  ...ROOM_PERMISSION_RESOURCES,
]);

function permissionForAccessLevel(
  resource: PermissionResources,
  access: AccessLevel,
  field: string = resource
): Permission {
  const levels: Partial<Record<AccessLevel, readonly Permission[]>> =
    RESOURCE_PERMISSIONS[resource];
  const permissions = levels[access];
  if (permissions === undefined || permissions.length === 0) {
    throw new Error(
      `Invalid permission level for ${field}: ${JSON.stringify(access) ?? String(access)}`
    );
  }
  return permissions[0];
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

  for (const permission of matchedPermissions) {
    const resolved = resolvePermissionMatrix(permission.scopes);

    if (resolved.hasDefaultPermission) {
      hasDefaultPermission = true;
      baseAccess = strongestAccess(baseAccess, resolved.baseAccess);
    }

    for (const resource of ROOM_PERMISSION_RESOURCES) {
      const access = resolved.matrix[resource];
      if (access !== undefined) {
        explicitMatrix[resource] = strongestAccess(
          explicitMatrix[resource] ?? "none",
          access
        );
      }
    }
  }

  return resolveFullPermissionMatrix({
    hasDefaultPermission,
    baseAccess,
    matrix: explicitMatrix,
  });
}

function isRoomPermissionArray(
  input: RoomPermissionInput
): input is readonly Permission[] {
  return Array.isArray(input);
}

export function normalizeRoomPermissionInput(
  input: RoomPermissionInput
): RoomPermission {
  if (isRoomPermissionArray(input)) {
    return input.map((permission) => {
      if (!VALID_PERMISSIONS.has(permission)) {
        throw new Error(`Not a valid permission: ${permission}`);
      }
      return permission;
    });
  }

  return normalizeRoomPermissionObject(input);
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
      permissionForAccessLevel(
        DEFAULT_PERMISSION_RESOURCE,
        objectInput.default,
        "default"
      )
    );
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = objectInput[resource];
    if (access !== undefined) {
      permissions.push(permissionForAccessLevel(resource, access));
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

export function mergePermissionMatrices(
  sources: readonly PermissionMatrix[]
): PermissionMatrix {
  return {
    room: strongestMatrixAccess(sources, "room"),
    presence: strongestMatrixAccess(sources, "presence"),
    storage: strongestMatrixAccess(sources, "storage"),
    comments: strongestMatrixAccess(sources, "comments"),
    feeds: strongestMatrixAccess(sources, "feeds"),
    personal: "write",
  };
}

export function permissionMatrixToScopes(
  matrix: PermissionMatrix
): RoomPermission {
  const scopes: RoomPermission = [];
  const baseAccess = matrix.room;

  if (baseAccess !== "none") {
    scopes.push(
      permissionForAccessLevel(DEFAULT_PERMISSION_RESOURCE, baseAccess)
    );
  }

  for (const resource of ROOM_PERMISSION_RESOURCES) {
    const access = matrix[resource];
    if (access !== baseAccess) {
      scopes.push(permissionForAccessLevel(resource, access));
    }
  }

  return scopes;
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
  return ACCESS_RANKS[right] > ACCESS_RANKS[left] ? right : left;
}

function resourceMatchesRoomId(resource: string, roomId: string): boolean {
  if (resource.includes("*")) {
    return roomId.startsWith(resource.replace("*", ""));
  }

  return resource === roomId;
}
