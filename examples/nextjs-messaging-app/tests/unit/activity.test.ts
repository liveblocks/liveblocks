import { describe, expect, it } from "vitest";
import {
  getActivityFeedId,
  getActivityRootFeedId,
  getMentionedUserIds,
  getThreadParticipantIds,
  isActivityItem,
  isChatMessage,
  isUnread,
  type ActivityItem,
  type ChatMessage,
} from "@/lib/activity";

describe("getActivityFeedId", () => {
  it("prefixes activity_ and sanitizes invalid characters", () => {
    expect(getActivityFeedId("charlie.layne@example.com")).toBe(
      "activity_charlie-layne-example-com"
    );
  });
});

describe("getMentionedUserIds", () => {
  it("extracts ids from mention tokens", () => {
    expect(
      getMentionedUserIds("Hey <@charlie.layne@example.com> and <@mislav.abha@example.com>")
    ).toEqual(["charlie.layne@example.com", "mislav.abha@example.com"]);
  });

  it("dedupes while preserving first-seen order", () => {
    expect(
      getMentionedUserIds(
        "<@a> then <@b> then <@a> again"
      )
    ).toEqual(["a", "b"]);
  });

  it("returns empty array when there are no mentions", () => {
    expect(getMentionedUserIds("plain text")).toEqual([]);
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

describe("getActivityRootFeedId", () => {
  it("returns parentFeedId when set", () => {
    const item: ActivityItem = {
      id: "1",
      createdAt: 0,
      updatedAt: 0,
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
      id: "1",
      createdAt: 0,
      updatedAt: 0,
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
  const base: Omit<ActivityItem, "data"> = {
    id: "1",
    createdAt: 0,
    updatedAt: 0,
  };

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

describe("getThreadParticipantIds", () => {
  it("collects authors and mentions in first-seen order", () => {
    expect(
      getThreadParticipantIds([
        {
          userId: "author1",
          content: "hi <@mentioned>",
        },
        {
          userId: "author2",
          content: "hey <@author1>",
        },
      ])
    ).toEqual(["author1", "mentioned", "author2"]);
  });
});
