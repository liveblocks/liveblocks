import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  hasPermissionAccess,
  mergePermissionMatrices,
  mergeRoomPermissionScopes,
  Permission,
  type PermissionMatrix,
  permissionMatrixFromScopes,
  permissionMatrixToScopes,
  type PermissionResources,
  resolveRoomPermissionMatrix,
  validatePermissionsSet,
} from "../permissions";

const ALL_PERMISSIONS = Object.values(Permission);

const PERMISSION_RESOURCES = [
  "room",
  "storage",
  "comments",
  "feeds",
  "personal",
] as const satisfies readonly PermissionResources[];

const ACCESS_LEVEL_RANKS = {
  none: 0,
  read: 1,
  write: 2,
} as const;

const permissionScope = fc.constantFrom(...ALL_PERMISSIONS);

const scopeSet = fc.uniqueArray(permissionScope, { maxLength: 8 });

const validScopeSet = scopeSet.filter(
  (scopes) => validatePermissionsSet(scopes) === true
);

const noneScope = fc.constantFrom(
  Permission.StorageNone,
  Permission.CommentsNone,
  Permission.FeedsNone
);

function hasBasePermission(scopes: readonly Permission[]): boolean {
  return (
    scopes.includes(Permission.Read) ||
    scopes.includes(Permission.Write) ||
    scopes.includes(Permission.RoomRead) ||
    scopes.includes(Permission.RoomWrite)
  );
}

