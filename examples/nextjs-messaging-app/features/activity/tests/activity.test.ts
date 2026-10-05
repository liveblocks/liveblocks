import { describe, expect, it } from "vitest";
import { getActivityRootFeedId, isUnread } from "@/features/activity";
import type { ActivityItem } from "@/lib/feeds";

const base: Omit<ActivityItem, "data"> = {
  id: "1",
  createdAt: 0,
  updatedAt: 0,
};

describe("getActivityRootFeedId", () => {
  it("returns parentFeedId when set", () => {
    const item: ActivityItem = {
      ...base,
      data: {
        kind: "activity",
        type: "dm",
        feedId: "child",
        parentFeedId: "parent",
        messageId: "m",
        fromUserId: "u",
      },
    };
    expect(getActivityRootFeedId(item)).toBe("parent");
  });

  it("falls back to feedId", () => {
    const item: ActivityItem = {
      ...base,
      data: {
        kind: "activity",
        type: "dm",
        feedId: "only",
        messageId: "m",
        fromUserId: "u",
      },
    };
    expect(getActivityRootFeedId(item)).toBe("only");
  });
});

describe("isUnread", () => {
  it("is true only when readAt is undefined", () => {
    expect(
      isUnread({
        ...base,
        data: {
          kind: "activity",
          type: "mention",
          feedId: "f",
          messageId: "m",
          fromUserId: "u",
        },
      })
    ).toBe(true);
  });

  it("is false when readAt is set including zero", () => {
    expect(
      isUnread({
        ...base,
        data: {
          kind: "activity",
          type: "mention",
          feedId: "f",
          messageId: "m",
          fromUserId: "u",
          readAt: 0,
        },
      })
    ).toBe(false);
  });
});
