import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "remote insert conflicts with another insert",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").push("A");
      root2.get("list").push("B");

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A"] }, { list: ["A", "B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["A", "B"] });
    }
  )
);

test(
  "remote insert conflicts with move",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").push("C");
      root2.get("list").move(0, 1);

      assert({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A", "B", "C"] }, { list: ["B", "C", "A"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B", "C", "A"] });
    }
  )
);

test(
  "remote insert conflicts with move via undo",
  prepareTestsConflicts(
    {
      list: new LiveList(["A", "B"]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").push("C");
      root2.get("list").move(0, 1);
      root2.get("list").move(1, 0);
      room2.history.undo();
      assert({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["A", "B", "C"] }, { list: ["B", "C", "A"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["B", "C", "A"] });
    }
  )
);

test(
  "remote insert conflicts with set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").push("A");
      root2.get("list").push("B");
      root2.get("list").set(0, "C");
      assert({ list: ["A"] }, { list: ["C"] });

      await wsUtils.flushSocket1Messages();
      assert({ list: ["A"] }, { list: ["A", "C"] });

      await wsUtils.flushSocket2Messages();
      assert({ list: ["C"] });
    }
  )
);
