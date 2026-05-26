import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

// Reproduction of the Subframe report (LB-3483). Two actors append to the same
// LiveList near-simultaneously: client A appends a1 then a2; client B appends
// b1 without yet having seen a1/a2, so b1 guesses the head position. By the
// time b1 reaches the server, a1 and a2 are already stored, and the position
// conflict is resolved *between* them — so the list settles as [a1, b1, a2]
// instead of append order [a1, a2, b1]. A server-authoritative append must
// place b1 at the true end.
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
