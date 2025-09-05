import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote move conflicts with move",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b", "c"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").move(0, 2);
      root2.get("list").move(1, 2);
      assert(
        { list: ["b", "c", "a"] }, //
        { list: ["a", "c", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "c", "a"] }, //
        { list: ["c", "a", "b"] }
      );

      await control.flushB();
      assert({ list: ["c", "a", "b"] });
    }
  )
);

test(
  "remote move conflicts with move via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b", "c"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").move(0, 2);
      root2.get("list").move(1, 2);
      root2.get("list").move(2, 1);
      room2.history.undo();
      assert(
        { list: ["b", "c", "a"] }, //
        { list: ["a", "c", "b"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "c", "a"] }, //
        { list: ["c", "a", "b"] }
      );

      await control.flushB();
      assert({ list: ["c", "a", "b"] });
    }
  )
);

test(
  "remote move conflicts with set",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("c");
      root2.get("list").set(2, "d");
      assert(
        { list: ["b", "a"] }, //
        { list: ["a", "b", "d"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "a"] }, //
        { list: ["b", "a", "d"] }
      );

      await control.flushB();
      assert({ list: ["b", "d"] });
    }
  )
);

test(
  "remote move conflicts with set via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, room2, control, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("c");
      root2.get("list").set(2, "d");
      root2.get("list").set(2, "E");
      room2.history.undo();
      assert(
        { list: ["b", "a"] }, //
        { list: ["a", "b", "d"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "a"] }, //
        { list: ["b", "a", "d"] }
      );

      await control.flushB();
      assert({ list: ["b", "d"] });
    }
  )
);

test(
  "remote move conflicts with delete",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").delete(0);
      assert(
        { list: ["b", "a"] }, //
        { list: ["b"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "a"] }, //
        { list: ["b"] }
      );

      await control.flushB();
      assert({ list: ["b"] });
    }
  )
);

test(
  "remote move conflicts with insert",
  prepareTestsConflicts(
    {
      list: new LiveList(["a", "b"]),
    },
    async ({ root1, root2, control, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("c");
      assert(
        { list: ["b", "a"] }, //
        { list: ["a", "b", "c"] }
      );

      await control.flushA();
      assert(
        { list: ["b", "a"] }, //
        { list: ["b", "a", "c"] }
      );

      await control.flushB();
      assert({ list: ["b", "a", "c"] });
    }
  )
);
