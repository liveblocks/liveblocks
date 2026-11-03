import { describe, expect, it } from "vitest";
import { getMentionedUserIds, hasMention, mentionToken } from "@/lib/mentions";

describe("getMentionedUserIds", () => {
  it("extracts ids from mention tokens", () => {
    expect(
      getMentionedUserIds(
        "Hey <@charlie.layne@example.com> and <@mislav.abha@example.com>"
      )
    ).toEqual(["charlie.layne@example.com", "mislav.abha@example.com"]);
  });

  it("dedupes while preserving first-seen order", () => {
    expect(getMentionedUserIds("<@a> then <@b> then <@a> again")).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns empty array when there are no mentions", () => {
    expect(getMentionedUserIds("plain text")).toEqual([]);
  });
});

describe("mentionToken / hasMention", () => {
  it("round-trips a user id", () => {
    expect(mentionToken("ai-assistant")).toBe("<@ai-assistant>");
    expect(hasMention("hi <@ai-assistant>", "ai-assistant")).toBe(true);
    expect(hasMention("hi <@someone-else>", "ai-assistant")).toBe(false);
  });
});
