import { describe, expect, test } from "vitest";

import {
  getRoomPermissionConflicts,
  hasPermissionCapability,
  normalizeRoomPermissionInput,
  Permission,
  permissionCapabilitiesFromScopes,
  resolveRoomPermissionCapabilities,
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
        "write"
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

  test("resolves room capabilities from wildcard resources", () => {
    expect(
      resolveRoomPermissionCapabilities(
        [{ resource: "org1*", scopes: [Permission.RoomWrite] }],
        "org1.room1"
      )
    ).toEqual({
      creation: "write",
      presence: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("combines matching room permissions by strongest resource access", () => {
    expect(
      resolveRoomPermissionCapabilities(
        [
          { resource: "org1*", scopes: [Permission.RoomStorageWrite] },
          { resource: "org1.room1", scopes: [Permission.RoomStorageNone] },
        ],
        "org1.room1"
      )?.storage
    ).toBe("write");
  });

  test("lets exact room opt-outs override wildcard defaults without clearing other resources", () => {
    const capabilities = resolveRoomPermissionCapabilities(
      [
        { resource: "org1*", scopes: [Permission.RoomWrite] },
        { resource: "org1.room1", scopes: [Permission.RoomStorageNone] },
      ],
      "org1.room1"
    );

    expect(capabilities?.presence).toBe("write");
    expect(capabilities?.comments).toBe("write");
    expect(capabilities?.storage).toBe("none");
  });

  test("returns undefined when no room permissions match", () => {
    expect(
      resolveRoomPermissionCapabilities(
        [{ resource: "org2*", scopes: [Permission.RoomWrite] }],
        "org1.room1"
      )
    ).toBeUndefined();
  });
});
