import "regenerator-runtime/runtime";

import { LiveList } from "@liveblocks/client";
import { prepareTest } from "./utils";

describe("list confict resolution", () => {
  test("storage test", async () => {
    const {
      socket1,
      socket2,
      root1,
      root2,
      assert,
      assertClient2,
      assertClient1,
    } = await prepareTest();
    root1.set("list", new LiveList());

    await assert({ list: [] });

    socket1.pauseSend();
    socket2.pauseSend();

    root1.get("list").push("A");
    root2.get("list").push("B");

    socket1.resumeSend();

    await assertClient2({ list: ["A", "B"] });
    await assertClient1({ list: ["A"] });

    socket2.resumeSend();

    await assert({ list: ["A", "B"] });
  }, 10000);
});
