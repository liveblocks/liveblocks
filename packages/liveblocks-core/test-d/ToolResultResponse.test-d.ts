import type { ToolResultResponse } from "@liveblocks/core";
import { describe, test } from "vitest";

// TODO: toExtend doesn't work with Relax<...> union types so we use plain assignment checks instead

describe("ToolResultResponse", () => {
  test("should reject invalid return values", () => {
    // @ts-expect-error - Responses must be an object
    const _1: ToolResultResponse = 123;
    // @ts-expect-error - Responses must be an object
    const _2: ToolResultResponse = [1, 2, 3];

    // @ts-expect-error - Success responses must have a `data` field
    const _3: ToolResultResponse = { yo: [1, 2, 3] };

    // @ts-expect-error - `data` must be an object as well
    const _4: ToolResultResponse = { data: "hi" };
    // @ts-expect-error - `data` must be an object as well
    const _5: ToolResultResponse = { data: 123 };
    // @ts-expect-error - `data` must be an object as well
    const _6: ToolResultResponse = { data: [1, 2, 3] };

    // @ts-expect-error - `error` must be a string
    const _7: ToolResultResponse = { error: 123 };
    const _8: ToolResultResponse = {
      // @ts-expect-error - `error` must be a string
      error: { code: 403, message: "Not authorized" },
    };

    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    const _9: ToolResultResponse = { cancel: 1 };
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    const _10: ToolResultResponse = { cancel: false };
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    const _11: ToolResultResponse = { cancel: null };
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    const _12: ToolResultResponse = { cancel: [] };
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    const _13: ToolResultResponse = { cancel: {} };
  });

  // For now, don't allow description on error/cancelled results.
  // It's a bit confusing.
  // Besides, adding it back in later is still possible, but removing it
  // is not, so this is the least risky option to launch with initially.
  test("should disallow description on error/cancelled results", () => {
    // @ts-expect-error - `description` is not allowed on error/cancelled results
    const _1: ToolResultResponse = {
      error: "oops",
      description: "something went wrong",
    };
    // @ts-expect-error - `description` is not allowed on error/cancelled results
    const _2: ToolResultResponse = {
      cancel: true,
      description: "cancelled by user",
    };
    // @ts-expect-error - `description` is not allowed on error/cancelled results
    const _3: ToolResultResponse = {
      cancel: "I want to cancel the operation",
      description: "cancelled by user",
    };
  });

  test("should accept valid shapes", () => {
    // All of these are interpreted as type: "success" cases
    const _1: ToolResultResponse = { data: {} };
    const _2: ToolResultResponse = { data: { yo: [1, 2, 3] } };
    const _3: ToolResultResponse = { data: {}, description: "all good" };
    const _4: ToolResultResponse = {
      data: { yo: [1, 2, 3] },
      description: "all good",
    };

    const _5: ToolResultResponse = { error: "oops" };

    const _6: ToolResultResponse = { cancel: true };
    const _7: ToolResultResponse = {
      cancel: "I want to cancel the operation",
    };
  });
});
