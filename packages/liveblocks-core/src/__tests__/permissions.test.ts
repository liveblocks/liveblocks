import { describe, expect, test } from "vitest";

import {
  getRoomPermissionConflicts,
  hasPermissionCapability,
  normalizeRoomPermissionInput,
  Permission,
  permissionCapabilitiesFromScopes,
} from "../permissions";

describe("permissionCapabilitiesFromScopes", () => {
  test("resolves room read", () => {
    expect(permissionCapabilitiesFromScopes([Permission.RoomRead])).toEqual({
      creation: "read",
      presence: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
  });

  test("resolves room write", () => {
    expect(permissionCapabilitiesFromScopes([Permission.RoomWrite])).toEqual({
      creation: "write",
      presence: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("allows resource opt-outs from a room default", () => {
    expect(
      permissionCapabilitiesFromScopes([
        Permission.RoomWrite,
        Permission.RoomStorageNone,
      ]).storage
    ).toBe("none");
    expect(
      permissionCapabilitiesFromScopes([
        Permission.RoomWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("none");
  });

  test("uses the strongest same-resource access", () => {
    expect(
      permissionCapabilitiesFromScopes([
        Permission.RoomCommentsWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("write");
  });

  test("uses the strongest non-none explicit resource access", () => {
    expect(
      permissionCapabilitiesFromScopes([
        Permission.RoomCommentsRead,
        Permission.RoomCommentsWrite,
      ]).comments
    ).toBe("write");
  });

  test("allows read but not write when a resource is downgraded", () => {
    const scopes = [Permission.RoomWrite, Permission.RoomCommentsRead];

    expect(hasPermissionCapability(scopes, "comments", "read")).toBe(true);
    expect(hasPermissionCapability(scopes, "comments", "write")).toBe(false);
  });

  test("supports deprecated permission strings", () => {
    expect(
      hasPermissionCapability(
        [Permission.LegacyCommentsWrite],
        "comments",
        "write"
      )
    ).toBe(true);
    expect(
      hasPermissionCapability(
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

  test("returns permission conflicts by resource", () => {
    expect(
      new Set(getRoomPermissionConflicts(Permission.RoomStorageRead))
    ).toEqual(
      new Set([
        Permission.RoomStorageRead,
        Permission.RoomStorageWrite,
        Permission.RoomStorageNone,
      ])
    );
    expect(getRoomPermissionConflicts(Permission.RoomWrite)).toContain(
      Permission.RoomCommentsNone
    );
  });
});
