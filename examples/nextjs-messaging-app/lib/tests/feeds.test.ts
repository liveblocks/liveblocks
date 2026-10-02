import { describe, expect, it } from "vitest";
import {
  getActivityFeedId,
  getDmFeedId,
  getThreadFeedId,
  isActivityItem,
  isChatMessage,
  isDmFeedId,
  isThreadFeedId,
  THREAD_FEED_PREFIX,
  type ActivityItem,
  type ChatMessage,
} from "@/lib/feeds";

describe("getDmFeedId", () => {
  it("is symmetric and sanitizes both user ids", () => {
    const a = "mislav.abha@example.com";
    const b = "charlie.layne@example.com";
    const expected = "dm_charlie-layne-example-com__mislav-abha-example-com";
    expect(getDmFeedId(a, b)).toBe(expected);
    expect(getDmFeedId(b, a)).toBe(expected);
  });
});

describe("isDmFeedId", () => {
  it("returns true for dm feeds", () => {
    expect(
      isDmFeedId("dm_charlie-layne-example-com__mislav-abha-example-com")
    ).toBe(true);
  });

  it("returns false for thread, activity, and channel ids", () => {
    expect(isDmFeedId("thread_abc")).toBe(false);
    expect(isDmFeedId("activity_user")).toBe(false);
    expect(isDmFeedId("general")).toBe(false);
  });
});

describe("thread feed ids", () => {
  it("uses the thread_ prefix constant", () => {
    expect(THREAD_FEED_PREFIX).toBe("thread_");
  });

  it("builds thread feed ids from message ids", () => {
    expect(getThreadFeedId("abc")).toBe("thread_abc");
  });

  it("recognises thread feed ids", () => {
    expect(isThreadFeedId("thread_abc")).toBe(true);
    expect(isThreadFeedId("dm_a__b")).toBe(false);
    expect(isThreadFeedId("general")).toBe(false);
  });
});

describe("getActivityFeedId", () => {
  it("prefixes activity_ and sanitizes invalid characters", () => {
    expect(getActivityFeedId("charlie.layne@example.com")).toBe(
      "activity_charlie-layne-example-com"
    );
  });
});

describe("isChatMessage / isActivityItem", () => {
  const base = {
    id: "1",
    createdAt: 0,
    updatedAt: 0,
  };

  it("discriminates chat messages by undefined kind", () => {
    const chat: ChatMessage = {
      ...base,
      data: { userId: "u", content: "hi" },
    };
    expect(isChatMessage(chat)).toBe(true);
    expect(isActivityItem(chat)).toBe(false);
  });

  it("discriminates activity items by kind activity", () => {
    const activity: ActivityItem = {
      ...base,
      data: {
        kind: "activity",
        type: "mention",
        feedId: "general",
        messageId: "m1",
        fromUserId: "u",
      },
    };
    expect(isActivityItem(activity)).toBe(true);
    expect(isChatMessage(activity)).toBe(false);
  });
});
