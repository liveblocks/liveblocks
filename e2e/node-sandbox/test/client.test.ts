import { createClient } from "@liveblocks/client";
import type { BaseUserMeta, JsonObject, User } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";
import WebSocket from "ws";
import { describe, test, expect, vi } from "vitest";

type OpaqueUser = User<JsonObject, BaseUserMeta>;

config();

// Utility functions for client tests
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 10000
): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const startTime = new Date().getTime();

  while (new Date().getTime() - startTime < timeoutMs) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error(`TIMEOUT after ${timeoutMs}ms`);
}

describe("@liveblocks/client package e2e", () => {
  test(
    "presence should work in node environment",
    { timeout: 15000 },
    async () => {
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
        baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
      });

      const clientB = createClient({
        publicApiKey:
          process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY ??
          process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
        polyfills: { WebSocket },
        // @ts-expect-error hidden config
        baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      });

      const { room: roomA, leave: leaveA } = clientA.enterRoom("node-e2e", {
        initialPresence: { name: "A" },
      });
      const { room: roomB, leave: leaveB } = clientB.enterRoom("node-e2e", {
        initialPresence: { name: "B" },
      });

      try {
        let callbackACalled = false;
        let callbackBCalled = false;
        let roomASawB = false;
        let roomBSawA = false;

        roomA.subscribe("others", (others) => {
          callbackACalled = true;
          if (others.some((user: OpaqueUser) => user.presence?.name === "B")) {
            roomASawB = true;
          }
        });

        roomB.subscribe("others", (others) => {
          callbackBCalled = true;
          if (others.some((user: OpaqueUser) => user.presence?.name === "A")) {
            roomBSawA = true;
          }
        });

        // Wait for both callbacks to be fired
        await waitFor(() => callbackACalled && callbackBCalled, 10000);

        // Assert that both rooms saw the expected users
        expect(roomASawB, "Room A should have seen user B").toBe(true);
        expect(roomBSawA, "Room B should have seen user A").toBe(true);
      } finally {
        leaveA();
        leaveB();
      }
    }
  );
});
