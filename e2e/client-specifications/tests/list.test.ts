import "regenerator-runtime/runtime";

import { LiveList } from "@liveblocks/client";
import { objectToJson, prepareTest, wait } from "./utils";
import isEqual from "lodash/isEqual";

describe("LiveList confict resolution", () => {
  test("push / push", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(),
      });

    await run(async () => {
      await assert({ list: [] });

      socketUtils.pauseAllSockets();

      root1.get("list").push("A"); // Client 1 pushes "A"
      root2.get("list").push("B"); // Client 2 pushes "B"

      await socketUtils.sendMessagesClient1(); // Client 1 push "A" sent to server

      await assertEach({ list: ["A"] }, { list: ["A", "B"] });

      await socketUtils.sendMessagesClient2(); // Client 2 push "B" sent to server

      await assert({ list: ["A", "B"] });
    });
  });

  test("move / set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root2.get("list").set(0, "C"); // Client2 replaces "A" by "C"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["C", "B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("move / delete", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root2.get("list").delete(0); // Client2 deletes "A"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["B"] });
    });
  });

  test("move / insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //     Client1 moves "A" after "B"
      root2.get("list").insert("C", 0); // Client2 insert "C" at index 0

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["C", "B", "A"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B", "A"] });
    });
  });

  test("move / move", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["B", "A"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["B", "A"] });
    });
  });

  test("set / delete", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
      root2.get("list").delete(0); //    Client2 deletes "A"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "B"] }, { list: ["C", "B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("set / insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //     Client1 sets "A" to "C"
      root2.get("list").insert("D", 0); //  Client2 inserts "D" at index 0

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "B"] }, { list: ["D", "C", "B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["D", "C", "B"] });
    });
  });

  describe("2 HOUSES GAME", () => {
    test("set / set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
        root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

        await socketUtils.sendMessagesClient1();

        await assertEach({ list: ["C", "B"] }, { list: ["C", "B"] }); // C(0.1) B(0.2)

        await socketUtils.sendMessagesClient2();

        // await assertConsistancy();
        await assert({ list: ["D", "B"] });
        // Client 2: B
      });
    });

    test("set + move / set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
        root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
        root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

        await socketUtils.sendMessagesClient1();

        // await assertEach({ list: ["B", "C"] }, { list: ["B", "C"] });

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
        // await assert({ list: ["D", "B", "C"] });
      });
    });

    test("set / set + move", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "C");
        root2.get("list").set(0, "D");
        root2.get("list").move(0, 1);

        await socketUtils.sendMessagesClient1();

        // await assertEach({ list: ["B", "C"] }, { list: ["B", "C"] });

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
        // await assert({ list: ["D", "B", "C"] });
      });
    });

    test("push + set / push + set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

      await run(async () => {
        await assert({ list: [] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("A");
        root1.get("list").set(0, "B");

        root2.get("list").push("C");
        root2.get("list").set(0, "D");

        console.log("INITIAL");

        // await assertEach({ list: ["B"] }, { list: ["D"] });

        console.log("INTERMEDIATE");

        await socketUtils.sendMessagesClient1();

        // await assertEach({ list: ["B"] }, { list: ["B", "D"] }); // B(0.1) D(0.2)

        console.log("FINISH");

        await socketUtils.sendMessagesClient2();

        // await assertConsistancy();
        await assert({ list: ["D"] });
      });
    });

    test("set / insert + set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

      await run(async () => {
        await assert({ list: ["A"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "B"); // B(0.1)
        root2.get("list").insert("C", 0);
        root2.get("list").set(0, "D");

        await assertEach({ list: ["B"] }, { list: ["D", "A"] });
        // 1: B(0.1)
        // 2: D(0.05) A(0.1)

        await socketUtils.sendMessagesClient1();

        await assertEach({ list: ["B"] }, { list: ["D", "B"] });

        await socketUtils.sendMessagesClient2();

        // 1: C(0.05) B(0.1) => D(0.05) B(0.1)
        // 2:

        // await assertConsistancy();
        await assert({ list: ["D", "B"] });
      });
    });
  });

  test("set / delete + push", async () => {
    const {
      root1,
      root2,
      assert,
      assertEach,
      assertConsistancy,
      socketUtils,
      run,
    } = await prepareTest<{
      list: LiveList<string>;
    }>({
      list: new LiveList(["A", "B"]),
    });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(1, "D");

      root2.get("list").delete(1);
      root2.get("list").push("C");

      await assertEach({ list: ["A", "D"] }, { list: ["A", "C"] });

      await socketUtils.sendMessagesClient1();

      // 1: A, D
      // 2: A, D

      await assertEach({ list: ["A", "D"] }, { list: ["A", "D"] });

      await socketUtils.sendMessagesClient2();

      // 1: A, D, C
      // 2: A, D, C

      // await assertConsistancy();
      await assert({ list: ["A", "D", "C"] }); // 1: A, D, C
    });
  });

  test("delete + push / set", async () => {
    const {
      root1,
      root2,
      assert,
      assertEach,
      assertConsistancy,
      socketUtils,
      run,
    } = await prepareTest<{
      list: LiveList<string>;
    }>({
      list: new LiveList(["A", "B"]),
    });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").delete(1);
      root1.get("list").push("C");

      root2.get("list").set(1, "D");

      await assertEach({ list: ["A", "C"] }, { list: ["A", "D"] });

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["A", "C"] }, { list: ["A", "C", "D"] });

      await socketUtils.sendMessagesClient2();

      // await assertConsistancy();
      await assert({ list: ["A", "D"] });
    });
  });

  test("set / delete + move", async () => {
    const {
      root1,
      root2,
      assert,
      assertEach,
      assertConsistancy,
      socketUtils,
      run,
    } = await prepareTest<{
      list: LiveList<string>;
    }>({
      list: new LiveList(["A", "B", "C"]),
    });

    await run(async () => {
      await assert({ list: ["A", "B", "C"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "D");

      root2.get("list").delete(0);
      root2.get("list").move(1, 0);

      await assertEach({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["D", "B", "C"] }, { list: ["D", "B"] });

      await socketUtils.sendMessagesClient2();

      // await assertConsistancy();
      await assert({ list: ["D", "B", "C"] }); // 2 missing C
    });
  });

  test("insert / move", async () => {});

  test("insert / delete", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

    await run(async () => {
      await assert({ list: [] });

      socketUtils.pauseAllSockets();

      root1.get("list").insert("A", 0);
      root1.get("list").delete(0);

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: [] }, { list: [] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: [] });
    });
  });

  test("insert / set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").insert("C", 0); // Client1 inserts "C" at index 0
      root2.get("list").set(0, "D"); //    Client2 sets "A" to "D"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "A", "B"] }, { list: ["C", "D", "B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "D", "B"] });
    });
  });

  test("insert / insert", async () => {});

  test("delete / move", async () => {});

  test("delete / insert", async () => {});

  test("delete / set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").delete(0); //   Client1 deletes "A"
      root2.get("list").set(0, "C"); // Client2 sets "A" to "C"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["C", "B"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("delete / delete", async () => {});

  test("set + move / move + move", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
      root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "B" after "A"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "C"] }, { list: ["C", "B"] }); // A(0.3), B(0.4) => C(0.1),B(0.4) => C(0.3),B(0.4)

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("delete + insert / set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

    await run(async () => {
      await assert({ list: ["A"] });

      socketUtils.pauseAllSockets();

      root1.get("list").delete(0);
      root1.get("list").insert("B", 0);
      root2.get("list").set(0, "C");

      await await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["B", "C"] });

      await await socketUtils.sendMessagesClient2();

      await assert({ list: ["C"] });
    });
  });

  test("set / delete + insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

    await run(async () => {
      await assert({ list: ["A"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C");
      root2.get("list").delete(0);
      root2.get("list").insert("B", 0);

      await await socketUtils.sendMessagesClient1();

      // await assertEach({ list: ["C"] }, { list: ["C", "B"] }); // 2: B(0.1) => C(0.1)

      await await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
      // 1: C(0.1) => C(0.1) B(0.2)
      // 2: C
    });
  });

  test("move + move / move + set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root1.get("list").move(0, 1); //  Client1 moves "B" after "A"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").set(0, "C"); //  Client2 sets "B" to "C"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["A", "B"] }, { list: ["C", "A"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "A"] });
    });
  });

  test("set + move / move + set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //  Client1 moves "A" after "B"
      root1.get("list").move(0, 1); //  Client1 moves "B" after "A"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").set(0, "D"); //  Client2 sets "B" to "C"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["A", "B"] }, { list: ["C", "A"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "A"] });
    });
  });

  test.skip("insert + delete / insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

    await run(async () => {
      await assert({ list: [] });

      socketUtils.pauseAllSockets();

      root1.get("list").insert("A", 0);
      root1.get("list").delete(0);
      root2.get("list").insert("B", 0);

      await assertEach({ list: [] }, { list: ["B"] });

      await socketUtils.sendMessagesClient1();
      await wait(2000);

      await assertEach({ list: [] }, { list: ["B"] }); // B(0.1) => A(0.1) B(0.2) => B(0.2)

      await socketUtils.sendMessagesClient2();

      await wait(2000);

      await assert({ list: ["B"] }); // Client 1: B(0,1) // Client 2:  B(0.2)

      // root2.get("list").insert("C", 0); // Client 2: C(0.1) B(0.2)

      // await wait(2000);

      // console.log("after 3");

      // await assertEach({ list: ["B", "C"] }, { list: ["C", "B"] });
    });
  });

  test("set + delete / move + insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C");
      root1.get("list").delete(0);
      root2.get("list").move(0, 1);
      root2.get("list").insert("D", 0);

      await assertEach({ list: ["B"] }, { list: ["D", "B", "A"] });

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["B"] }); // D(0.1), B(0.2), A(0.3) => D,B =>  C(0.1), D(0.15), B(0.2) => D(0.15), B(0.2)

      await socketUtils.sendMessagesClient2();

      await wait(2000);

      await assert({ list: ["D", "B"] });
    });
  });

  test("push + delete / push", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

    await run(async () => {
      await assert({ list: [] });

      await wait(2000);

      socketUtils.pauseAllSockets();

      root1.get("list").push("A");
      root1.get("list").delete(0);

      root2.get("list").push("B");

      await assertEach({ list: [] }, { list: ["B"] });

      await socketUtils.sendMessagesClient1();

      await wait(2000);

      await assertEach({ list: [] }, { list: ["B"] }); // B(0.2)

      await socketUtils.sendMessagesClient2();
      await wait(2000);

      await assert({ list: ["B"] });

      // B positions are not the same on both clients
    });
  });

  // describe("all combinations 2 operations each", () => {
  //   const client1FirstActions = [
  //     { type: "set", index: 0, value: "C1S" },
  //     { type: "move", index: 0, target: 1 },
  //     { type: "insert", index: 0, value: "C1I" },
  //   ];
  //   const client1SecondActions = [
  //     { type: "set", index: 0, value: "C1S2" },
  //     { type: "delete", index: 0 },
  //     { type: "move", index: 0, target: 1 },
  //     { type: "insert", index: 0, value: "C1I2" },
  //     { type: "none" },
  //   ];
  //   const client2FirstActions = [
  //     { type: "set", index: 0, value: "C2S" },
  //     { type: "move", index: 0, target: 1 },
  //     { type: "insert", index: 0, value: "C2I" },
  //   ];
  //   const client2SecondActions = [
  //     { type: "set", index: 0, value: "C2S2" },
  //     { type: "delete", index: 0 },
  //     { type: "move", index: 0, target: 1 },
  //     { type: "insert", index: 0, value: "C2I2" },
  //     { type: "none" },
  //   ];

  //   for (const client1FirstAction of client1FirstActions) {
  //     for (const client1SecondAction of client1SecondActions) {
  //       for (const client2FirstAction of client2FirstActions) {
  //         for (const client2SecondAction of client2SecondActions) {
  //           const name = `${client1FirstAction.type},${client1SecondAction.type} / ${client2FirstAction.type},${client2SecondAction.type}`;
  //           it(
  //             "Test: " + name,
  //             async () => {
  //               console.log(name);

  //               const { root1, root2, assert, socketUtils, run } =
  //                 await prepareTest<{
  //                   list: LiveList<string>;
  //                 }>({
  //                   list: new LiveList(["A", "B"]),
  //                 });

  //               await run(async () => {
  //                 await assert({ list: ["A", "B"] });

  //                 socketUtils.pauseAllSockets();

  //                 const rootActionList = [
  //                   { action: client1FirstAction, root: root1 },
  //                   { action: client1SecondAction, root: root1 },
  //                   { action: client2FirstAction, root: root2 },
  //                   { action: client2SecondAction, root: root2 },
  //                 ];

  //                 for (const { root, action } of rootActionList) {
  //                   switch (action.type) {
  //                     case "set":
  //                       root.get("list").set(action.index!, action.value!);
  //                       break;
  //                     case "delete":
  //                       root.get("list").delete(action.index!);
  //                       break;
  //                     case "move":
  //                       root.get("list").move(action.index!, action.target!);
  //                       break;
  //                     case "insert":
  //                       root.get("list").insert(action.value!, action.index!);
  //                       break;
  //                   }
  //                 }

  //                 await socketUtils.sendMessagesClient1();

  //                 await wait(500);

  //                 console.log("Temp client 1: ", objectToJson(root1));
  //                 console.log("Temp client 2: ", objectToJson(root2));

  //                 await socketUtils.sendMessagesClient2();

  //                 await wait(500);

  //                 const client1Json = objectToJson(root1);
  //                 const client2Json = objectToJson(root2);

  //                 console.log("Final client 1: ", objectToJson(root1));
  //                 console.log("Final client 2: ", objectToJson(root2));

  //                 expect(isEqual(client1Json, client2Json)).toBeTruthy();
  //               });
  //             },
  //             10000
  //           );
  //         }
  //       }
  //     }
  //   }
  // });
});

