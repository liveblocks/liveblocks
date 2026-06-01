import { describe, expect, test } from "vitest";

import {
  canReadRoomFeature,
  canUseResolvedRoomPermission,
  canUseRoomPermission,
  canWriteRoomFeature,
  hasRoomFeatureAccess,
  isLiveblocksPermission,
  Permission,
  type PermissionScopes,
  type RequestedScope,
  resolveRoomPermissions,
  resolveRoomPermissionsWithOverrides,
} from "../Permission";
import { createAuthTokenPermissionMatcher } from "../../auth-token-permissions";

function expectCanUse(
  scopes: PermissionScopes,
  requestedScope: RequestedScope,
  expected: boolean
) {
  expect(canUseRoomPermission(scopes, requestedScope)).toBe(expected);
}

describe("Permission", () => {
  test("keeps deprecated aliases for existing integrations", () => {
    expect(Permission.Read).toBe(Permission.RoomRead);
    expect(Permission.Write).toBe(Permission.RoomWrite);
    expect(Permission.PresenceWrite).toBe(Permission.LegacyRoomPresenceWrite);
    expect(Permission.CommentsRead).toBe(Permission.LegacyCommentsRead);
    expect(Permission.CommentsWrite).toBe(Permission.LegacyCommentsWrite);
    expect(Permission.FeedsWrite).toBe(Permission.LegacyFeedsWrite);
  });

  test("validates liveblocks permission strings", () => {
    expect(isLiveblocksPermission("room:read")).toBe(true);
    expect(isLiveblocksPermission("comments:read")).toBe(true);
    expect(isLiveblocksPermission("room:comments:read")).toBe(true);
    expect(isLiveblocksPermission("not-a-permission")).toBe(false);
  });

  test("infers storage and comments capabilities from new permissions", () => {
    expectCanUse(
      [Permission.RoomStorageRead],
      Permission.RoomStorageRead,
      true
    );
    expectCanUse(
      [Permission.RoomStorageWrite],
      Permission.RoomStorageRead,
      true
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomStorageNone],
      Permission.RoomStorageRead,
      false
    );

    expectCanUse(
      [Permission.RoomStorageWrite],
      Permission.RoomStorageWrite,
      true
    );
    expectCanUse(
      [Permission.RoomStorageRead],
      Permission.RoomStorageWrite,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomStorageRead],
      Permission.RoomStorageWrite,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomStorageNone],
      Permission.RoomStorageWrite,
      false
    );

    expectCanUse([Permission.RoomFeedsRead], Permission.RoomFeedsRead, true);
    expectCanUse([Permission.RoomFeedsWrite], Permission.RoomFeedsWrite, true);
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomFeedsNone],
      Permission.RoomFeedsWrite,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomFeedsNone],
      Permission.RoomFeedsRead,
      false
    );

    expectCanUse(
      [Permission.RoomPresenceRead],
      Permission.RoomPresenceRead,
      true
    );
    expectCanUse([Permission.RoomRead], Permission.RoomPresenceRead, true);
    expectCanUse([Permission.RoomWrite], Permission.RoomPresenceRead, true);
    expectCanUse(
      [Permission.LegacyRoomPresenceWrite],
      Permission.RoomPresenceRead,
      true
    );
    expectCanUse(
      [Permission.RoomStorageRead],
      Permission.RoomPresenceRead,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomPresenceNone],
      Permission.RoomPresenceRead,
      false
    );
    expectCanUse([], Permission.RoomPresenceRead, false);

    expectCanUse(
      [Permission.RoomCommentsRead],
      Permission.RoomCommentsRead,
      true
    );
    expectCanUse(
      [Permission.RoomCommentsWrite],
      Permission.RoomCommentsWrite,
      true
    );
    expectCanUse(
      [Permission.RoomCommentsRead],
      Permission.RoomCommentsWrite,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomCommentsNone],
      Permission.RoomCommentsRead,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomCommentsRead],
      Permission.RoomCommentsWrite,
      false
    );
    expectCanUse(
      [Permission.RoomWrite, Permission.RoomCommentsNone],
      Permission.RoomCommentsWrite,
      false
    );
    expectCanUse(
      new Set([Permission.LegacyCommentsWrite]),
      Permission.RoomCommentsWrite,
      true
    );
  });

  test("should resolve permissions to feature levels", () => {
    expect(resolveRoomPermissions([Permission.RoomRead])).toEqual({
      presence: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
    });

    expect(
      resolveRoomPermissions([
        Permission.RoomWrite,
        Permission.RoomStorageRead,
        Permission.RoomCommentsNone,
        Permission.RoomFeedsWrite,
      ])
    ).toEqual({
      presence: "write",
      storage: "read",
      comments: "none",
      feeds: "write",
    });

    expect(
      resolveRoomPermissions([
        Permission.RoomWrite,
        Permission.RoomPresenceNone,
        Permission.RoomStorageWrite,
      ])
    ).toEqual({
      presence: "none",
      storage: "write",
      comments: "write",
      feeds: "write",
    });

    expect(
      resolveRoomPermissions([
        Permission.RoomWrite,
        Permission.RoomStorageWrite,
        Permission.RoomStorageNone,
      ])
    ).toEqual({
      presence: "write",
      storage: "none",
      comments: "write",
      feeds: "write",
    });
  });

  test("should check feature access from scopes", () => {
    expect(
      hasRoomFeatureAccess(
        [Permission.RoomWrite, Permission.RoomStorageRead],
        "storage",
        "write"
      )
    ).toBe(false);
  });

  test("should expose permission checks from resolved levels", () => {
    const permissions = resolveRoomPermissions([
      Permission.RoomWrite,
      Permission.RoomStorageRead,
      Permission.RoomCommentsNone,
    ]);

    expect(permissions.storage).toBe("read");
    expect(canReadRoomFeature(permissions, "storage")).toBe(true);
    expect(canWriteRoomFeature(permissions, "storage")).toBe(false);
    expect(canWriteRoomFeature(permissions, "comments")).toBe(false);
    expect(
      canUseResolvedRoomPermission(permissions, Permission.RoomStorageRead)
    ).toBe(true);
    expect(
      canUseResolvedRoomPermission(permissions, Permission.RoomStorageWrite)
    ).toBe(false);
    expect(
      canUseResolvedRoomPermission(permissions, Permission.RoomCommentsWrite)
    ).toBe(false);
  });

  test("should resolve permission overrides in precedence order", () => {
    expect(
      resolveRoomPermissionsWithOverrides([
        [Permission.RoomWrite],
        [Permission.RoomStorageNone],
      ])
    ).toEqual({
      presence: "write",
      storage: "none",
      comments: "write",
      feeds: "write",
    });

    expect(
      resolveRoomPermissionsWithOverrides([
        [Permission.RoomWrite],
        [Permission.RoomCommentsRead],
      ])
    ).toEqual({
      presence: "write",
      storage: "write",
      comments: "read",
      feeds: "write",
    });
  });

  test("should match room permission grants by exact and wildcard resources", () => {
    const matcher = createAuthTokenPermissionMatcher({
      "org1*": [Permission.RoomWrite],
      "org1.room1": [Permission.RoomStorageNone],
    });

    expect(
      matcher.canUse({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "org1.room1",
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomStorageRead,
        roomId: "org1.room1",
      })
    ).toBe(false);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomCommentsWrite,
        roomId: "org1.room1",
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomStorageRead,
        roomId: "org1.room2",
      })
    ).toBe(true);
  });

  test("should match roomless wildcard grants", () => {
    const matcher = createAuthTokenPermissionMatcher({
      "org1*": [Permission.RoomCommentsRead],
      "org1.room1": [Permission.RoomCommentsWrite],
    });

    expect(
      matcher.canUse({
        kind: "user",
        requestedScope: Permission.RoomCommentsRead,
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        kind: "user",
        requestedScope: Permission.RoomCommentsWrite,
      })
    ).toBe(false);
    expect(
      matcher.canUse({
        kind: "user",
        requestedScope: Permission.RoomCommentsWrite,
      })
    ).toBe(false);
  });

  test("should match legacy grants", () => {
    const matcher = createAuthTokenPermissionMatcher({
      room1: [
        Permission.LegacyRoomPresenceWrite,
        Permission.LegacyCommentsWrite,
        Permission.LegacyFeedsWrite,
      ],
    });

    expect(
      matcher.canUse({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "room1",
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomCommentsWrite,
        roomId: "room1",
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomFeedsWrite,
        roomId: "room1",
      })
    ).toBe(true);
  });

  test("should preserve empty roomless grant behavior", () => {
    const matcher = createAuthTokenPermissionMatcher({});

    expect(
      matcher.canUse({
        kind: "user",
        requestedScope: Permission.RoomCommentsRead,
      })
    ).toBe(true);
    expect(
      matcher.canUse({
        kind: "user",
        requestedScope: Permission.RoomCommentsWrite,
      })
    ).toBe(false);
    expect(
      matcher.canUse({
        requestedScope: Permission.RoomCommentsRead,
        roomId: "room1",
      })
    ).toBe(false);
    expect(matcher.canUse({ kind: "user" })).toBe(true);
  });
});
