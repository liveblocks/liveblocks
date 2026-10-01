import { describe, expect, it } from "vitest";
import { getThreadFeedId, THREAD_FEED_PREFIX } from "@/lib/threads";

describe("threads", () => {
  it("uses thread_ prefix constant", () => {
    expect(THREAD_FEED_PREFIX).toBe("thread_");
  });

  it("builds thread feed ids from message ids", () => {
    expect(getThreadFeedId("abc")).toBe("thread_abc");
  });
});
