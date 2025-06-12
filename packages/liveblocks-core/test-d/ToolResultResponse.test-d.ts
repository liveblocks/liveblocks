/* eslint-disable */

import type { ToolResultResponse } from "@liveblocks/core";
import { expectAssignable, expectNotAssignable } from "tsd";

// ❌ Invalid return values for execute()
{
  expectNotAssignable<ToolResultResponse>(123);
  expectNotAssignable<ToolResultResponse>([1, 2, 3]);
  expectNotAssignable<ToolResultResponse>({ yo: [1, 2, 3] });

  expectNotAssignable<ToolResultResponse>({ data: "hi" });
  expectNotAssignable<ToolResultResponse>({ data: 123 });
  expectNotAssignable<ToolResultResponse>({ data: [1, 2, 3] });

  expectNotAssignable<ToolResultResponse>({ error: 123 });
  expectNotAssignable<ToolResultResponse>({
    error: { code: 403, message: "Not authorized" },
  });

  expectNotAssignable<ToolResultResponse>({ cancel: 1 });
  expectNotAssignable<ToolResultResponse>({ cancel: false });
  expectNotAssignable<ToolResultResponse>({ cancel: null });
  expectNotAssignable<ToolResultResponse>({ cancel: [] });
  expectNotAssignable<ToolResultResponse>({ cancel: {} });
}

// ❌ For now, don't allow description on error/cancelled results.
//    It's a bit confusing.
//    Besides, adding it back in later is still possible, but removing it
//    is not, so this is the least risky option to launch with initially.
{
  expectNotAssignable<ToolResultResponse>({
    error: "oops",
    description: "something went wrong",
  });
  expectNotAssignable<ToolResultResponse>({
    cancel: true,
    description: "cancelled by user",
  });
  expectNotAssignable<ToolResultResponse>({
    cancel: "I want to cancel the operation",
    description: "cancelled by user",
  });
}

// ✅ Valid return values for execute()
{
  // All of these are interpreted as type: "success" cases
  expectAssignable<ToolResultResponse>({ data: {} });
  expectAssignable<ToolResultResponse>({ data: { yo: [1, 2, 3] } });
  expectAssignable<ToolResultResponse>({ data: {}, description: "all good" });
  expectAssignable<ToolResultResponse>({
    data: { yo: [1, 2, 3] },
    description: "all good",
  });
}

{
  expectAssignable<ToolResultResponse>({ error: "oops" });
}

{
  expectAssignable<ToolResultResponse>({ cancel: true });
  expectAssignable<ToolResultResponse>({
    cancel: "I want to cancel the operation",
  });
}
