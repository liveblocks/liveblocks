import { createClient } from "@liveblocks/client";
import type { BaseUserMeta, JsonObject, User } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";
import WebSocket from "ws";
import { describe, test, expect, vi } from "vitest";

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

    const roomAOthersCallback = vi.fn();
    const roomBOthersCallback = vi.fn();

    roomA.subscribe("others", roomAOthersCallback);
    roomB.subscribe("others", roomBOthersCallback);

    // Wait until both callbacks have been called at least once
    await waitFor(() => roomAOthersCallback.mock.calls.length > 0);
    await waitFor(() => roomBOthersCallback.mock.calls.length > 0);

    // Find the call where room A sees user B
    const roomACallWithB = roomAOthersCallback.mock.calls.find(([others]) =>
      others.some((user: User<JsonObject, BaseUserMeta>) => user.presence?.name === "B")
    );

    // Find the call where room B sees user A  
    const roomBCallWithA = roomBOthersCallback.mock.calls.find(([others]) =>
      others.some((user: User<JsonObject, BaseUserMeta>) => user.presence?.name === "A")
    );

    // Assert that both rooms saw the expected users
    expect(roomACallWithB, "Room A should have received user B in others").toBeDefined();
    expect(roomBCallWithA, "Room B should have received user A in others").toBeDefined();

    leaveA();
    leaveB();
  });
});
