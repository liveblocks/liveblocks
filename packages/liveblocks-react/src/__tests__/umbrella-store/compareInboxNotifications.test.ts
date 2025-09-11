import type { InboxNotificationData } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { compareInboxNotifications } from "../../umbrella-store";

describe("compareInboxNotifications", () => {
  const inboxNotificationA: InboxNotificationData = {
    kind: "thread",
    id: "in_1",
    notifiedAt: new Date("2024-01-01"),
    threadId: "th_1",
    readAt: new Date("2024-01-01"),
    roomId: "room_1",
  };

  const inboxNotificationB: InboxNotificationData = {
    kind: "thread",
    id: "in_1",
    notifiedAt: new Date("2024-01-01"),
    threadId: "th_1",
    readAt: new Date("2024-01-01"),
    roomId: "room_1",
  };

  // Test case 1: A is newer based on notifiedAt
  test("should return 1 if A is newer based on notifiedAt", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-02");
    inboxNotificationB.notifiedAt = new Date("2024-01-01");
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(1);
  });

  // Test case 2: B is newer based on notifiedAt
  test("should return -1 if B is newer based on notifiedAt", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-01");
    inboxNotificationB.notifiedAt = new Date("2024-01-02");
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(-1);
  });

  // Test case 3: A and B are the same based on notifiedAt, A is read later
  test("should return 1 if A and B have the same notifiedAt but A is read later", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-01");
    inboxNotificationB.notifiedAt = new Date("2024-01-01");

    inboxNotificationA.readAt = new Date("2024-01-02");
    inboxNotificationB.readAt = new Date("2024-01-01");
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(1);
  });

  // Test case 4: A is read, B is unread, same notifiedAt
  test("should return 1 if A is read and B is unread with the same notifiedAt", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-01");
    inboxNotificationB.notifiedAt = new Date("2024-01-01");

    inboxNotificationA.readAt = new Date("2024-01-02");
    inboxNotificationB.readAt = null;
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(1);
  });

  // Test case 5: A is unread, B is read, same notifiedAt
  test("should return -1 if A is unread and B is read with the same notifiedAt", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-01");
    inboxNotificationB.notifiedAt = new Date("2024-01-01");

    inboxNotificationA.readAt = null;
    inboxNotificationB.readAt = new Date("2024-01-02");
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(-1);
  });

  // Test case 6: A and B have the same notifiedAt and readAt
  test("should return 0 if A and B have the same notifiedAt and readAt", () => {
    inboxNotificationA.notifiedAt = new Date("2024-01-01");
    inboxNotificationB.notifiedAt = new Date("2024-01-01");

    inboxNotificationA.readAt = new Date("2024-01-01");
    inboxNotificationB.readAt = new Date("2024-01-01");
    expect(
      compareInboxNotifications(inboxNotificationA, inboxNotificationB)
    ).toBe(0);
  });
});
