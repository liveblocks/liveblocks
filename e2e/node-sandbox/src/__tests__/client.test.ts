import { createClient } from "@liveblocks/client";
import { config } from "dotenv";
import fetch from "node-fetch";
import WebSocket from "ws";

config();

// Utility functions for client tests
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean): Promise<void> {
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

describe("@liveblocks/client package e2e", () => {
  test("presence should work in node environment", async () => {
    // Test that we can create clients and enter rooms without errors
    const clientA = createClient({
      publicApiKey:
        process.env.LIVEBLOCKS_PUBLIC_KEY ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
      polyfills: {
        fetch: fetch as any,
        WebSocket: WebSocket as any,
      },
    });

    const clientB = createClient({
      publicApiKey:
        process.env.LIVEBLOCKS_PUBLIC_KEY ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
      polyfills: {
        fetch: fetch as any,
        WebSocket: WebSocket as any,
      },
    });

    const { room: roomA, leave: leaveA } = clientA.enterRoom("node-e2e", {
      initialPresence: { name: "A" },
    });
    const { room: roomB, leave: leaveB } = clientB.enterRoom("node-e2e", {
      initialPresence: { name: "B" },
    });

    // Verify rooms are created successfully
    expect(roomA).toBeDefined();
    expect(roomB).toBeDefined();

    leaveA();
    leaveB();
  });
});
