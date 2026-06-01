import { describe, expect, test } from "vitest";

import {
  normalizeRoomPermissionInput,
  normalizeRoomPermissions,
} from "../permissions";

describe("normalizeRoomPermissions", () => {
  test("normalizes default room permissions", () => {
    expect(normalizeRoomPermissions({ default: "read" })).toEqual([
      "room:read",
    ]);

    expect(normalizeRoomPermissions({ default: "write" })).toEqual([
      "room:write",
    ]);
  });

  test("normalizes various permissions", () => {
    expect(
      normalizeRoomPermissions({
        default: "write",
        presence: "read",
        comments: "read",
        storage: "write",
        feeds: "none",
      })
    ).toEqual([
      "room:write",
      "room:presence:read",
      "room:storage:write",
      "room:comments:read",
      "room:feeds:none",
    ]);

    expect(
      normalizeRoomPermissions({
        presence: "none",
        comments: "write",
      })
    ).toEqual(["room:presence:none", "room:comments:write"]);

    expect(normalizeRoomPermissions({ comments: "none" })).toEqual([
      "room:comments:none",
    ]);
  });

  test("uses deterministic resource ordering", () => {
    expect(
      normalizeRoomPermissions({
        feeds: "write",
        storage: "read",
        comments: "none",
        presence: "none",
        default: "read",
      })
    ).toEqual([
      "room:read",
      "room:presence:none",
      "room:storage:read",
      "room:comments:none",
      "room:feeds:write",
    ]);
  });

  test("throws when permission object is empty", () => {
    expect(() => normalizeRoomPermissions({})).toThrow(
      "Room permission object cannot be empty"
    );
  });

  test("throws when permission object values are invalid", () => {
    expect(() =>
      normalizeRoomPermissions({
        // @ts-expect-error: testing JS callers with invalid values
        default: "none",
      })
    ).toThrow('Invalid room permission object value for "default"');

    expect(() =>
      normalizeRoomPermissions({
        // @ts-expect-error: testing JS callers with invalid values
        presence: "write",
      })
    ).toThrow('Invalid room permission object value for "presence"');

    expect(() =>
      normalizeRoomPermissions({
        // @ts-expect-error: testing JS callers with invalid values
        storage: "full",
      })
    ).toThrow('Invalid room permission object value for "storage"');

    expect(() =>
      normalizeRoomPermissions({
        // @ts-expect-error: testing JS callers with invalid values
        comments: "full",
      })
    ).toThrow('Invalid room permission object value for "comments"');

    expect(() =>
      normalizeRoomPermissions({
        // @ts-expect-error: testing JS callers with invalid values
        feeds: "full",
      })
    ).toThrow('Invalid room permission object value for "feeds"');
  });

  test("throws when permission arrays contain invalid strings", () => {
    expect(() =>
      normalizeRoomPermissionInput([
        // @ts-expect-error: testing JS callers with invalid values
        "not-a-permission",
      ])
    ).toThrow("Not a valid permission: not-a-permission");
  });
});
