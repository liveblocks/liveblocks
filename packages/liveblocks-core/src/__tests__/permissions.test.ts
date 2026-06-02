import { describe, expect, test } from "vitest";

import {
  getRoomPermissionConflicts,
  hasRoomFeatureAccess,
  normalizeRoomPermissionInput,
  Permission,
  roomFeaturesFromScopes,
} from "../permissions";

describe("roomFeaturesFromScopes", () => {
  test("resolves room read", () => {
    expect(roomFeaturesFromScopes([Permission.RoomRead])).toEqual({
      creation: "read",
      presence: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
  });

  test("resolves room write", () => {
    expect(roomFeaturesFromScopes([Permission.RoomWrite])).toEqual({
      creation: "write",
      presence: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("allows feature opt-outs from a room default", () => {
    expect(
      roomFeaturesFromScopes([Permission.RoomWrite, Permission.RoomStorageNone])
        .storage
    ).toBe("none");
    expect(
      roomFeaturesFromScopes([
        Permission.RoomWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("none");
  });

  test("explicit none overrides same-feature write", () => {
    expect(
      roomFeaturesFromScopes([
        Permission.RoomCommentsWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("none");
  });

  test("uses the strongest non-none explicit feature access", () => {
    expect(
      roomFeaturesFromScopes([
        Permission.RoomCommentsRead,
        Permission.RoomCommentsWrite,
      ]).comments
    ).toBe("write");
  });

  test("allows read but not write when a feature is downgraded", () => {
    const scopes = [Permission.RoomWrite, Permission.RoomCommentsRead];

    expect(hasRoomFeatureAccess(scopes, "comments", "read")).toBe(true);
    expect(hasRoomFeatureAccess(scopes, "comments", "write")).toBe(false);
  });

  test("supports deprecated permission strings", () => {
    expect(
      hasRoomFeatureAccess(
        [Permission.LegacyCommentsWrite],
        "comments",
        "write"
      )
    ).toBe(true);
    expect(
      hasRoomFeatureAccess(
        [Permission.LegacyRoomPresenceWrite],
        "presence",
        "read"
      )
    ).toBe(true);
  });

  test("normalizes object notation permissions", () => {
    expect(
      normalizeRoomPermissionInput({
        default: "write",
        storage: "none",
        comments: "read",
      })
    ).toEqual([
      Permission.RoomWrite,
      Permission.RoomStorageNone,
      Permission.RoomCommentsRead,
    ]);
  });

  test("returns permission conflicts by feature", () => {
    expect(getRoomPermissionConflicts(Permission.RoomStorageRead)).toEqual([
      Permission.RoomStorageRead,
      Permission.RoomStorageWrite,
      Permission.RoomStorageNone,
    ]);
    expect(getRoomPermissionConflicts(Permission.RoomWrite)).toContain(
      Permission.RoomCommentsNone
    );
  });
});
