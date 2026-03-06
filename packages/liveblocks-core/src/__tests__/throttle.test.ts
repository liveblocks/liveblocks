import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ClientMsgCode } from "../protocol/ClientMsg";
import {
  AUTH_SUCCESS,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
} from "./_behaviors";
import { createRoomForTest, makeRoomConfig } from "./_utils";
import { waitUntilStatus } from "./_waitUtils";

const THROTTLE_DELAY = 100;

function createThrottledRoom(initialPresence: Record<string, unknown>, throttleDelay = THROTTLE_DELAY) {
  const { wss, delegates } = defineBehavior(
    AUTH_SUCCESS,
    SOCKET_AUTOCONNECT_AND_ROOM_STATE()
  );

  const config = makeRoomConfig(delegates, { throttleDelay });
  const room = createRoomForTest({ initialPresence }, config);

  return { room, wss };
}

describe("throttle / message flushing", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("rapid presence updates are batched within throttle window", async () => {
    const { room, wss } = createThrottledRoom({ x: 0 });
    room.connect();

    await waitUntilStatus(room, "connected");

    // Initial presence message sent on connect
    expect(wss.receivedMessages.length).toBe(1);
    expect(wss.receivedMessages[0]).toEqual([
      {
        type: ClientMsgCode.UPDATE_PRESENCE,
        targetActor: -1,
        data: { x: 0 },
      },
    ]);

    vi.useFakeTimers();
    try {
      const now = Date.now();

      // Two rapid updates within the throttle window
      vi.setSystemTime(now + 30);
      room.updatePresence({ x: 1 });
      vi.setSystemTime(now + 35);
      room.updatePresence({ x: 2 });

      await vi.advanceTimersByTimeAsync(0);
      // Still only the initial presence message — updates are buffered
      expect(wss.receivedMessages.length).toBe(1);

      // Advance past the throttle delay → buffered updates flush
      await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
      expect(wss.receivedMessages.length).toBe(2);
      // The batched message contains the latest presence state.
      // JS coalesces into one update; WASM may send both — either way,
      // the last entry carries { x: 2 }.
      const batch = wss.receivedMessages[1] as Record<string, unknown>[];
      const lastUpdate = batch[batch.length - 1];
      expect(lastUpdate).toEqual(
        expect.objectContaining({
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
        })
      );
    } finally {
      vi.useRealTimers();
    }

    room.destroy();
  });

  test("immediate flush when enough time has elapsed since last flush", async () => {
    const { room, wss } = createThrottledRoom({ x: 0 });
    room.connect();

    await waitUntilStatus(room, "connected");
    expect(wss.receivedMessages.length).toBe(1);

    vi.useFakeTimers();
    try {
      const now = Date.now();

      // Wait longer than the throttle delay, then update
      vi.setSystemTime(now + THROTTLE_DELAY + 50);
      room.updatePresence({ x: 10 });

      await vi.advanceTimersByTimeAsync(0);
      // Should have flushed immediately — no need to wait
      expect(wss.receivedMessages.length).toBe(2);
      expect(wss.receivedMessages[1]).toEqual([
        { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 10 } },
      ]);
    } finally {
      vi.useRealTimers();
    }

    room.destroy();
  });

  test("broadcastEvent follows throttle", async () => {
    const { room, wss } = createThrottledRoom({});
    room.connect();

    await waitUntilStatus(room, "connected");
    expect(wss.receivedMessages.length).toBe(1); // initial presence

    vi.useFakeTimers();
    try {
      const now = Date.now();

      vi.setSystemTime(now + 20);
      room.broadcastEvent({ kind: "a" });
      vi.setSystemTime(now + 25);
      room.broadcastEvent({ kind: "b" });

      await vi.advanceTimersByTimeAsync(0);
      // Not yet flushed
      expect(wss.receivedMessages.length).toBe(1);

      await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);
      // Both events should have been batched
      expect(wss.receivedMessages.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }

    room.destroy();
  });

  test("throttleDelay <= 0 means immediate flush", async () => {
    const { room, wss } = createThrottledRoom({ x: 0 }, -1);
    room.connect();

    await waitUntilStatus(room, "connected");
    expect(wss.receivedMessages.length).toBe(1);

    room.updatePresence({ x: 1 });
    room.updatePresence({ x: 2 });

    // With no throttle, each update flushes immediately.
    // Messages arrive without needing any timer advancement.
    expect(wss.receivedMessages.length).toBeGreaterThanOrEqual(2);

    room.destroy();
  });
});
