import { describe, expect, it } from "vitest";
import { getDmFeedId, isDmFeedId } from "@/lib/conversations";

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
    expect(isDmFeedId("dm_charlie-layne-example-com__mislav-abha-example-com")).toBe(
      true
    );
  });

  it("returns false for thread, activity, and channel ids", () => {
    expect(isDmFeedId("thread_abc")).toBe(false);
    expect(isDmFeedId("activity_user")).toBe(false);
    expect(isDmFeedId("general")).toBe(false);
  });
});
