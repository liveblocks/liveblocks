import type {
  LiveblocksPermission,
  LiveblocksPermissions,
  RequestedScope,
  RoomPermissionLevels,
} from "./protocol/Permission";
import {
  canUseResolvedRoomPermission,
  Permission,
  resolveRoomPermissions,
  resolveRoomPermissionsWithOverrides,
} from "./protocol/Permission";

export type RoomAuthPermissionRequest = {
  readonly kind?: "room";
  readonly requestedScope: RequestedScope;
  readonly roomId: string;
};

export type UserAuthPermissionRequest = {
  readonly kind: "user";
  readonly requestedScope?: RequestedScope;
};

export type AuthPermissionRequest =
  | RoomAuthPermissionRequest
  | UserAuthPermissionRequest;

export type AuthTokenPermissionMatcher = {
  canUse(request: AuthPermissionRequest): boolean;
};

function hasNoPermissions(permissions: LiveblocksPermissions): boolean {
  return Object.keys(permissions).length === 0;
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

export function createAuthTokenPermissionMatcher(
  permissions: LiveblocksPermissions
): AuthTokenPermissionMatcher {
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
    canUse(request: AuthPermissionRequest): boolean {
      if (request.kind === "user" && request.requestedScope === undefined) {
        return hasNoPermissions(permissions);
      }

      if (request.kind === "user" && hasNoPermissions(permissions)) {
        return request.requestedScope === Permission.RoomCommentsRead;
      }

      if (request.requestedScope === undefined) {
        return false;
      }

      if (request.kind !== "user") {
        const roomPermissions = getResolvedRoomPermissions(request.roomId);
        return (
          roomPermissions !== undefined &&
          canUseResolvedRoomPermission(roomPermissions, request.requestedScope)
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
