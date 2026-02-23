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

    async ({ root1, root2, room1, room2, control, assert }) => {
      root1.get("list").move(2, 0);
      root2.get("list").delete(2);
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b" /* removed */, "d"] }
      );

      await control.flushA();
      assert(
        { list: ["🟢", "a", "b", "d"] }, //
        { list: ["a", "b", "d"] }
      );

      await control.flushB();
      assert({ list: ["a", "b", "d"] });

      room1.history.undo();
      assert({ list: ["a", "b", "d"] });
      await control.flushA();
      assert({ list: ["a", "b", "d"] });

      room2.history.undo();
      assert(
        { list: ["a", "b", "d"] }, //
        { list: ["a", "b", "🟢", "d"] }
      );
      await control.flushB();
      assert({ list: ["a", "b", "🟢", "d"] });

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
      root1.get("list").move(1, 0);
      root2.get("list").insert("🌕", 1);

      assert(
        { list: ["🟢", "x", "z"] }, //
        { list: ["x", "🌕", "🟢", "z"] }
      );

      await control.flushA();
      await control.flushB();

      assert({ list: ["🟢", "x", "🌕", "z"] });
    }
  )
);

// Regression test: property test counterexample (shrunk).
test(
  "push/flush/undo/delete consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listB.push("tZ");
      listA.push("pu");
      await control.flushB();

      const delIdx1 = 1 % listA.length;
      listA.delete(delIdx1);
      room2.history.undo();

      if (listB.length > 0) {
        listB.delete(0 % listB.length);
      }

      listA.push("ww");
      await control.flushA();

      const insIdx = 2 % Math.max(1, listA.length + 1);
      listA.insert("oH", insIdx);

      await control.flushB();
      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);

// Regression test: property test counterexample (shrunk).
test(
  "push/undo/redo/delete/set consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listB.push("lV");
      listB.push("Gg");
      await control.flushB();

      expect(listA.toImmutable()).toEqual(["lV", "Gg"]);
      expect(listB.toImmutable()).toEqual(["lV", "Gg"]);

      listB.push("cj");
      room2.history.undo();
      room1.history.undo();
      room2.history.undo();
      room2.history.redo();
      listA.push("mk");
      room2.history.redo();
      listB.delete(0);
      listB.set(1, "vk");

      expect(listB.toImmutable()).toEqual(["Gg", "vk"]);

      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);

// Regression test: property test counterexample (shrunk 4x).
test(
  "set/delete/redo consistency: B local ops then flush",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listB.insert("lO", 0);
      listB.set(0, "CC");
      listB.delete(0);
      listB.insert("Yf", 0);
      listB.set(0, "vX");
      room1.history.undo();
      if (listA.length > 0) {
        listA.delete(2 % listA.length);
      }
      listA.push("My");
      listA.set(0, "Pa");
      listB.delete(0);
      await control.flushA();
      room1.history.redo();
      room2.history.redo();

      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);

// Regression test: property test counterexample (shrunk to 10 steps).
// A's redo ACK for a CREATE_REGISTER re-creates a node that was remotely
// deleted, and the position it gets on A vs B diverges.
test(
  "push/undo/redo/flush/insert consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      // A.push("Vl")
      listA.push("Vl");
      // A.flush() — sync to B
      await control.flushA();
      // A.undo() — delete "Vl" locally
      room1.history.undo();
      // B.delete(1* → 0) — B deletes "Vl" (len=1, 1%1=0)
      if (listB.length > 0) listB.delete(0);
      // A.redo() — re-create "Vl" locally
      room1.history.redo();
      // B.flush() — sync B's delete to A (removes A's redo'd Vl)
      await control.flushB();
      // B.redo() — no-op (nothing to redo)
      room2.history.redo();
      // B.insert("Lu", 0* → 0)
      listB.insert("Lu", 0);
      // A.insert("Gn", 1* → 0) (A's list is empty → 1%max(1,0+1)=0)
      const gnIdx = 1 % Math.max(1, listA.length + 1);
      listA.insert("Gn", gnIdx);
      // A.redo() — no-op
      room1.history.redo();

      // Final sync
      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);

// Regression test: property test counterexample (shrunk).
test(
  "insert/push/delete/undo consistency with buffered ops and late flush",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, control }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listA.insert("PW", 0);
      listA.push("oX");
      listA.push("WC");
      listA.push("ho");
      listA.push("FY");
      listB.push("Hy");
      listA.delete(4);
      listA.push("bj");
      room1.history.undo();
      room1.history.undo();
      await control.flushB();
      listA.push("ao");
      const insIdx = 5 % (listA.length + 1);
      listA.insert("Fb", insIdx);

      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
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

      await control.flushA();
      await control.flushB();

      const finalA = listA.toImmutable();
      const finalB = listB.toImmutable();
      expect(finalA).toEqual(finalB);
    }
  )
);
