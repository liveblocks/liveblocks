import { describe, expect, test } from "vitest";

import {
  hasRoomFeatureAccess,
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
      roomFeaturesFromScopes([
        Permission.RoomWrite,
        Permission.RoomStorageNone,
      ]).storage
    ).toBe("none");
  });

  test("uses the strongest explicit feature access", () => {
    expect(
      roomFeaturesFromScopes([
        Permission.RoomStorageNone,
        Permission.RoomStorageWrite,
      ]).storage
    ).toBe("write");
  });

  test("allows read but not write when a feature is downgraded", () => {
    const scopes = [Permission.RoomWrite, Permission.RoomCommentsRead];

    expect(hasRoomFeatureAccess(scopes, "comments", "read")).toBe(true);
    expect(hasRoomFeatureAccess(scopes, "comments", "write")).toBe(false);
  });

  test("supports deprecated permission strings", () => {
    expect(
      hasRoomFeatureAccess([Permission.CommentsWrite], "comments", "write")
    ).toBe(true);
    expect(
      hasRoomFeatureAccess([Permission.RoomPresenceWrite], "presence", "read")
    ).toBe(true);
  });
});
