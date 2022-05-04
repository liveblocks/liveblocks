import "regenerator-runtime/runtime";

import { LiveList } from "@liveblocks/client";
import { prepareTest } from "./utils";

describe("LiveList confict resolution", () => {
  test("push / push", async () => {
    const { socket1, socket2, root1, root2, assert } = await prepareTest<{
      list: LiveList<string>;
    }>({
      list: new LiveList(),
    });

    await assert({ list: [] });

    socket1.pauseSend();
    socket2.pauseSend();

    root1.get("list")?.push("A");
    root2.get("list")?.push("B");

    socket1.resumeSend();

    await assert({ list: ["A"] }, { list: ["A", "B"] });

    socket2.resumeSend();

    await assert({ list: ["A", "B"] });
  });
});
