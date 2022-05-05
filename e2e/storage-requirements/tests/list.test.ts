import "regenerator-runtime/runtime";

import { LiveList } from "@liveblocks/client";
import { prepareTest } from "./utils";

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

      socketUtils.sendMessagesClient1(); // Client 1 push "A" sent to server

      await assertEach({ list: ["A"] }, { list: ["A", "B"] });

      socketUtils.sendMessagesClient2(); // Client 2 push "B" sent to server

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["C", "B"] });

      socketUtils.sendMessagesClient2();

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["B"] });

      socketUtils.sendMessagesClient2();

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["C", "B", "A"] });

      socketUtils.sendMessagesClient2();

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "A"] }, { list: ["B", "A"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["B", "A"] });
    });
  });

  test("set / move", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //  Client1 sets "C" to "A"
      root2.get("list").move(0, 1); //   Client2 moves "A" after "B"

      await assertEach({ list: ["C", "B"] }, { list: ["B", "A"] });

      socketUtils.sendMessagesClient1();

      await assert({ list: ["C", "B"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "B"] }, { list: ["C", "B"] });

      socketUtils.sendMessagesClient2();

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "B"] }, { list: ["D", "C", "B"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["D", "C", "B"] });
    });
  });

  test("set / set", async () => {
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
      root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "B"] }, { list: ["C", "B"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["D", "B"] });
    });
  });

  test("insert / move", async () => {});

  test("insert / delete", async () => {});

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["C", "A", "B"] }, { list: ["C", "D", "B"] });

      socketUtils.sendMessagesClient2();

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

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["C", "B"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("delete / delete", async () => {});

  test("set + move / set", async () => {
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
      root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "C"] }, { list: ["B", "C"] });

      socketUtils.sendMessagesClient2();

      await assert({ list: ["D", "B", "C"] });
    });
  });

  test("push + set / push + set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
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

      await assertEach({ list: ["B"] }, { list: ["D"] });

      console.log("INTERMEDIATE");

      socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["B", "D"] });

      console.log("FINISH");

      socketUtils.sendMessagesClient2();

      await assert({ list: ["D"] });
    });
  });
});
