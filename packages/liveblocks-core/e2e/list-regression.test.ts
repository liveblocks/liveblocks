/**
 * Regression tests for LiveList consistency issues found by property-based testing.
 *
 * These tests reproduce specific failure cases to help debug and fix the underlying issues.
 */
import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

/**
 * SIMPLIFIED REGRESSION TEST
 *
 * Minimal reproduction: undo after receiving remote ops causes an item to disappear.
 *
 * Sequence:
 * 1. A pushes "a"
 * 2. B pushes "b"
 * 3. A pushes "c"
 * 4. B.set(0, "B") - changes B's "b" to "B"
 * 5. A.flush() - B receives "a" and "c" from A
 *    After this: B has ["a", "c", "B"]
 * 6. B.undo() - undoes the set, should restore "b"
 *    EXPECTED: B has ["a", "c", "b"] or similar order with all 3 items
 *    ACTUAL: B has ["b", "c"] - "a" is missing!
 *
 * After final sync, both clients converge to ["b", "c"] - "a" was pushed by A
 * but is missing from the final state!
 */
test(
  "undo after receiving remote ops causes item to disappear",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room2, control, assert }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      // A pushes "a"
      listA.push("a");
      // B pushes "b"
      listB.push("b");
      // A pushes "c"
      listA.push("c");
      // B sets index 0 to "B" (B's only item "b" becomes "B")
      listB.set(0, "B");

      // A flushes - B receives "a" and "c"
      await control.flushA();

      // State: A=["a","c"], B=["a","c","B"]

      // B undoes the set operation
      room2.history.undo();

      // State after undo: A=["a","c"], B=["b","c"] - BUG: "a" disappeared!

      // Final sync
      await control.flushA();
      await control.flushB();

      // State: A=["b","c"], B=["b","c"] - both converged but "a" is missing!

      // Both clients should have the same final state
      assert({ list: listA.toImmutable() });

      // "a" should still exist - it was pushed by A and never deleted!
      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();

      if (!finalA.includes("a")) {
        throw new Error(
          `BUG: "a" is missing from final state! A=${JSON.stringify(finalA)}, B=${JSON.stringify(finalB)}`
        );
      }
    }
  )
);
