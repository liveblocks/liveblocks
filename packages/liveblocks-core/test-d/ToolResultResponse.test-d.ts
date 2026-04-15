import type { ToolResultResponse } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

describe("ToolResultResponse", () => {
  test("should reject invalid return values", () => {
    // @ts-expect-error - Responses must be an object
    ({}) satisfies ToolResultResponse;
    // @ts-expect-error - Responses must be an object
    [1, 2, 3] satisfies ToolResultResponse;

    // @ts-expect-error - Success responses must have a `data` field
    ({ yo: [1, 2, 3] }) satisfies ToolResultResponse;

    // @ts-expect-error - `data` must be an object as well
    ({ data: "hi" }) satisfies ToolResultResponse;
    // @ts-expect-error - `data` must be an object as well
    ({ data: 123 }) satisfies ToolResultResponse;
    // @ts-expect-error - `data` must be an object as well
    ({ data: [1, 2, 3] }) satisfies ToolResultResponse;

    // @ts-expect-error - `error` must be a string
    ({ error: 123 }) satisfies ToolResultResponse;
    ({
      // @ts-expect-error - `error` must be a string
      error: { code: 403, message: "Not authorized" },
    }) satisfies ToolResultResponse;

    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    ({ cancel: 1 }) satisfies ToolResultResponse;
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    ({ cancel: false }) satisfies ToolResultResponse;
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    ({ cancel: null }) satisfies ToolResultResponse;
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    ({ cancel: [] }) satisfies ToolResultResponse;
    // @ts-expect-error - `cancel` must be a boolean or a string (reason)
    ({ cancel: {} }) satisfies ToolResultResponse;
  });

  // For now, don't allow description on error/cancelled results.
  // It's a bit confusing.
  // Besides, adding it back in later is still possible, but removing it
  // is not, so this is the least risky option to launch with initially.
  test("should disallow description on error/cancelled results", () => {
    ({
      error: "oops",
      description: "something went wrong",
      // @ts-expect-error - `description` is not allowed on error/cancelled results
    }) satisfies ToolResultResponse;
    ({
      cancel: true,
      description: "cancelled by user",
      // @ts-expect-error - `description` is not allowed on error/cancelled results
    }) satisfies ToolResultResponse;
    ({
      cancel: "I want to cancel the operation",
      description: "cancelled by user",
      // @ts-expect-error - `description` is not allowed on error/cancelled results
    }) satisfies ToolResultResponse;
  });

  test("should accept valid shapes", () => {
    // All of these are interpreted as type: "success" cases
    expectTypeOf({
      data: {},
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      data: { yo: [1, 2, 3] },
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      data: {},
      description: "all good",
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      data: { yo: [1, 2, 3] },
      description: "all good",
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      error: "oops",
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      cancel: true,
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
    expectTypeOf({
      cancel: "I want to cancel the operation",
    } satisfies ToolResultResponse).toExtend<ToolResultResponse>();
  });
});
