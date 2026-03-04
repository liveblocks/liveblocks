/**
 * Test utilities for running @liveblocks/core unit tests against the real
 * local dev server at localhost:1154.
 */
import { onTestFinished } from "vitest";

import { createClient } from "../client";
import type { LsonObject } from "../crdts/Lson";
import type { JsonObject } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import { wait } from "../lib/utils";
import type { PlainLsonObject } from "../types/PlainLson";

const DEV_SERVER = "http://localhost:1154";

export function randomRoomId(): string {
  return `room-${nanoid()}`;
}

export async function waitFor(predicate: () => boolean): Promise<void> {
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

/**
 * Creates a room on the dev server and initializes its storage.
 * Returns the room ID, which can be passed to enterAndConnect().
 */
export async function initRoom(storage?: PlainLsonObject): Promise<string> {
  const roomId = randomRoomId();

  // Create the room
  await fetch(`${DEV_SERVER}/v2/rooms`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: roomId }),
  });

  // Initialize its storage
  if (storage) {
    await fetch(
      `${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_localdev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storage),
      }
    );
  }
  return roomId;
}

async function UNSAFE_generateAccessToken(roomId?: string) {
  const res = await fetch(`${DEV_SERVER}/v2/authorize-user`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `user-${nanoid()}`,
      userInfo: { name: "Testy McTester" },
      permissions: { [roomId!]: ["room:write"] },
    }),
  });
  return (await res.json()) as { token: string };
}

export function createTestClient() {
  return createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: UNSAFE_generateAccessToken,
    polyfills: { WebSocket: globalThis.WebSocket },
    // @ts-expect-error Deliberately testing internal option to disable throttling for tests
    __DANGEROUSLY_disableThrottling: true,
  });
}

/**
 * Enters a room, waits for "connected" status, and registers cleanup
 * via onTestFinished.
 */
export async function enterAndConnect<S extends LsonObject>(
  roomId: string,
  opts?: { initialStorage?: S }
) {
  const client = createTestClient();
  const { room, leave } = client.enterRoom<JsonObject, S>(roomId, {
    initialPresence: {},
    initialStorage: (opts?.initialStorage ?? {}) as S,
  });

  onTestFinished(leave);

  await waitFor(() => room.getStatus() === "connected");
  return { room, leave };
}
