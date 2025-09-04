import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote set conflicts with a set",
  prepareTestsConflicts(
    {
      list: new LiveList(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "B");
      root2.get("list").set(0, "C");

      assert({ list: ["B"] }, { list: ["C"] });

      await wsUtils.flushSocket1Messages(); // Client A gets processed first
      assert({ list: ["B"] }, { list: ["B"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["C"] });
    }
  )
);

test(
  "remote set conflicts with a set (received in different order)",
  prepareTestsConflicts(
    {
      list: new LiveList(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "B");
      root2.get("list").set(0, "C");

      assert({ list: ["B"] }, { list: ["C"] });

      await wsUtils.flushSocket2Messages(); // Client B gets processed first
      assert({ list: ["C"] }, { list: ["C"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["B"] });
    }
  )
);

test(
  "remote set conflicts with a set via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["A"]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").set(0, "B");
      root2.get("list").set(0, "C");
      root2.get("list").set(0, "D");
      room2.history.undo();

      assert({ list: ["B"] }, { list: ["C"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C"] });
    }
  )
);

test(
  "remote set conflicts with an insert",
  prepareTestsConflicts(
    {
      list: new LiveList(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "B");
      root2.get("list").delete(0);
      root2.get("list").push("C");

      assert({ list: ["B"] }, { list: ["C"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "C"] });
    }
  )
);

test(
  "remote set conflicts with an insert via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a"]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").set(0, "b");
      root2.get("list").delete(0);
      room2.history.undo();

      assert({ list: ["b"] }, { list: ["a"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["b"] }, { list: ["b"] });

      await wsUtils.flushSocket2Messages();

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
    async ({ root1, root2, wsUtils, assert }) => {
      // Client A replaces "a" with "🟢"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a", and moves "c" to the front
      root2.get("list").delete(0);
      root2.get("list").move(1, 0);

      assert({ list: ["🟢", "b", "c"] }, { list: ["c", "b"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["🟢", "b", "c"] }, { list: ["🟢", "b"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["🟢", "c", "b"] });

      // Final state after conflict resolution:
      // - A was replaced by 🟢 (client A's change)
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
    async ({ root1, root2, room2, wsUtils, assert }) => {
      // Client A replaces "a" with "🟢"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a", and moves "c" to the front,
      // then to position 1, then undoes
      root2.get("list").delete(0);
      root2.get("list").move(1, 0);
      root2.get("list").move(0, 1);
      room2.history.undo();

      assert({ list: ["🟢", "b", "c"] }, { list: ["c", "b"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["🟢", "b", "c"] }, { list: ["🟢", "b"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["🟢", "c", "b"] });

      // Final state after conflict resolution:
      // - A was replaced by 🟢 (client A's change)
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
    async ({ root1, root2, wsUtils, assert }) => {
      // Client A replaces "a" with "X"
      root1.get("list").set(0, "🟢");

      // Client B simultaneously deletes "a"
      root2.get("list").delete(0);
      assert({ list: ["🟢"] }, { list: [] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["🟢"] }, { list: ["🟢"] });

      await wsUtils.flushSocket2Messages();
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
    async ({ root1, root2, wsUtils, assert }) => {
      // Client A changes "a" to "🟢" and moves it after "b"
      // This is done in a batch to ensure the default throttling won't
      // send the second operation in the message queue
      root1.get("list").set(0, "🟢");
      root1.get("list").move(0, 1);
      assert({ list: ["b", "🟢"] }, { list: ["a", "b"] });

      // Client B simultaneously changes "a" to "🌕"
      root2.get("list").set(0, "🌕");
      assert({ list: ["b", "🟢"] }, { list: ["🌕", "b"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["b", "🟢"] }, { list: ["b", "🟢"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["🌕", "b", "🟢"] });
    }
  )
);

test(
  "remote set conflicts with set + move",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "C");
      root2.get("list").set(0, "D");
      root2.get("list").move(0, 1);

      assert({ list: ["C", "B"] }, { list: ["B", "D"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["C", "B"] }, { list: ["C", "B", "D"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "D"] }, { list: ["B", "D"] });
    }
  )
);
