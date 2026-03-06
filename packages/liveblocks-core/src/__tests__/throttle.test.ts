import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createApiClient } from "../api-client";
import { createAuthManager } from "../auth-manager";
import { DEFAULT_BASE_URL } from "../constants";
import type { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import { makeEventSource } from "../lib/EventSource";
import type { JsonObject } from "../lib/Json";
import { Signal } from "../lib/signals";
import { ServerMsgCode } from "../protocol/ServerMsg";
import { nodeStreamToCompactNodes } from "../protocol/StorageNode";
import { createRoom } from "../room";
import type { LiveblocksError } from "../types/LiveblocksError";
import {
  ALWAYS_AUTH_WITH_ACCESS_TOKEN,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
} from "./_behaviors";
import { MockWebSocket } from "./_MockWebSocketServer";
import {
  createSerializedRoot,
  makeSyncSource,
  serverMessage,
} from "./_utils";
import { waitUntilStatus } from "./_waitUtils";

const THROTTLE_DELAY = 100;

function createThrottledRoom(
  initialPresence: Record<string, unknown>,
  throttleDelay = THROTTLE_DELAY
) {
  const { wss, delegates } = defineBehavior(
    ALWAYS_AUTH_WITH_ACCESS_TOKEN,
    SOCKET_AUTOCONNECT_AND_ROOM_STATE()
  );

  const room = createRoom(
    { initialPresence, initialStorage: {} },
    {
      delegates,
      roomId: "room-id",
      throttleDelay,
      lostConnectionTimeout: 99999,
      polyfills: { WebSocket: MockWebSocket },
      baseUrl: DEFAULT_BASE_URL,
      errorEventSource: makeEventSource<LiveblocksError>(),
      enableDebugLogging: false,
      roomHttpClient: createApiClient({
        baseUrl: DEFAULT_BASE_URL,
        fetchPolyfill: globalThis.fetch?.bind(globalThis),
        authManager: createAuthManager({ authEndpoint: "/api/auth" }),
        currentUserId: new Signal<string | undefined>(undefined),
      }),
      createSyncSource: makeSyncSource,
    }
  );

  return { room, wss };
}

async function createThrottledRoomWithStorage<S extends LsonObject>(
  rootData: JsonObject,
  throttleDelay = THROTTLE_DELAY
) {
  const { room, wss } = createThrottledRoom({}, throttleDelay);

  wss.onConnection((conn) => {
    conn.server.send(
      serverMessage({
        type: ServerMsgCode.STORAGE_CHUNK,
        nodes: Array.from(
          nodeStreamToCompactNodes([createSerializedRoot(rootData)])
        ),
      })
    );
    conn.server.send(
      serverMessage({ type: ServerMsgCode.STORAGE_STREAM_END })
    );
  });

  // Call getStorage() before connect() so the resolve callback is ready
  // when storage data arrives on connection (needed for WASM room where
  // storageDidLoad fires synchronously during message processing).
  const storage$ = room.getStorage();
  room.connect();
  await waitUntilStatus(room, "connected");

  const { root } = await storage$;
  return { room, wss, root: root as LiveObject<S> };
}

describe("throttle / message flushing", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  test("many rapid presence updates produce at most one server message within the throttle window", async () => {
    vi.useRealTimers(); // need real timers for connect handshake
    const { room, wss } = createThrottledRoom({ x: 0 });
    room.connect();
    await waitUntilStatus(room, "connected");
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    // Fire 10 presence updates in rapid succession
    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i });
    }

    // No new messages should have been sent yet (all within throttle window)
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect);

    // After the throttle window elapses, exactly one batched message is sent
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    room.destroy();
  });

  test("many rapid broadcast events produce at most one server message within the throttle window", async () => {
    vi.useRealTimers();
    const { room, wss } = createThrottledRoom({});
    room.connect();
    await waitUntilStatus(room, "connected");
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    for (let i = 0; i < 10; i++) {
      room.broadcastEvent({ seq: i });
    }

    expect(wss.receivedMessages.length).toBe(messagesAfterConnect);

    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    room.destroy();
  });

  test("many rapid storage mutations produce at most one server message within the throttle window", async () => {
    vi.useRealTimers();
    const { room, wss, root } = await createThrottledRoomWithStorage<{
      x: number;
    }>({ x: 0 });
    const messagesAfterStorage = wss.receivedMessages.length;

    vi.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      root.set("x", i);
    }

    expect(wss.receivedMessages.length).toBe(messagesAfterStorage);

    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
    expect(wss.receivedMessages.length).toBe(messagesAfterStorage + 1);

    room.destroy();
  });

  test("after the throttle window elapses, the next call flushes immediately", async () => {
    vi.useRealTimers();
    const { room, wss } = createThrottledRoom({ x: 0 });
    room.connect();
    await waitUntilStatus(room, "connected");
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    // Advance past the throttle window so the next mutation can flush immediately
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY + 50);
    room.updatePresence({ x: 10 });

    // Should arrive immediately — no timer needed
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    room.destroy();
  });

  test("sustained rapid calls over multiple throttle windows produce bounded messages", async () => {
    vi.useRealTimers();
    const { room, wss } = createThrottledRoom({ x: 0 });
    room.connect();
    await waitUntilStatus(room, "connected");
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    // Simulate 500ms of rapid presence updates at 10ms intervals (50 calls).
    // With a 100ms throttle, we expect at most ~5 server messages.
    const duration = 500;
    const interval = 10;
    for (let t = 0; t < duration; t += interval) {
      room.updatePresence({ x: t });
      await vi.advanceTimersByTimeAsync(interval);
    }

    // Drain any remaining scheduled flush
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);

    const messagesSent = wss.receivedMessages.length - messagesAfterConnect;
    const maxExpected = Math.ceil(duration / THROTTLE_DELAY) + 1;
    expect(messagesSent).toBeLessThanOrEqual(maxExpected);
    expect(messagesSent).toBeGreaterThanOrEqual(1);

    room.destroy();
  });
});