describe("LiveList conflicts", () => {
  describe("insert conflicts", () => {
    test("remote insert conflicts with another insert", async () => {
      const { root1, root2, assert, assertEach, socketUtils, run } =
        await prepareTest<{
          list: LiveList<string>;
        }>({
          list: new LiveList(),
        });

      await run(async () => {
        await assert({ list: [] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("A");
        root2.get("list").push("B");

        await assertEach({ list: ["A"] }, { list: ["B"] });

        await socketUtils.sendMessagesClient1();

        await assertEach({ list: ["A"] }, { list: ["A", "B"] });

        await socketUtils.sendMessagesClient2();

        await assert({ list: ["A", "B"] });
      });
    });

    test("remote insert conflicts with another insert introduced by undo", async () => {
      const { root1, root2, room2, assert, assertEach, socketUtils, run } =
        await prepareTest<{
          list: LiveList<string>;
        }>({
          list: new LiveList(),
        });

      await run(async () => {
        await assert({ list: [] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("A");

        root2.get("list").push("B");
        root2.get("list").delete(0);
        room2.history.undo();

        await assertEach({ list: ["A"] }, { list: ["B"] });

        await socketUtils.sendMessagesClient1();

        await assertEach({ list: ["A"] }, { list: ["A", "B"] });

        await socketUtils.sendMessagesClient2();

        await assert({ list: ["A", "B"] });
      });
    });

    test("remote insert conflicts with a move", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        assertConsistancy,
        socketUtils,
        run,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("C");
        root2.get("list").move(0, 1);

        await assertEach({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote insert conflicts with a move via undo", async () => {
      const {
        root1,
        root2,
        room2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("C");
        root2.get("list").move(0, 1);
        root2.get("list").move(1, 0);
        room2.history.undo();

        await assertEach({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote insert conflicts with a set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(),
      });

      await run(async () => {
        await assert({ list: [] });

        socketUtils.pauseAllSockets();

        root1.get("list").push("A");
        root2.get("list").push("B");
        root2.get("list").set(0, "C");

        await assertEach({ list: ["A"] }, { list: ["C"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });
  });

  describe("set conflicts", () => {
    test("remote set conflicts with a set", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

      await run(async () => {
        await assert({ list: ["A"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "B");
        root2.get("list").set(0, "C");

        await assertEach({ list: ["B"] }, { list: ["C"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote set conflicts with a set via undo", async () => {
      const {
        root1,
        root2,
        room2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

      await run(async () => {
        await assert({ list: ["A"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "B");
        root2.get("list").set(0, "C");
        root2.get("list").set(0, "D");
        room2.history.undo();

        await assertEach({ list: ["B"] }, { list: ["C"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote set conflicts with an insert", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

      await run(async () => {
        await assert({ list: ["A"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "B");
        root2.get("list").delete(0);
        root2.get("list").push("C");

        await assertEach({ list: ["B"] }, { list: ["C"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote set conflicts with an insert via undo", async () => {
      const {
        root1,
        root2,
        room2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

      await run(async () => {
        await assert({ list: ["A"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "B");
        root2.get("list").delete(0);
        room2.history.undo();

        await assertEach({ list: ["B"] }, { list: ["A"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote set conflicts with move", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B", "C"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B", "C"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "D");
        root2.get("list").delete(0);
        root2.get("list").move(1, 0);

        await assertEach({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote set conflicts with move via undo", async () => {
      const {
        root1,
        root2,
        room2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B", "C"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B", "C"] });

        socketUtils.pauseAllSockets();

        root1.get("list").set(0, "D");
        root2.get("list").delete(0);
        root2.get("list").move(1, 0);
        root2.get("list").move(0, 1);
        room2.history.undo();

        await assertEach({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });
  });

  describe("move conflicts", () => {
    test("remote move conflicts with move", async () => {
      const {
        root1,
        root2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").move(0, 1);
        root2.get("list").move(0, 1);

        await assertEach({ list: ["B", "A"] }, { list: ["B", "A"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });

    test("remote move conflicts with move via undo", async () => {
      const {
        root1,
        root2,
        room2,
        assert,
        assertEach,
        socketUtils,
        run,
        assertConsistancy,
      } = await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

      await run(async () => {
        await assert({ list: ["A", "B"] });

        socketUtils.pauseAllSockets();

        root1.get("list").move(0, 1);

        root2.get("list").move(0, 1);
        room2.history.undo();
        room2.history.redo();

        await assertEach({ list: ["B", "A"] }, { list: ["B", "A"] });

        await socketUtils.sendMessagesClient1();

        await socketUtils.sendMessagesClient2();

        await assertConsistancy();
      });
    });
  });

  describe("delete conflicts", () => {
    // TODO
  });
});
