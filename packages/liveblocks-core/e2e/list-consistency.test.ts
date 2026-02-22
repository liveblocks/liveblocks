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
// B.push("tZ"), A.push("pu"), B.flush, A.delete(1), B.undo, B.delete(0),
// A.push("ww"), A.flush, A.insert("oH", 2)
// A had ["tZ","ww","oH"], B had ["ww","oH"]. Both should agree.
test(
  "push/flush/undo/delete consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");
      const log = (msg: string) => console.log(`  [test] ${msg}`);

      // B pushes "tZ" (buffered)
      listB.push("tZ");
      log(`1. B.push("tZ") → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // A pushes "pu" (buffered)
      listA.push("pu");
      log(`2. A.push("pu") → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // B flushes — server receives B.push("tZ"), broadcasts to A, ACKs to B
      await control.flushB();
      log(`3. B.flush()  → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // A.delete(1%) — deletes item at index 1 mod listLen
      const delIdx1 = 1 % listA.length;
      log(`4. A.delete(${delIdx1}) [1%${listA.length}] → deleting "${listA.get(delIdx1)}" from A=${JSON.stringify(listA.toImmutable())}`);
      listA.delete(delIdx1);
      log(`   after: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // B.undo — undoes push("tZ"), dispatches DELETE("tZ")
      room2.history.undo();
      log(`5. B.undo()   → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // B.delete(0%) — deletes item at index 0 mod listLen
      if (listB.length > 0) {
        const bDelIdx = 0 % listB.length;
        log(`6. B.delete(${bDelIdx}) → deleting "${listB.get(bDelIdx)}" from B=${JSON.stringify(listB.toImmutable())}`);
        listB.delete(bDelIdx);
        log(`   after: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);
      } else {
        log(`6. B.delete(0%) → skipped (empty list)`);
      }

      // A.push("ww")
      listA.push("ww");
      log(`7. A.push("ww") → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // A.flush — sends A's buffered ops to server
      await control.flushA();
      log(`8. A.flush()  → A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // A.insert("oH", 2%)
      const insIdx = 2 % Math.max(1, listA.length + 1);
      log(`9. A.insert("oH", ${insIdx}) [2%${listA.length + 1}]`);
      listA.insert("oH", insIdx);
      log(`   after: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // Final sync
      log(`10. Final sync: flushB...`);
      await control.flushB();
      log(`   after flushB: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      log(`11. flushA...`);
      await control.flushA();
      log(`   after flushA: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      log(`12. flushB...`);
      await control.flushB();
      log(`   after flushB: A=${JSON.stringify(listA.toImmutable())} B=${JSON.stringify(listB.toImmutable())}`);

      // Both clients should converge to the same state
      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);

// Regression test: property test counterexample (shrunk).
// B.push, B.push, B.flush, B.push, B.undo, A.undo, B.undo, B.redo,
// A.push, B.redo, B.delete(0), B.set(1, "vk")
// A had ["Gg","vk"], B had ["vk"]. Both should agree.
test(
  "push/undo/redo/delete/set consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      // Step 1-2: B pushes two items
      listB.push("lV");
      listB.push("Gg");

      // Step 3: B flushes — A receives both pushes
      await control.flushB();

      // Both clients should have ["lV", "Gg"]
      expect(listA.toImmutable()).toEqual(["lV", "Gg"]);
      expect(listB.toImmutable()).toEqual(["lV", "Gg"]);

      // Step 4: B pushes "cj" (buffered, not sent)
      listB.push("cj");

      // Step 5: B undoes push of "cj"
      room2.history.undo();

      // Step 6: A undoes (no-op, A has no local operations)
      room1.history.undo();

      // Step 7: B undoes push of "Gg"
      room2.history.undo();

      // Step 8: B redoes push of "Gg"
      room2.history.redo();

      // Step 9: A pushes "mk" (buffered, not sent)
      listA.push("mk");

      // Step 10: B redoes push of "cj"
      room2.history.redo();

      // Step 11: B deletes item at index 0 (0 % 3 = 0 → "lV")
      listB.delete(0);

      // Step 12: B sets item at index 1 (1 % 2 = 1 → replaces "cj" with "vk")
      listB.set(1, "vk");

      // Verify local states before sync
      expect(listB.toImmutable()).toEqual(["Gg", "vk"]);

      // Final sync
      await control.flushA();
      await control.flushB();

      // Both clients should converge to the same state
      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);
