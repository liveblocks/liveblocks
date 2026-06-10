import { describe, expect, test } from "vitest";

import {
  hasPermissionAccess,
  mergePermissionMatrices,
  Permission,
  permissionMatrixFromScopes,
  permissionMatrixToScopes,
  resolveRoomPermissionMatrix,
} from "../permissions";

describe("permissionMatrixFromScopes", () => {
  test("resolves read access", () => {
    expect(permissionMatrixFromScopes([Permission.Read])).toEqual({
      room: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
  });

  test("resolves write access", () => {
    expect(permissionMatrixFromScopes([Permission.Write])).toEqual({
      room: "write",
      storage: "write",
      comments: "write",
      feeds: "write",
      personal: "write",
    });
  });

  test("resolves room read and write as aliases", () => {
    expect(permissionMatrixFromScopes([Permission.RoomRead])).toEqual(
      permissionMatrixFromScopes([Permission.Read])
    );
    expect(permissionMatrixFromScopes([Permission.RoomWrite])).toEqual(
      permissionMatrixFromScopes([Permission.Write])
    );
  });

  test("allows resource opt-outs from a room default", () => {
    expect(
      permissionMatrixFromScopes([Permission.Write, Permission.StorageNone])
        .storage
    ).toBe("none");
    expect(
      permissionMatrixFromScopes([Permission.Write, Permission.CommentsNone])
        .comments
    ).toBe("none");
  });

  test("uses the strongest same-resource access", () => {
    expect(
      permissionMatrixFromScopes([
        Permission.Write,
        Permission.CommentsWrite,
        Permission.CommentsNone,
      ]).comments
    ).toBe("write");
  });

  test("uses the strongest non-none explicit resource access", () => {
    expect(
      permissionMatrixFromScopes([
        Permission.Write,
        Permission.CommentsRead,
        Permission.CommentsWrite,
      ]).comments
    ).toBe("write");
  });

  test("allows read but not write when a resource is downgraded", () => {
    const scopes = [Permission.Write, Permission.CommentsRead];

    expect(hasPermissionAccess(scopes, "comments", "read")).toBe(true);
    expect(hasPermissionAccess(scopes, "comments", "write")).toBe(false);
  });

  test("feature permissions require a base permission", () => {
    expect(
      hasPermissionAccess([Permission.CommentsWrite], "comments", "write")
    ).toBe(false);
    expect(
      hasPermissionAccess([Permission.LegacyRoomPresenceWrite], "room", "write")
    ).toBe(false);
  });

  test("resolves room permission matrix from wildcard resources", () => {
    expect(
      resolveRoomPermissionMatrix(
        [{ resource: "org1*", scopes: [Permission.RoomWrite] }],
        "org1.room1"
      )
    ).toEqual({
      room: "write",
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
          { resource: "org1*", scopes: [Permission.Write] },
          { resource: "org1.room1", scopes: [Permission.StorageWrite] },
        ],
        "org1.room1"
      )?.storage
    ).toBe("write");
  });

  test("lets exact room opt-outs override wildcard defaults without clearing other resources", () => {
    const matrix = resolveRoomPermissionMatrix(
      [
        { resource: "org1*", scopes: [Permission.Write] },
        { resource: "org1.room1", scopes: [Permission.StorageNone] },
      ],
      "org1.room1"
    );

    expect(matrix?.room).toBe("write");
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
      permissionMatrixFromScopes([Permission.Write]),
      permissionMatrixFromScopes([Permission.Write, Permission.StorageNone]),
    ]);

    expect(matrix.storage).toBe("write");
  });

  test("serializes permission matrix to minimal scopes", () => {
    expect(
      permissionMatrixToScopes({
        room: "read",
        storage: "none",
        comments: "read",
        feeds: "read",
        personal: "write",
      })
    ).toEqual([Permission.Read, Permission.StorageNone]);
  });
});
