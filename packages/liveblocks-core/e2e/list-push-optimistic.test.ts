import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

// The pushing client's OWN optimistic view should not reorder its just-pushed
// items while a concurrent remote push reconciles. The final converged order is
// server-authoritative; here we assert the originator never sees one of its own
// already-rendered items jump *backward* on the way there.
test(
  "originator's pushed items never move backward under a concurrent remote push",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, room1, control, assert }) => {
      // Record every intermediate state client A (root1) renders for its list.
      const states: string[][] = [];
      const record = () => states.push(root1.get("list").toJSON() as string[]);
      room1.subscribe(root1.get("list"), record, { isDeep: true });

      // A pushes two items first; they stay unacked (A's outgoing is paused).
      root1.get("list").push("a1");
      root1.get("list").push("a2");

      // B pushes two items concurrently. flushB delivers both broadcasts to A
      // *while a1/a2 are still unacked* (incoming isn't paused), forcing A to
      // reconcile.
      root2.get("list").push("b1");
      root2.get("list").push("b2");
      await control.flushB();

      // A now sends its own a1/a2 and receives their acks.
      await control.flushA();

      // Final converged order.
      assert({ list: ["b1", "b2", "a1", "a2"] });

      // Invariant: in a pure-push sequence, no already-rendered item may ever
      // decrease in index. A's own a1/a2 must never jump backward.
      for (const item of new Set(states.flat())) {
        let lastIndex = -1;
        for (const state of states) {
          const idx = state.indexOf(item);
          if (idx === -1) continue;
          if (idx < lastIndex) {
            throw new Error(
              `"${item}" moved backward (index ${lastIndex} → ${idx}). ` +
                `Observed sequence: ${JSON.stringify(states)}`
            );
          }
          lastIndex = idx;
        }
      }
      expect(states.at(-1)).toEqual(["b1", "b2", "a1", "a2"]);
    }
  )
);
