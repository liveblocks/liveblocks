import { createClient } from "@liveblocks/client";
import type { BaseUserMeta, JsonObject, User } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";
import WebSocket from "ws";
import { describe, test, expect } from "vitest";

config();

// Utility functions for client tests
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5000
): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < timeoutMs) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}

describe("@liveblocks/client package e2e", () => {
  test("presence should work in node environment", async () => {
    // First, create the room with proper permissions
    const serverClient = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
      // @ts-expect-error hidden config
      baseUrl:
        process.env.LIVEBLOCKS_BASE_URL ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ??
        "https://api.liveblocks.io",
    });

    await serverClient.createRoom(
      "node-e2e",
      { defaultAccesses: ["room:write"] },
      { idempotent: true }
    );

    const clientA = createClient({
      publicApiKey:
        process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
      polyfills: { WebSocket },
      // @ts-expect-error hidden config
      baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    });

    const clientB = createClient({
      publicApiKey:
        process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
      polyfills: { WebSocket },
      // @ts-expect-error hidden config
      baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    });

    let roomAOthers: User<JsonObject, BaseUserMeta>[] = [];
    let roomBOthers: User<JsonObject, BaseUserMeta>[] = [];

    const { room: roomA, leave: leaveA } = clientA.enterRoom("node-e2e", {
      initialPresence: { name: "P" },
    });
    const { room: roomB, leave: leaveB } = clientB.enterRoom("node-e2e", {
      initialPresence: { name: "B" },
    });

    roomA.subscribe("others", (others) => {
      roomAOthers.length = 0;
      roomAOthers.push(...others);
    });
    roomB.subscribe("others", (others) => {
      roomBOthers.length = 0;
      roomBOthers.push(...others);
    });

    await waitFor(() =>
      roomAOthers.some((user) => user.presence?.name === "B")
    );
    await waitFor(() =>
      roomBOthers.some((user) => user.presence?.name === "A")
    );

    // Verify that each client can see the other's presence
    expect(roomAOthers.some((user) => user.presence?.name === "B")).toBe(true);
    expect(roomBOthers.some((user) => user.presence?.name === "A")).toBe(true);

    leaveA();
    leaveB();
  });
});
