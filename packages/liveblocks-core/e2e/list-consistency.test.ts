import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "move/insert/undo should result in consistent state across clients",
  prepareTestsConflicts(
    { list: new LiveList(["e1", "e2", "e3", "e4"]) },

    async ({ root1, root2, room1, wsUtils, assert }) => {
      // This test captures the specific bug scenario described:
      // - Both clients start with [e1, e2, e3, e4]
      // - Client A: move(2, 0) -> [e3, e1, e2, e4]
      // - Sync: Both clients see [e3, e1, e2, e4]
      // - Client B: insert(3, e5) -> [e3, e1, e2, e5, e4]
      // - Sync: Both clients see [e3, e1, e2, e5, e4]
      // - Client A: undo the move
      // Expected: both clients should have the same final state
      // Actual bug: clients end up with different final states

      // Initial state: both clients have [e1, e2, e3, e4]
      assert({ list: ["e1", "e2", "e3", "e4"] });

      // Client A does a move(2, 0) - moves e3 to position 0
      root1.get("list").move(2, 0);
      assert(
        { list: ["e3", "e1", "e2", "e4"] },
        { list: ["e1", "e2", "e3", "e4"] }
      );

      // Sync Client A's move to Client B
      await wsUtils.flushSocket1Messages();
      assert({ list: ["e3", "e1", "e2", "e4"] });

      // Client B does an insert(3, "e5")
      root2.get("list").insert("e5", 3);
      assert(
        { list: ["e3", "e1", "e2", "e4"] },
        { list: ["e3", "e1", "e2", "e5", "e4"] }
      );

      // Sync Client B's insert to Client A
      await wsUtils.flushSocket2Messages();
      assert({ list: ["e3", "e1", "e2", "e5", "e4"] });

      // Client A now undoes the move
      room1.history.undo();

      // Sync the undo operation
      await wsUtils.flushSocket1Messages();

      // Both clients should have the same final state
      assert({ list: root1.get("list").toArray() });
    }
  )
);

test(
  "undo/redo consistency across clients with concurrent operations",
  prepareTestsConflicts(
    { list: new LiveList(["a", "b", "🟢", "d"]) },

    // This test verifies that undo/redo operations maintain consistency across clients
    // when operations are performed on different clients in a distributed environment.
    async ({ root1, root2, room1, room2, wsUtils, assert }) => {
      // Initial state
      assert({ list: ["a", "b", "🟢", "d"] });

      // Client A does a move operation: move C (index 2) to position 0
      root1.get("list").move(2, 0);
      root2.get("list").delete(2);

      assert(
        { list: ["🟢", "a", "b", "d"] },
        { list: ["a", "b" /* removed */, "d"] }
      );

      // Sync Client A's move to Client B
      await wsUtils.flushSocket1Messages();
      assert({ list: ["🟢", "a", "b", "d"] }, { list: ["a", "b", "d"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["a", "b", "d"] });

      // Client A undoes the move
      room1.history.undo();
      assert({ list: ["a", "b", "d"] });
      await wsUtils.flushSocket1Messages();
      assert({ list: ["a", "b", "d"] });

      // Client B undoes the deletion (restores back to the original position)
      room2.history.undo();
      assert({ list: ["a", "b", "d"] }, { list: ["a", "b", "🟢", "d"] });
      await wsUtils.flushSocket2Messages();
      assert({ list: ["a", "b", "🟢", "d"] });

      // Client A redoes the move, but it has no effect, because effectively
      // the undo from Client B re-inserted a new value (different internal
      // ID than the original green ball)
      room1.history.redo();
      assert({ list: ["a", "b", "🟢", "d"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["a", "b", "🟢", "d"] });
    }
  )
);

test(
  "concurrent move and insert operations maintain consistency",
  prepareTestsConflicts(
    { list: new LiveList(["x", "🟢", "z"]) },

    async ({ root1, root2, wsUtils, assert }) => {
      // This test verifies that when a move and insert happen concurrently
      // on different clients, the final state remains consistent

      // Initial state: both clients have [x, 🟢, z]
      assert({ list: ["x", "🟢", "z"] });

      // Client A does a move: move 🟢 (index 1) to position 0
      root1.get("list").move(1, 0);

      // Client B does an insert: insert "🌕" at index 1
      root2.get("list").insert("🌕", 1);

      // Before sync, clients have different states
      assert({ list: ["🟢", "x", "z"] }, { list: ["x", "🌕", "🟢", "z"] });

      // Sync both ways
      await wsUtils.flushSocket1Messages();
      await wsUtils.flushSocket2Messages();

      // Both clients should converge to the same state
      assert({ list: ["🟢", "x", "🌕", "z"] });
    }
  )
);