function accessRank(resource: PermissionResources, matrix: PermissionMatrix) {
  return ACCESS_LEVEL_RANKS[matrix[resource]];
}

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
        userAccesses: [],
      })
    ).toEqual([Permission.Read]);
  });

  test("combines explicit accesses per feature across sources", () => {
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

  test("explicit user read overrides group write on the same feature", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Read],
          groupsAccesses: [[Permission.Read, Permission.CommentsWrite]],
          userAccesses: [Permission.Read, Permission.CommentsRead],
        })
      ).comments
    ).toBe("read");
  });

  test("explicit group access overrides the room default", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Write],
          groupsAccesses: [[Permission.Read, Permission.CommentsRead]],
          userAccesses: [],
        })
      )
    ).toEqual({
      room: "read",
      storage: "read",
      comments: "read",
      feeds: "read",
      personal: "write",
    });
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
          userAccesses: [],
        })
      ).storage
    ).toBe("write");
  });

  test("explicit user none downgrades a higher default", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Write],
          groupsAccesses: [],
          userAccesses: [Permission.Read, Permission.StorageNone],
        })
      ).storage
    ).toBe("none");
  });

  test("explicit none on all sources grants no access", () => {
    expect(
      permissionMatrixFromScopes(
        mergeRoomPermissionScopes({
          defaultAccesses: [Permission.Write, Permission.StorageNone],
          groupsAccesses: [],
          userAccesses: [],
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
    ).toEqual([
      Permission.Read,
      Permission.StorageWrite,
      Permission.CommentsNone,
    ]);
  });
});

describe("validatePermissionsSet", () => {
  test("accepts a read base permission", () => {
    expect(validatePermissionsSet([Permission.Read])).toBe(true);
  });

  test("accepts a write base permission", () => {
    expect(validatePermissionsSet([Permission.Write])).toBe(true);
  });

  test("accepts legacy room base aliases", () => {
    expect(validatePermissionsSet([Permission.RoomRead])).toBe(true);
    expect(validatePermissionsSet([Permission.RoomWrite])).toBe(true);
  });

  test("accepts one permission per feature", () => {
    expect(
      validatePermissionsSet([
        Permission.Write,
        Permission.StorageNone,
        Permission.CommentsRead,
        Permission.FeedsWrite,
      ])
    ).toBe(true);
  });

  test("accepts the legacy presence scope as an extra room scope", () => {
    expect(
      validatePermissionsSet([
        Permission.Read,
        Permission.LegacyRoomPresenceWrite,
      ])
    ).toBe(true);
  });

  test("rejects unknown permission scopes", () => {
    expect(validatePermissionsSet([Permission.Read, "comments:delete"])).toBe(
      "Unknown permission scope(s): comments:delete"
    );
  });

  test("rejects permission sets without a base permission", () => {
    expect(validatePermissionsSet([Permission.CommentsRead])).toBe(
      `Permissions must include exactly one of ${Permission.Read}, ${Permission.Write} ` +
        `(or the legacy aliases ${Permission.RoomRead}, ${Permission.RoomWrite}), got none`
    );
  });

  test("rejects permission sets with multiple base permissions", () => {
    expect(validatePermissionsSet([Permission.Read, Permission.RoomRead])).toBe(
      `Permissions must include exactly one of ${Permission.Read}, ${Permission.Write} ` +
        `(or the legacy aliases ${Permission.RoomRead}, ${Permission.RoomWrite}), ` +
        `got ${Permission.Read}, ${Permission.RoomRead}`
    );
  });

  test("rejects multiple scopes for the same feature", () => {
    expect(
      validatePermissionsSet([
        Permission.Read,
        Permission.CommentsRead,
        Permission.CommentsWrite,
      ])
    ).toBe(
      'Permissions can include at most one scope per feature, got multiple "comments" scopes'
    );
  });
});

describe("property tests", () => {
  test("resolving scopes to a matrix is idempotent via minimal scopes", () => {
    fc.assert(
      fc.property(scopeSet, (scopes) => {
        const matrix = permissionMatrixFromScopes(scopes);
        expect(
          permissionMatrixFromScopes(permissionMatrixToScopes(matrix))
        ).toEqual(matrix);
      })
    );
  });

  test("valid scope sets round-trip through matrix serialization", () => {
    fc.assert(
      fc.property(validScopeSet, (scopes) => {
        const matrix = permissionMatrixFromScopes(scopes);
        const serialized = permissionMatrixToScopes(matrix);

        expect(validatePermissionsSet(serialized)).toBe(true);
        expect(permissionMatrixFromScopes(serialized)).toEqual(matrix);
      })
    );
  });

  test("personal access is write iff a base permission is present", () => {
    fc.assert(
      fc.property(scopeSet, (scopes) => {
        const matrix = permissionMatrixFromScopes(scopes);

        expect(matrix.personal).toBe(
          hasBasePermission(scopes) ? "write" : "none"
        );
      })
    );
  });

  test("adding a resource none scope never increases access", () => {
    fc.assert(
      fc.property(scopeSet, noneScope, (scopes, none) => {
        const before = permissionMatrixFromScopes(scopes);
        const after = permissionMatrixFromScopes([...scopes, none]);

        for (const resource of PERMISSION_RESOURCES) {
          expect(accessRank(resource, after)).toBeLessThanOrEqual(
            accessRank(resource, before)
          );
        }
      })
    );
  });

  test("merging permission matrices is commutative", () => {
    fc.assert(
      fc.property(scopeSet, scopeSet, (leftScopes, rightScopes) => {
        const left = permissionMatrixFromScopes(leftScopes);
        const right = permissionMatrixFromScopes(rightScopes);

        expect(mergePermissionMatrices([left, right])).toEqual(
          mergePermissionMatrices([right, left])
        );
      })
    );
  });

  test("legacy room base aliases resolve identically to wildcard bases", () => {
    fc.assert(
      fc.property(scopeSet, (scopes) => {
        const withoutLegacyBases = scopes.filter(
          (scope) =>
            scope !== Permission.RoomRead && scope !== Permission.RoomWrite
        );

        const withReadAlias = withoutLegacyBases.includes(Permission.Read)
          ? withoutLegacyBases.map((scope) =>
              scope === Permission.Read ? Permission.RoomRead : scope
            )
          : withoutLegacyBases;

        const withWriteAlias = withoutLegacyBases.includes(Permission.Write)
          ? withoutLegacyBases.map((scope) =>
              scope === Permission.Write ? Permission.RoomWrite : scope
            )
          : withoutLegacyBases;

        if (withoutLegacyBases.includes(Permission.Read)) {
          expect(permissionMatrixFromScopes(withReadAlias)).toEqual(
            permissionMatrixFromScopes(withoutLegacyBases)
          );
        }

        if (withoutLegacyBases.includes(Permission.Write)) {
          expect(permissionMatrixFromScopes(withWriteAlias)).toEqual(
            permissionMatrixFromScopes(withoutLegacyBases)
          );
        }
      })
    );
  });

  test("hasPermissionAccess matches matrix access ranks", () => {
    fc.assert(
      fc.property(scopeSet, (scopes) => {
        const matrix = permissionMatrixFromScopes(scopes);

        for (const resource of PERMISSION_RESOURCES) {
          expect(hasPermissionAccess(matrix, resource, "read")).toBe(
            accessRank(resource, matrix) >= ACCESS_LEVEL_RANKS.read
          );
          expect(hasPermissionAccess(matrix, resource, "write")).toBe(
            accessRank(resource, matrix) >= ACCESS_LEVEL_RANKS.write
          );
        }
      })
    );
  });
});
