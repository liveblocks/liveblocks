import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "move/insert/undo should result in consistent state across clients",
  prepareTestsConflicts(
    { list: new LiveList(["a", "b", "🟢", "d"]) },

    async ({ root1, root2, room1, control, assert }) => {
      // Client A does a move(2, 0) - moves 🟢 to front
      root1.get("list").move(2, 0);
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b", "🟢", "d"] }
      );

      // Sync Client A's move to Client B
      await control.flushA();
      assert({ list: ["🟢", "a", "b", "d"] });

      // Client B inserts "✨" at position 3
      root2.get("list").insert("✨", 3);
      assert(
        { list: ["🟢", "a", "b", "d"] },
        { list: ["🟢", "a", "b", "✨", "d"] }
      );

      // Sync Client B's insert to Client A
      await control.flushB();
      assert({ list: ["🟢", "a", "b", "✨", "d"] });

      // Client A now undoes the move
      room1.history.undo();

      // Sync the undo operation
      await control.flushA();

      // Both clients should have the same final state
      assert({ list: ["a", "b", "✨", "🟢", "d"] });
    }
  )
);

test(
  "move/insert/undo should result in consistent state across clients (variant)",
  prepareTestsConflicts(
    { list: new LiveList(["a", "b", "🟢", "d"]) },

    async ({ root1, root2, room1, control, assert }) => {
      // Client A does a move(2, 0) - moves 🟢 to front
      root1.get("list").move(2, 0);
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b", "🟢", "d"] }
      );

      // Sync Client A's move to Client B
      await control.flushA();
      assert({ list: ["🟢", "a", "b", "d"] });

      // Client B inserts "✨" at position 2
      root2.get("list").insert("✨", 2);
      assert(
        { list: ["🟢", "a", "b", "d"] },
        { list: ["🟢", "a", "✨", "b", "d"] }
      );

      // Sync Client B's insert to Client A
      await control.flushB();
      assert({ list: ["🟢", "a", "✨", "b", "d"] });

      // Client A now undoes the move
      room1.history.undo();

      // Sync the undo operation
      await control.flushA();

      // Both clients should have the same final state
      assert({ list: ["a", "✨", "b", "🟢", "d"] });
    }
  )
);

test(
  "undo/redo consistency across clients with concurrent operations",
  prepareTestsConflicts(
    { list: new LiveList(["a", "b", "🟢", "d"]) },

    // This test verifies that undo/redo operations maintain consistency across clients
    // when operations are performed on different clients in a distributed environment.
    async ({ root1, root2, room1, room2, control, assert }) => {
      // Client A does a move operation: move C (index 2) to position 0
      root1.get("list").move(2, 0);
      root2.get("list").delete(2);
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b" /* removed */, "d"] }
      );

      // Sync Client A's move to Client B
      await control.flushA();
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b", "d"] }
      );

      await control.flushB();
      assert({ list: ["a", "b", "d"] });

      // Client A undoes the move
      room1.history.undo();
      assert({ list: ["a", "b", "d"] });
      await control.flushA();
      assert({ list: ["a", "b", "d"] });

      // Client B undoes the deletion (restores back to the original position)
      room2.history.undo();
      assert(
        { list: ["a", "b", "d"] }, //
        { list: ["a", "b", "🟢", "d"] }
      );
      await control.flushB();
      assert({ list: ["a", "b", "🟢", "d"] });

      // Client A redoes the move, but it has no effect, because effectively
      // the undo from Client B re-inserted a new value (different internal
      // ID than the original green ball)
      room1.history.redo();
      assert({ list: ["a", "b", "🟢", "d"] });

      await control.flushA();
      assert({ list: ["a", "b", "🟢", "d"] });
    }
  )
);

test(
  "concurrent move and insert operations maintain consistency",
  prepareTestsConflicts(
    { list: new LiveList(["x", "🟢", "z"]) },

    async ({ root1, root2, control, assert }) => {
      // This test verifies that when a move and insert happen concurrently
      // on different clients, the final state remains consistent

      // Client A does a move: move 🟢 (index 1) to position 0
      root1.get("list").move(1, 0);

      // Client B does an insert: insert "🌕" at index 1
      root2.get("list").insert("🌕", 1);

      // Before sync, clients have different states
      assert(
        { list: ["🟢", "x", "z"] }, //
        { list: ["x", "🌕", "🟢", "z"] }
      );

      // Sync both ways
      await control.flushA();
      await control.flushB();

      // Both clients should converge to the same state
      assert({ list: ["🟢", "x", "🌕", "z"] });
    }
  )
);

// Regression test: property test counterexample (shrunk).
// B.insert("eg") disappears from client A after final sync.
// Reproduces a consistency violation found by the list-property property test.
test.fails(
  "insert/set/undo/move/undo consistency with missing item after sync",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listA.insert("og", 0);
      listA.set(0, "bI");
      listA.push("Eq");
      room1.history.undo();
      listB.push("XS");
      await control.flushA();
      await control.flushB();

      room1.history.undo();
      listB.push("tq");
      listB.insert("eg", 2 % (listB.length + 1));
      if (listA.length > 0) listA.set(2 % listA.length, "sT");
      listB.push("KK");
      await control.flushB();

      room1.history.undo();
      if (listA.length > 0) listA.move(0 % listA.length, 4 % listA.length);
      listA.push("Tn");
      if (listA.length > 0) listA.move(1 % listA.length, 0 % listA.length);
      if (listA.length > 0) listA.set(1 % listA.length, "EN");
      listA.push("KP");
      listA.insert("eQ", 0);
      room2.history.undo();
      listA.push("bF");
      listA.push("lM");
      room2.history.redo();
      listA.push("gS");
      listB.insert("Cc", 3 % (listB.length + 1));
      room1.history.undo();
      listA.insert("ui", 4 % (listA.length + 1));
      if (listA.length > 0) listA.delete(2 % listA.length);
      room1.history.undo();
      listB.insert("en", 5 % (listB.length + 1));
      listA.push("Az");

      // Final sync
      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);
