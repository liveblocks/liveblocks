import { describe, expect, test } from "vitest";

import {
  hasPermissionAccess,
  mergePermissionMatrices,
  normalizeRoomPermissionInput,
  Permission,
  permissionMatrixFromScopes,
  permissionMatrixToScopes,
  resolveRoomPermissionMatrix,
} from "../permissions";

describe("permissionMatrixFromScopes", () => {
  test("resolves room read", () => {
    expect(permissionMatrixFromScopes([Permission.RoomRead])).toEqual({
      room: "read",
      presence: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
  });

  test("resolves room write", () => {
    expect(permissionMatrixFromScopes([Permission.RoomWrite])).toEqual({
      room: "write",
      presence: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("allows resource opt-outs from a room default", () => {
    expect(
      permissionMatrixFromScopes([
        Permission.RoomWrite,
        Permission.RoomStorageNone,
      ]).storage
    ).toBe("none");
    expect(
      permissionMatrixFromScopes([
        Permission.RoomWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("none");
  });

  test("uses the strongest same-resource access", () => {
    expect(
      permissionMatrixFromScopes([
        Permission.RoomCommentsWrite,
        Permission.RoomCommentsNone,
      ]).comments
    ).toBe("write");
  });

  test("uses the strongest non-none explicit resource access", () => {
    expect(
      permissionMatrixFromScopes([
        Permission.RoomCommentsRead,
        Permission.RoomCommentsWrite,
      ]).comments
    ).toBe("write");
  });

  test("allows read but not write when a resource is downgraded", () => {
    const scopes = [Permission.RoomWrite, Permission.RoomCommentsRead];

    expect(hasPermissionAccess(scopes, "comments", "read")).toBe(true);
    expect(hasPermissionAccess(scopes, "comments", "write")).toBe(false);
  });

  test("supports deprecated permission strings", () => {
    expect(
      hasPermissionAccess([Permission.LegacyCommentsWrite], "comments", "write")
    ).toBe(true);
    expect(
      hasPermissionAccess(
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

  test("resolves room permission matrix from wildcard resources", () => {
    expect(
      resolveRoomPermissionMatrix(
        [{ resource: "org1*", scopes: [Permission.RoomWrite] }],
        "org1.room1"
      )
    ).toEqual({
      room: "write",
      presence: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("combines matching room permissions by strongest resource access", () => {
    expect(
      resolveRoomPermissionMatrix(
        [
          { resource: "org1*", scopes: [Permission.RoomStorageWrite] },
          { resource: "org1.room1", scopes: [Permission.RoomStorageNone] },
        ],
        "org1.room1"
      )?.storage
    ).toBe("write");
  });

  test("lets exact room opt-outs override wildcard defaults without clearing other resources", () => {
    const matrix = resolveRoomPermissionMatrix(
      [
        { resource: "org1*", scopes: [Permission.RoomWrite] },
        { resource: "org1.room1", scopes: [Permission.RoomStorageNone] },
      ],
      "org1.room1"
    );

    expect(matrix?.presence).toBe("write");
    expect(matrix?.comments).toBe("write");
    expect(matrix?.storage).toBe("none");
  });

  test("returns undefined when no room permissions match", () => {
    expect(
      resolveRoomPermissionMatrix(
        [{ resource: "org2*", scopes: [Permission.RoomWrite] }],
        "org1.room1"
      )
    ).toBeUndefined();
  });
});

describe("permission matrix helpers", () => {
  test("merges permission matrices by taking the strongest access per resource", () => {
    const matrix = mergePermissionMatrices([
      permissionMatrixFromScopes([Permission.RoomWrite]),
      permissionMatrixFromScopes([Permission.RoomStorageNone]),
    ]);

    expect(matrix.storage).toBe("write");
  });

  test("serializes permission matrix to minimal scopes", () => {
    expect(
      permissionMatrixToScopes({
        room: "read",
        presence: "write",
        storage: "none",
        comments: "read",
        feeds: "read",
        personal: "write",
      })
    ).toEqual([
      Permission.RoomRead,
      Permission.LegacyRoomPresenceWrite,
      Permission.RoomStorageNone,
    ]);
  });
});
