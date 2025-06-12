/* eslint-disable */

import type { ToolResultResponse } from "@liveblocks/core";
import { expectAssignable, expectNotAssignable } from "tsd";

// 🤔 These don't work RIGHT NOW, but it would be nice if these were accepted
// as shorthands for successful data responses
{
  // XXX TODO Actually allow these for convenience!
  expectNotAssignable<ToolResultResponse>(undefined);
  expectNotAssignable<ToolResultResponse>(null);
  expectNotAssignable<ToolResultResponse>({});
  expectNotAssignable<ToolResultResponse>({ description: "all good" });
}

// ❌ Invalid return values for execute()
{
  expectNotAssignable<ToolResultResponse>(123);
  expectNotAssignable<ToolResultResponse>([1, 2, 3]);
  expectNotAssignable<ToolResultResponse>({ yo: [1, 2, 3] });

  expectNotAssignable<ToolResultResponse>({ data: "hi" });
  expectNotAssignable<ToolResultResponse>({ data: 123 });
  expectNotAssignable<ToolResultResponse>({ data: [1, 2, 3] });

  expectNotAssignable<ToolResultResponse>({ error: 123 });
  expectNotAssignable<ToolResultResponse>({ error: { oops: "oh noes" } });

  expectNotAssignable<ToolResultResponse>({ cancel: 1 });
  expectNotAssignable<ToolResultResponse>({ cancel: false });
  expectNotAssignable<ToolResultResponse>({ cancel: null });
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
  expectAssignable<ToolResultResponse>({
    error: "oops",
    description: "something went wrong",
  });
}

{
  expectAssignable<ToolResultResponse>({ cancel: true });
  expectAssignable<ToolResultResponse>({
    cancel: true,
    description: "cancelled by user",
  });
}
