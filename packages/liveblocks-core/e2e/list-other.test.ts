import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "push + set / push + set",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ room1, room2, root1, root2, control, assert }) => {
      // Client A pushes "oops" and then immediately corrects it to "a"
      room1.batch(() => {
        root1.get("list").push("oops");
        root1.get("list").set(0, "a");
      });

      // Client B pushes "oops, too" and then immediately corrects it to "b"
      room2.batch(() => {
        root2.get("list").push("oops, too");
        root2.get("list").set(0, "b");
      });
      assert(
        { list: ["a"] }, //
        { list: ["b"] }
      );

      await control.flushA();
      assert(
        { list: ["a"] }, //
        { list: ["a", "b"] }
      );

      await control.flushB();
      assert({ list: ["b"] });
    }
  )
);

test(
  "set / insert + set",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a"]) },

    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").insert("c", 0);
      root2.get("list").set(0, "🟢");
      assert(
        { list: ["b"] }, //
        { list: ["🟢", "a"] }
      );

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["🟢", "b"] }
      );

      await control.flushB();
      assert({ list: ["🟢", "b"] });
    }
  )
);

test(
  "delete + push / set",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a", "b"]) },

    async ({ root1, root2, control, assert }) => {
      // Client A deletes "b" and then pushes "🟢"
      root1.get("list").delete(1);
      root1.get("list").push("🟢");
      // Client B sets "b" to "🌕"
      root2.get("list").set(1, "🌕");
      assert(
        { list: ["a", "🟢"] }, //
        { list: ["a", "🌕"] }
      );

      await control.flushA();
      assert(
        { list: ["a", "🟢"] }, //
        { list: ["a", "🟢", "🌕"] }
      );

      await control.flushB();
      assert({ list: ["a", "🌕"] });
    }
  )
);

test(
  "set + move / move + move",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a", "b"]) },

    async ({ root1, root2, control, assert }) => {
      // Client A changes "a" to "🟢" and then moves it after "b"
      root1.get("list").set(0, "🟢");
      root1.get("list").move(0, 1);

      // Client B swaps "a" and "b" and then swaps it back again
      root2.get("list").move(0, 1);
      root2.get("list").move(0, 1);
      assert(
        { list: ["b", "🟢"] }, //
        { list: ["a", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "🟢"] }, //
        { list: ["🟢", "b"] }
      );

      await control.flushB();
      assert({ list: ["🟢", "b"] });
    }
  )
);

test(
  "delete + insert / set",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a"]) },

    async ({ root1, root2, control, assert }) => {
      // Client A deletes "a" and then inserts "b" at front
      root1.get("list").delete(0);
      root1.get("list").insert("b", 0);

      // Client B changes "a" to "🟢"
      root2.get("list").set(0, "🟢");

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["b", "🟢"] }
      );

      await control.flushB();
      assert({ list: ["🟢"] });
    }
  )
);

test(
  "set / delete + insert",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a"]) },

    async ({ root1, root2, control, assert }) => {
      // Client A changes "a" to "🟢"
      root1.get("list").set(0, "🟢");

      // Client B deletes "a" and then inserts "b" at front
      root2.get("list").delete(0);
      root2.get("list").insert("b", 0);

      await control.flushA();
      assert(
        { list: ["🟢"] }, //
        { list: ["🟢"] } // Note: "b" momentarily disappears from client B
      );

      await control.flushB();
      assert({ list: ["🟢", "b"] });
    }
  )
);

test(
  "move + move / move + set",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a", "b"]) },

    async ({ root1, root2, control, assert }) => {
      // Client A swaps "a" and "b" and then swaps them back again
      root1.get("list").move(0, 1);
      root1.get("list").move(0, 1);

      // Client B moves "a" after "b" and then sets "b" to "🟢"
      root2.get("list").move(0, 1);
      root2.get("list").set(0, "🟢");

      await control.flushA();
      assert(
        { list: ["a", "b"] }, //
        { list: ["🟢", "a"] }
      );

      await control.flushB();
      assert({ list: ["🟢", "a"] });
    }
  )
);

test(
  "set + move / move + set",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a", "b"]) },

    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "c");
      root1.get("list").move(0, 1);
      root2.get("list").move(0, 1);
      root2.get("list").set(0, "🌕");

      await control.flushA();
      assert(
        { list: ["b", "c"] }, //
        { list: ["🌕", "c"] }
      );

      await control.flushB();
      assert({ list: ["🌕", "c"] });
    }
  )
);

test(
  "insert + delete / insert",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, control, assert }) => {
      // Client A inserts "a" at position 0 and then deletes it
      root1.get("list").insert("a", 0);
      root1.get("list").delete(0);

      // Client B inserts "b" at position 0
      root2.get("list").insert("b", 0);
      assert(
        { list: [] }, //
        { list: ["b"] }
      );

      await control.flushA();
      assert(
        { list: [] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["b"] });
    }
  )
);

test(
  "set + delete / move + insert",
  prepareTestsConflicts(
    { list: new LiveList<string>(["a", "b"]) },

    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "c");
      root1.get("list").delete(0);
      root2.get("list").move(0, 1);
      root2.get("list").insert("d", 0);
      assert(
        { list: ["b"] }, //
        { list: ["d", "b", "a"] }
      );

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["b"] }
      ); // D(0.1), B(0.2), A(0.3) => D,B =>  C(0.1), D(0.15), B(0.2) => D(0.15), B(0.2)

      await control.flushB();
      assert({ list: ["d", "b"] });
    }
  )
);

test(
  "push + delete / push",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, control, assert }) => {
      root1.get("list").push("a");
      root1.get("list").delete(0);

      root2.get("list").push("b");
      assert(
        { list: [] }, //
        { list: ["b"] }
      );

      await control.flushA();
      assert(
        { list: [] }, //
        { list: ["b"] }
      ); // B(0.2)

      await control.flushB();
      assert({ list: ["b"] });
    }
  )
);

test(
  "remote insert conflicts with another insert via undo",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").push("a");
      root2.get("list").push("b");
      root2.get("list").delete(0);
      room2.history.undo();
      assert(
        { list: ["a"] }, //
        { list: ["b"] }
      );

      await control.flushA();
      assert(
        { list: ["a"] }, //
        { list: ["a", "b"] }
      );

      await control.flushB();
      assert({ list: ["a", "b"] });
    }
  )
);

test(
  "undo insert + redo insert / delete",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, control, assert }) => {
      root1.get("list").push("a");

      await control.flushA();
      assert(
        { list: ["a"] }, //
        { list: ["a"] }
      );

      room1.history.undo();
      room1.history.redo();

      root2.get("list").delete(0);
      assert(
        { list: ["a"] }, //
        { list: [] }
      );

      await control.flushA();
      assert(
        { list: ["a"] }, //
        { list: ["a"] }
      );

      await control.flushB();
      assert({ list: [] });
    }
  )
);
