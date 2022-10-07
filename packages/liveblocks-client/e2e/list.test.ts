import { lsonToJson } from "../src/immutable";
import { LiveList } from "../src/LiveList";
import type { Json } from "../src/types";
import { prepareSingleClientTest, prepareTestsConflicts } from "./utils";

describe.skip("LiveList conflicts", () => {
  describe("insert conflicts", () => {
    test(
      "remote insert conflicts with another insert",
      prepareTestsConflicts(
        {
          list: new LiveList(),
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

    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7317877322?check_suite_focus=true#step:6:52
    test.skip(
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

    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7317877322?check_suite_focus=true#step:6:67
    test.skip(
      "remote insert conflicts with set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
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
  });

  describe("set conflicts", () => {
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

          await wsUtils.flushSocket1Messages();

          assert({ list: ["B"] }, { list: ["B"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["C"] });
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
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, room2, wsUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").delete(0);
          room2.history.undo();

          assert({ list: ["B"] }, { list: ["A"] });

          await wsUtils.flushSocket1Messages();

          assert({ list: ["B"] }, { list: ["B"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["B", "A"] });
        }
      )
    );

    test(
      "remote set conflicts with move",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, wsUtils, assert }) => {
          root1.get("list").set(0, "D");
          root2.get("list").delete(0);
          root2.get("list").move(1, 0);

          assert({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

          await wsUtils.flushSocket1Messages();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
        }
      )
    );

    test(
      "remote set conflicts with move via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, room2, wsUtils, assert }) => {
          root1.get("list").set(0, "D");
          root2.get("list").delete(0);
          root2.get("list").move(1, 0);
          root2.get("list").move(0, 1);
          room2.history.undo();

          assert({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

          await wsUtils.flushSocket1Messages();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
        }
      )
    );

    test(
      "remote set conflicts with delete",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, wsUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").delete(0);

          assert({ list: ["B"] }, { list: [] });

          await wsUtils.flushSocket1Messages();

          assert({ list: ["B"] }, { list: ["B"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["B"] }, { list: ["B"] });
        }
      )
    );

    test(
      "remote set + move conflicts with set",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, wsUtils, assert }) => {
          root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
          root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
          root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

          assert({ list: ["B", "C"] }, { list: ["D", "B"] });

          await wsUtils.flushSocket1Messages();

          assert({ list: ["B", "C"] }, { list: ["B", "C"] });

          await wsUtils.flushSocket2Messages();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
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
  });

  describe("move conflicts", () => {
    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7278337421?check_suite_focus=true#step:6:52
    test.skip(
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
  });

  describe("other combinations", () => {
    test(
      "push + set / push + set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
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

    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7278546989?check_suite_focus=true#step:6:52
    test.skip(
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

    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7278076193?check_suite_focus=true#step:6:52
    test.skip(
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

    // TODO: This test is flaky and occasionally fails in CI--make it more robust
    // See https://github.com/liveblocks/liveblocks/runs/7278546989?check_suite_focus=true#step:6:79
    test.skip(
      "insert + delete / insert",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
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
          list: new LiveList(),
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
          list: new LiveList(),
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
  });
});

describe("LiveList single client", () => {
  test(
    "fast consecutive sets on same index",
    prepareSingleClientTest(
      {
        list: new LiveList(["A"]),
      },
      async ({ root, flushSocketMessages, room }) => {
        const states: Json[] = [];
        room.subscribe(root, () => states.push(lsonToJson(root)), {
          isDeep: true,
        });

        root.get("list").set(0, "B");
        root.get("list").set(0, "C");

        await flushSocketMessages();

        expect(states).toEqual([{ list: ["B"] }, { list: ["C"] }]);
      }
    )
  );
});
