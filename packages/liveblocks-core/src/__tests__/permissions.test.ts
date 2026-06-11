import { describe, expect, test } from "vitest";

import {
  hasPermissionAccess,
  mergePermissionMatrices,
  mergeRoomPermissionScopes,
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
    const matrix = permissionMatrixFromScopes([
      Permission.Write,
      Permission.CommentsRead,
    ]);

    expect(hasPermissionAccess(matrix, "comments", "read")).toBe(true);
    expect(hasPermissionAccess(matrix, "comments", "write")).toBe(false);
  });

  test("feature permissions require a base permission", () => {
    expect(
      hasPermissionAccess(
        permissionMatrixFromScopes([Permission.CommentsWrite]),
        "comments",
        "write"
      )
    ).toBe(false);
    expect(
      hasPermissionAccess(
        permissionMatrixFromScopes([Permission.LegacyRoomPresenceWrite]),
        "room",
        "write"
      )
    ).toBe(false);
  });

  test("does not grant personal access without a base permission", () => {
    expect(permissionMatrixFromScopes([]).personal).toBe("none");
    expect(
      hasPermissionAccess(
        permissionMatrixFromScopes([Permission.CommentsWrite]),
        "personal",
        "write"
      )
    ).toBe(false);
  });

  test("grants personal access with a base permission", () => {
    expect(permissionMatrixFromScopes([Permission.Read]).personal).toBe(
      "write"
    );
    expect(
      hasPermissionAccess(
        permissionMatrixFromScopes([Permission.Read]),
        "personal",
        "write"
      )
    ).toBe(true);
  });

  test("returns a fresh matrix for each resolution", () => {
    const first = permissionMatrixFromScopes([]);
    first.room = "write";

    expect(permissionMatrixFromScopes([]).room).toBe("none");
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
      permissionMatrixFromScopes([]),
      permissionMatrixFromScopes([Permission.Write]),
      permissionMatrixFromScopes([Permission.Write, Permission.StorageNone]),
    ]);

    expect(matrix.storage).toBe("write");
    expect(matrix.personal).toBe("write");
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

describe("mergeRoomPermissionScopes", () => {
  test("uses room defaults when no group or user overrides exist", () => {
    expect(
      mergeRoomPermissionScopes({
        defaultAccesses: [
          Permission.RoomRead,
          Permission.LegacyRoomPresenceWrite,
        ],
        groupsAccesses: [],
      })
    ).toEqual([Permission.Read]);
  });

  test("picks the highest access level per feature across sources", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Read],
          groupsAccesses: [[Permission.Read, Permission.CommentsRead]],
          userAccesses: [Permission.Read, Permission.StorageWrite],
        })
      )
    ).toEqual({
      room: "read",
      storage: "write",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
  });

  test("user write beats default read on the same feature", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Read],
          groupsAccesses: [],
          userAccesses: [Permission.Read, Permission.CommentsWrite],
        })
      ).comments
    ).toBe("write");
  });

  test("group write beats user read on the same feature", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Read],
          groupsAccesses: [[Permission.Read, Permission.CommentsWrite]],
          userAccesses: [Permission.Read, Permission.CommentsRead],
        })
      ).comments
    ).toBe("write");
  });

  test("merges multiple groups by taking the highest level per feature", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [],
          groupsAccesses: [
            [Permission.Read, Permission.StorageRead],
            [Permission.Read, Permission.StorageWrite],
          ],
        })
      ).storage
    ).toBe("write");
  });

  test("does not let a source-specific none downgrade a higher default", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Write],
          groupsAccesses: [],
          userAccesses: [Permission.Read, Permission.StorageNone],
        })
      ).storage
    ).toBe("write");
  });

  test("explicit none on all sources grants no access", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Write, Permission.StorageNone],
          groupsAccesses: [],
        })
      ).storage
    ).toBe("none");
  });

  test("handles mixed legacy and new base aliases", () => {
    expect(
      mergeRoomPermissionScopes({
        defaultAccesses: [Permission.RoomRead],
        groupsAccesses: [[Permission.Write, Permission.CommentsNone]],
        userAccesses: [Permission.Read, Permission.StorageWrite],
      })
    ).toEqual([Permission.Write, Permission.CommentsRead]);
  });
});
