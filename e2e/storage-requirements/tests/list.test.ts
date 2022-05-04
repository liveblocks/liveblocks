import "regenerator-runtime/runtime";

import { LiveList } from "@liveblocks/client";
import { prepareTest } from "./utils";

describe("LiveList confict resolution", () => {
  test("push / push", async () => {
    const { root1, root2, assert, socketUtils } = await prepareTest<{
      list: LiveList<string>;
    }>({
      list: new LiveList(),
    });

    await assert({ list: [] });

    socketUtils.pauseAllSockets();

    root1.get("list")?.push("A"); // Client 1 push "A"
    root2.get("list")?.push("B"); // Client 2 push "B"

    socketUtils.sendMessagesClient1(); // Client 1 push "A" sent to server

    await assert({ list: ["A"] }, { list: ["A", "B"] });

    socketUtils.sendMessagesClient2(); // Client 2 push "B" sent to server

    await assert({ list: ["A", "B"] });
  });
});
