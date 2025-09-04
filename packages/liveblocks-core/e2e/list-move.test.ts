import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote move conflicts with move",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B", "C"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").move(0, 2);
      root2.get("list").move(1, 2);

      assert({ list: ["B", "C", "A"] }, { list: ["A", "C", "B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "C", "A"] }, { list: ["C", "A", "B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C", "A", "B"] });
    }
  )
);

test(
  "remote move conflicts with move via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B", "C"]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").move(0, 2);
      root2.get("list").move(1, 2);
      root2.get("list").move(2, 1);
      room2.history.undo();

      assert({ list: ["B", "C", "A"] }, { list: ["A", "C", "B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "C", "A"] }, { list: ["C", "A", "B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C", "A", "B"] });
    }
  )
);

test(
  "remote move conflicts with set",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("C");
      root2.get("list").set(2, "D");

      assert({ list: ["B", "A"] }, { list: ["A", "B", "D"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "A"] }, { list: ["B", "A", "D"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "D"] });
    }
  )
);

test(
  "remote move conflicts with set via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("C");
      root2.get("list").set(2, "D");
      root2.get("list").set(2, "E");
      room2.history.undo();

      assert({ list: ["B", "A"] }, { list: ["A", "B", "D"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "A"] }, { list: ["B", "A", "D"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "D"] });
    }
  )
);

test(
  "remote move conflicts with delete",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").delete(0);

      assert({ list: ["B", "A"] }, { list: ["B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "A"] }, { list: ["B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B"] });
    }
  )
);

test(
  "remote move conflicts with insert",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").move(0, 1);
      root2.get("list").push("C");

      assert({ list: ["B", "A"] }, { list: ["A", "B", "C"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "A"] }, { list: ["B", "A", "C"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "A", "C"] });
    }
  )
);
