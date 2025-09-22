import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote insert conflicts with another insert",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").push("a");
      root2.get("list").push("b");

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
  "remote insert conflicts with move",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").push("✨"); // Client A inserts "✨"
      root2.get("list").move(0, 1); // Client B moves "a" after "b"
      assert(
        { list: ["a", "b", "✨"] }, //
        { list: ["b", "a"] }
      );

      await control.flushA();
      assert(
        { list: ["a", "b", "✨"] }, //
        { list: ["b", "✨", "a"] }
      );

      await control.flushB();
      assert({ list: ["b", "✨", "a"] });
    }
  )
);

test(
  "remote insert conflicts with move via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").push("c");
      root2.get("list").move(0, 1);
      root2.get("list").move(1, 0);
      room2.history.undo();
      assert(
        { list: ["a", "b", "c"] }, //
        { list: ["b", "a"] }
      );

      await control.flushA();
      assert(
        { list: ["a", "b", "c"] }, //
        { list: ["b", "c", "a"] }
      );

      await control.flushB();
      assert({ list: ["b", "c", "a"] });
    }
  )
);

test(
  "remote insert conflicts with set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").push("a");
      root2.get("list").push("b");
      root2.get("list").set(0, "c");
      assert(
        { list: ["a"] }, //
        { list: ["c"] }
      );

      await control.flushA();
      assert(
        { list: ["a"] }, //
        { list: ["a", "c"] }
      );

      await control.flushB();
      assert({ list: ["c"] });
    }
  )
);
