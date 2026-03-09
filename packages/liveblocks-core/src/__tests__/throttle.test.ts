import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import type { JsonObject } from "../lib/Json";
import { ServerMsgCode } from "../protocol/ServerMsg";
import { nodeStreamToCompactNodes } from "../protocol/StorageNode";
import {
  AUTH_SUCCESS,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
} from "./_behaviors";
import {
  createSerializedRoot,
  makeRoomConfig,
  serverMessage,
} from "./_utils";
import { createRoom } from "../room";
import { waitUntilStatus } from "./_waitUtils";

const THROTTLE_DELAY = 100;

async function createThrottledRoom<S extends LsonObject = LsonObject>(opts: {
  initialPresence?: Record<string, unknown>;
  initialStorage?: JsonObject;
  throttleDelay?: number;
} = {}) {
  const { initialPresence = {}, initialStorage, throttleDelay = THROTTLE_DELAY } = opts;

  const { wss, delegates } = defineBehavior(
    AUTH_SUCCESS,
    SOCKET_AUTOCONNECT_AND_ROOM_STATE()
  );

  const config = makeRoomConfig(delegates, { throttleDelay });
  const room = createRoom({ initialPresence }, config);

  if (initialStorage) {
    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.STORAGE_CHUNK,
          nodes: Array.from(
            nodeStreamToCompactNodes([createSerializedRoot(initialStorage)])
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

  room.connect();
  await waitUntilStatus(room, "connected");
  return { room, wss, root: null as LiveObject<S> | null };
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

  test("many rapid presence updates produce exactly one server message within the throttle window", async () => {
    vi.useRealTimers();
    const { room, wss } = await createThrottledRoom({ initialPresence: { x: 0 } });
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

    // No further messages arrive after the window
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY * 2);
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    room.destroy();
  });

  test("many rapid broadcast events produce exactly one server message within the throttle window", async () => {
    vi.useRealTimers();
    const { room, wss } = await createThrottledRoom();
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    for (let i = 0; i < 10; i++) {
      room.broadcastEvent({ seq: i });
    }

    // Not flushed yet
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect);

    // Exactly one batch after the window
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    // No further messages
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY * 2);
    expect(wss.receivedMessages.length).toBe(messagesAfterConnect + 1);

    room.destroy();
  });

  test("many rapid storage mutations produce exactly one server message within the throttle window", async () => {
    vi.useRealTimers();
    const { room, wss, root } = await createThrottledRoom<{ x: number }>({
      initialStorage: { x: 0 },
    });
    const messagesAfterStorage = wss.receivedMessages.length;

    vi.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      root!.set("x", i);
    }

    // Not flushed yet
    expect(wss.receivedMessages.length).toBe(messagesAfterStorage);

    // Exactly one batch after the window
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
    expect(wss.receivedMessages.length).toBe(messagesAfterStorage + 1);

    // No further messages
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY * 2);
    expect(wss.receivedMessages.length).toBe(messagesAfterStorage + 1);

    room.destroy();
  });

  test("after the throttle window elapses, the next call flushes immediately", async () => {
    vi.useRealTimers();
    const { room, wss } = await createThrottledRoom({ initialPresence: { x: 0 } });
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    // Advance past the throttle window so the next mutation can flush immediately
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY + 50);

    const messagesBeforeUpdate = wss.receivedMessages.length;
    room.updatePresence({ x: 10 });

    // Should arrive immediately — no timer needed
    expect(wss.receivedMessages.length).toBe(messagesBeforeUpdate + 1);

    room.destroy();
  });

  test("sustained rapid calls over multiple throttle windows produce bounded messages", async () => {
    vi.useRealTimers();
    const { room, wss } = await createThrottledRoom({ initialPresence: { x: 0 } });
    const messagesAfterConnect = wss.receivedMessages.length;

    vi.useFakeTimers();

    // Simulate 500ms of rapid presence updates at 10ms intervals (50 calls).
    // With a 100ms throttle window, exactly ceil(500/100) = 5 windows pass,
    // so we expect exactly 5 flushed messages (one per window).
    const duration = 500;
    const interval = 10;
    for (let t = 0; t < duration; t += interval) {
      room.updatePresence({ x: t });
      await vi.advanceTimersByTimeAsync(interval);
    }

    // Drain any remaining scheduled flush
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);

    const messagesSent = wss.receivedMessages.length - messagesAfterConnect;
    const expectedWindows = Math.ceil(duration / THROTTLE_DELAY);
    // Exactly one message per throttle window
    expect(messagesSent).toBe(expectedWindows);

    // No further messages after draining
    const finalCount = wss.receivedMessages.length;
    await vi.advanceTimersByTimeAsync(THROTTLE_DELAY * 2);
    expect(wss.receivedMessages.length).toBe(finalCount);

    room.destroy();
  });
});
