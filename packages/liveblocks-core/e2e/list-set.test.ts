import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote set conflicts with a set",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").set(0, "c");
      assert(
        { list: ["b"] }, //
        { list: ["c"] }
      );

      await control.flushA(); // Client A gets processed first
      assert(
        { list: ["b"] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["c"] });
    }
  )
);

test(
  "remote set conflicts with a set (received in different order)",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").set(0, "c");
      assert(
        { list: ["b"] }, //
        { list: ["c"] }
      );

      await control.flushB(); // Client B gets processed first
      assert(
        { list: ["c"] }, //
        { list: ["c"] }
      );

      await control.flushA();
      assert({ list: ["b"] });
    }
  )
);

test(
  "remote set conflicts with a set via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").set(0, "c");
      root2.get("list").set(0, "d");
      room2.history.undo();
      assert(
        { list: ["b"] }, //
        { list: ["c"] }
      );

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["c"] });
    }
  )
);

test(
  "remote set conflicts with an insert",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").delete(0);
      root2.get("list").push("c");
      assert(
        { list: ["b"] }, //
        { list: ["c"] }
      );

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["b", "c"] });
    }
  )
);

test(
  "remote set conflicts with an insert via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").delete(0);
      room2.history.undo();
      assert(
        { list: ["b"] }, //
        { list: ["a"] }
      );

      await control.flushA();
      assert(
        { list: ["b"] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["b", "a"] });
    }
  )
);

test(
  "remote set conflicts with move",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b", "c"]),
    },
    async ({ root1, root2, control, assert }) => {
      // Client A replaces "a" with "🟢"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a", and moves "c" to the front
      root2.get("list").delete(0);
      root2.get("list").move(1, 0);
      assert(
        { list: ["🟢", "b", "c"] }, //
        { list: ["c", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["🟢", "b", "c"] }, //
        { list: ["🟢", "b"] }
      );

      await control.flushB();
      assert({ list: ["🟢", "c", "b"] });

      // Final state after conflict resolution:
      // - a was replaced by 🟢 (client A's change)
      // - c was moved to the front (client B's change)
    }
  )
);

test(
  "remote set conflicts with move via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b", "c"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      // Client A replaces "a" with "🟢"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a", and moves "c" to the front,
      // then to position 1, then undoes
      root2.get("list").delete(0);
      root2.get("list").move(1, 0);
      root2.get("list").move(0, 1);
      room2.history.undo();
      assert(
        { list: ["🟢", "b", "c"] }, //
        { list: ["c", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["🟢", "b", "c"] }, //
        { list: ["🟢", "b"] }
      );

      await control.flushB();
      assert({ list: ["🟢", "c", "b"] });

      // Final state after conflict resolution:
      // - a was replaced by 🟢 (client A's change)
      // - c was moved to the front (client B's change)
    }
  )
);

test(
  "remote set conflicts with delete",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, control, assert }) => {
      // Client A replaces "a" with "X"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a"
      root2.get("list").delete(0);
      assert(
        { list: ["🟢"] }, //
        { list: [] }
      );

      await control.flushA();
      assert(
        { list: ["🟢"] }, //
        { list: ["🟢"] }
      );

      await control.flushB();
      assert({ list: ["🟢"] });
    }
  )
);

test(
  "remote set + move conflicts with set",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      // Client A changes "a" to "🟢" and moves it after "b"
      // This is done in a batch to ensure the default throttling won't
      // send the second operation in the message queue
      root1.get("list").set(0, "🟢");
      root1.get("list").move(0, 1);
      assert(
        { list: ["b", "🟢"] }, //
        { list: ["a", "b"] }
      );

      // Client B simultaneously changes "a" to "🌕"
      root2.get("list").set(0, "🌕");
      assert(
        { list: ["b", "🟢"] }, //
        { list: ["🌕", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "🟢"] }, //
        { list: ["b", "🟢"] }
      );

      await control.flushB();
      assert({ list: ["🌕", "b", "🟢"] });
    }
  )
);

test(
  "remote set conflicts with set + move",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").set(0, "c");
      root2.get("list").set(0, "d");
      root2.get("list").move(0, 1);
      assert(
        { list: ["c", "b"] }, //
        { list: ["b", "d"] }
      );

      await control.flushA();
      assert(
        { list: ["c", "b"] }, //
        { list: ["c", "b", "d"] }
      );

      await control.flushB();
      assert(
        { list: ["b", "d"] }, //
        { list: ["b", "d"] }
      );
    }
  )
);
