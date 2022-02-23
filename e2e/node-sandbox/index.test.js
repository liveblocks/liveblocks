const { createClient } = require("@liveblocks/client");
const fetch = require("node-fetch");
const WebSocket = require("ws");
require("dotenv").config();

describe("node e2e", () => {
  test("presence should work in node environment", async () => {
    const clientA = createClient({
      publicApiKey: process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
      fetchPolyfill: fetch,
      WebSocketPolyfill: WebSocket,
    });

    const clientB = createClient({
      publicApiKey: process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
      fetchPolyfill: fetch,
      WebSocketPolyfill: WebSocket,
    });

    let roomAOthers = [];
    let roomBOthers = [];

    const roomA = clientA.enter("node-e2e", { defaultPresence: { name: "A" } });
    const roomB = clientB.enter("node-e2e", { defaultPresence: { name: "B" } });

    roomA.subscribe("others", (others) => (roomAOthers = others.toArray()));
    roomB.subscribe("others", (others) => (roomBOthers = others.toArray()));

    await waitFor(() =>
      roomAOthers.some((user) => user.presence?.name === "B")
    );
    await waitFor(() =>
      roomBOthers.some((user) => user.presence?.name === "A")
    );

    clientA.leave("node-e2e");
    clientB.leave("node-e2e");
  });
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate) {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}
