import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

test(
  "push + set / push + set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").push("A");
      root1.get("list").set(0, "B");

      root2.get("list").push("C");
      root2.get("list").set(0, "D");

      assert({ list: ["B"] }, { list: ["D"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["B", "D"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["D"] });
    }
  )
);

test(
  "set / insert + set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "B");
      root2.get("list").insert("C", 0);
      root2.get("list").set(0, "D");

      assert({ list: ["B"] }, { list: ["D", "A"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["D", "B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["D", "B"] });
    }
  )
);

test(
  "delete + push / set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").delete(1);
      root1.get("list").push("C");
      root2.get("list").set(1, "D");

      assert({ list: ["A", "C"] }, { list: ["A", "D"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A", "C"] }, { list: ["A", "C", "D"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["A", "D"] });
    }
  )
);

test(
  "set + move / move + move",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
      root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "B" after "A"

      assert({ list: ["B", "C"] }, { list: ["A", "B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "C"] }, { list: ["C", "B"] }); // A(0.3), B(0.4) => C(0.1),B(0.4) => C(0.3),B(0.4)

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C", "B"] });
    }
  )
);

test(
  "delete + insert / set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").delete(0);
      root1.get("list").insert("B", 0);
      root2.get("list").set(0, "C");

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["B", "C"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C"] });
    }
  )
);

test(
  "set / delete + insert",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "C");
      root2.get("list").delete(0);
      root2.get("list").insert("B", 0);

      await wsUtils.flushSocket1Messages();

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C", "B"] });
    }
  )
);

test(
  "move + move / move + set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root1.get("list").move(0, 1); //  Client1 moves "B" after "A"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").set(0, "C"); //  Client2 sets "B" to "C"

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A", "B"] }, { list: ["C", "A"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["C", "A"] });
    }
  )
);

test(
  "set + move / move + set",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "C");
      root1.get("list").move(0, 1);
      root2.get("list").move(0, 1);
      root2.get("list").set(0, "D");

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B", "C"] }, { list: ["D", "C"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["D", "C"] });
    }
  )
);

test(
  "insert + delete / insert",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").insert("A", 0);
      root1.get("list").delete(0);
      root2.get("list").insert("B", 0);

      assert({ list: [] }, { list: ["B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: [] }, { list: ["B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B"] });
    }
  )
);

test(
  "set + delete / move + insert",
  prepareTestsConflicts(
    {
      list: new LiveList<string>(["A", "B"]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").set(0, "C");
      root1.get("list").delete(0);
      root2.get("list").move(0, 1);
      root2.get("list").insert("D", 0);

      assert({ list: ["B"] }, { list: ["D", "B", "A"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["B"] }, { list: ["B"] }); // D(0.1), B(0.2), A(0.3) => D,B =>  C(0.1), D(0.15), B(0.2) => D(0.15), B(0.2)

      await wsUtils.flushSocket2Messages();

      assert({ list: ["D", "B"] });
    }
  )
);

test(
  "push + delete / push",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("list").push("A");
      root1.get("list").delete(0);

      root2.get("list").push("B");

      assert({ list: [] }, { list: ["B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: [] }, { list: ["B"] }); // B(0.2)

      await wsUtils.flushSocket2Messages();

      assert({ list: ["B"] });
    }
  )
);

test(
  "remote insert conflicts with another insert via undo",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, room2, wsUtils, assert }) => {
      root1.get("list").push("A");
      root2.get("list").push("B");
      root2.get("list").delete(0);
      room2.history.undo();

      assert({ list: ["A"] }, { list: ["B"] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A"] }, { list: ["A", "B"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: ["A", "B"] });
    }
  )
);

test(
  "undo insert + redo insert / delete",
  prepareTestsConflicts(
    {
      list: new LiveList<string>([]),
    },
    async ({ root1, root2, room1, wsUtils, assert }) => {
      root1.get("list").push("A");

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A"] }, { list: ["A"] });

      room1.history.undo();
      room1.history.redo();

      root2.get("list").delete(0);

      assert({ list: ["A"] }, { list: [] });

      await wsUtils.flushSocket1Messages();

      assert({ list: ["A"] }, { list: ["A"] });

      await wsUtils.flushSocket2Messages();

      assert({ list: [] });
    }
  )
);
