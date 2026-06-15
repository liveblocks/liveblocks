import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

// Two actors append to the same LiveList near-simultaneously: client A appends
// a1 then a2; client B appends b1 without yet having seen a1/a2, so b1's
// client-computed position is stale by the time it reaches the server (a1 and
// a2 are already stored there). Because the op is tagged with intent: "push",
// the server ignores that stale position and appends b1 at the true end, so
// both clients settle in append order: [a1, a2, b1].
test(
  "concurrent pushes settle in append order, never wedged",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").push("a1");
      root1.get("list").push("a2");
      root2.get("list").push("b1");

      await control.flushA();
      await control.flushB();

      assert({ list: ["a1", "a2", "b1"] });
    }
  )
);
