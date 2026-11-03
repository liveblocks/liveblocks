import { describe, expect, it } from "vitest";
import { getThreadParticipantIds } from "@/lib/threads";

describe("getThreadParticipantIds", () => {
  it("collects authors and mentions in first-seen order", () => {
    expect(
      getThreadParticipantIds([
        { userId: "author1", content: "hi <@mentioned>" },
        { userId: "author2", content: "hey <@author1>" },
      ])
    ).toEqual(["author1", "mentioned", "author2"]);
  });

  it("returns an empty list for an empty thread", () => {
    expect(getThreadParticipantIds([])).toEqual([]);
  });
});
