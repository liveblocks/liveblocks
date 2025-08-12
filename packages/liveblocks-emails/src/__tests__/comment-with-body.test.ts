import { describe, expect, test } from "vitest";

import { filterCommentsWithBody } from "../comment-with-body";
import { commentBody1, generateThreadId, makeComment } from "./_helpers";

describe("Comment with body", () => {
  test("should filter comments with defined bodies", () => {
    const threadId = generateThreadId();
    const comment1 = makeComment({ userId: "user-0", threadId });
    const comment2 = makeComment({
      userId: "user-1",
      threadId,
      body: commentBody1,
    });

    const expected = [comment2];
    expect(filterCommentsWithBody([comment1, comment2])).toEqual(expected);
  });
});
