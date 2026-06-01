import { describe, expect, test } from "vitest";

import { parseAuthToken } from "../../protocol/AuthToken";
import {
  canReadRoomFeature,
  canUseResolvedRoomPermission,
  canUseRoomPermission,
  canWriteRoomFeature,
  hasRoomFeatureAccess,
  isLiveblocksPermission,
  Permission,
  resolveRoomPermissions,
  resolveRoomPermissionsWithOverrides,
  roomPermissionsFromScopes,
  type PermissionScopes,
  type RequestedScope,
} from "../../protocol/Permission";

function expectCanUse(
  scopes: PermissionScopes,
  requestedScope: RequestedScope,
  expected: boolean
) {
  expect(canUseRoomPermission(scopes, requestedScope)).toBe(expected);
}

describe("parseRoomAuthToken", () => {
  const exampleAccessToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzM1MjEsImV4cCI6MTY5MDAzMzUyNiwiayI6ImFjYyIsInBpZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsInVpZCI6InVzZXItMTEiLCJwZXJtcyI6eyJ0ZXN0LXJvb20iOlsicm9vbTp3cml0ZSIsImNvbW1lbnRzOndyaXRlIl19LCJtY3ByIjoyMH0.YanPltrzS9ct5E9w6i14s_JEy9rpm4MNSMGPgN1B26JP0LVaj0ac3kK5m1owjWS_HTANB87KYk0tOHGDjEESIN0Kr-1d6Qv31IX1yUTsRiPyaD4J6co0M9ONDEbhiWc-ScV2UI-fQlY1qvqFAP5VR4CIwCRnA_hwBFzzhAQhb7VWSKASaqL72ySv9f-LU4cekqJ_nWLLpOGnnjiQSqOFqe7PSPjQiawm8R8UU_P5kEtKr53YS0oBhIiH9e3dpP8HPiaP6kCN1ViDo0jHIX3oyNB4IcwNf-VMPCUHi8oXG09Kfa2rdI2MT7E_Tblg78ZPnSCKLjTEHykGZsc4v-kDIg";

  const exampleIdToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzM2MTQsImV4cCI6MTY5MDAzMzYxOSwiayI6ImlkIiwicGlkIjoiNjI0MWNiOTVlZDY4N2Q1ZGU1YWFhMTMyIiwidWlkIjoidXNlci0yIiwiZ2lkcyI6W10sIm1jcHIiOjIwfQ.qg6lme3yhWYZ77l_ignjEwVuow1f79xYEdFYTO39VnyuQRv39xJU_lRpUC053p5UEYR9wV2f9B_U1G1xBtS0Yk894O078JiKN1zvizAgJmTrG0ZFzzEJLoMo00RpeGKP2qZEXNyHPqFVdzP9vHUVK0D4CIEHanLUOYaHA3JTslUWiKfF7OoWIMpYMx_oIgdkAV3pvkMpYuV0UkVGuMgrxUXCNKcURAfTK2BhtfmT3n7pDBpstrIYEotcWjpBcm6Xat5kG9FECUs_iEJvlnWKidCSbSp3YGutCxH0XXwbTK9O-a6YBrQTAOofHFHsy6_dE4Z3uyQe79uX82YqdxJIzg";

  const exampleInvalidJwtToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  test("should parse a valid (id) token", () => {
    const { parsed } = parseAuthToken(exampleIdToken);
    expect(parsed).toEqual({
      exp: 1690033619,
      gids: [],
      iat: 1690033614,
      k: "id",
      mcpr: 20,
      pid: "6241cb95ed687d5de5aaa132",
      uid: "user-2",
    });
  });

  test("should parse a valid (access) token", () => {
    const { parsed } = parseAuthToken(exampleAccessToken);
    expect(parsed).toEqual({
      k: "acc",
      exp: 1690033526,
      iat: 1690033521,
      mcpr: 20,
      perms: {
        "test-room": ["room:write", "comments:write"],
      },
      pid: "6241cb95ed687d5de5aaa132",
      uid: "user-11",
    });
  });

  test("should throw if token is not a valid token", () => {
    try {
      parseAuthToken(exampleInvalidJwtToken);
    } catch (error) {
      expect(error).toEqual(
        new Error(
          "Authentication error: expected a valid token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
        )
      );
    }
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
  });

  test("should resolve permissions to centralized feature levels", () => {
    expect(
      roomPermissionsFromScopes([
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
      personal: "write",
    });

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
});
