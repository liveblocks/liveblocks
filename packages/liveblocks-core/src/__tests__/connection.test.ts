import { afterEach, describe, expect, test, vi } from "vitest";

import { ManagedSocket } from "../connection";
import type {
  MockWebSocket,
  MockWebSocketServer,
} from "./_MockWebSocketServer";
import {
  ALWAYS_FAIL_AUTH,
  AUTH_SUCCESS,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
  SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE,
  SOCKET_NO_BEHAVIOR,
  SOCKET_SEQUENCE,
} from "./_MockWebSocketServer.behaviors";

/**
 * Socket behavior that connects normally, but then gets dropped by the
 * network (abnormal closure) after the given number of milliseconds.
 */
function SOCKET_DROPS_AFTER(ms: number) {
  return (wss: MockWebSocketServer) => {
    const socket = SOCKET_AUTOCONNECT_AND_ROOM_STATE()(wss);
    setTimeout(() => {
      socket.server.close(
        new CloseEvent("close", { code: 1006, wasClean: false })
      );
    }, ms);
    return socket;
  };
}

/**
 * Creates a ManagedSocket (using fake timers) for the given socket behavior,
 * and records the time of each connection attempt. `Math.random` is fixed to
 * the given value, to make jitter deterministic.
 */
function setup(
  behavior: (wss: MockWebSocketServer) => MockWebSocket,
  { random }: { random: number }
) {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(random);

  const attempts: number[] = [];
  const { delegates } = defineBehavior(AUTH_SUCCESS, (wss) => {
    attempts.push(Date.now());
    return behavior(wss);
  });

  return { mgr: new ManagedSocket(delegates), attempts };
}

/**
 * Connects using the given socket behavior, lets the given amount of (fake)
 * time pass, and returns the time between consecutive connection attempts.
 */
async function retryGaps(
  behavior: (wss: MockWebSocketServer) => MockWebSocket,
  { runFor, random }: { runFor: number; random: number }
): Promise<number[]> {
  const { mgr, attempts } = setup(behavior, { random });

  mgr.connect();
  await vi.advanceTimersByTimeAsync(runFor);
  mgr.disconnect();

  return attempts.slice(1).map((t, i) => t - attempts[i]);
}

describe("ManagedSocket", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("failure to authenticate", async () => {
    vi.useFakeTimers();

    const { delegates } = defineBehavior(ALWAYS_FAIL_AUTH, SOCKET_NO_BEHAVIOR);

    const didConnect = vi.fn();

    const mgr = new ManagedSocket(delegates);
    mgr.events.didConnect.subscribe(didConnect);

    mgr.connect();
    await vi.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).not.toHaveBeenCalled();
  });

  test("authenticate + websocket connection are successes but no ROOM_STATE still means not connected", async () => {
    vi.useFakeTimers();

    const { delegates } = defineBehavior(
      AUTH_SUCCESS,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );

    const didConnect = vi.fn();

    const mgr = new ManagedSocket(delegates);
    mgr.events.didConnect.subscribe(didConnect);

    mgr.connect();
    await vi.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).not.toHaveBeenCalled();
  });

  test("authenticate + websocket connection + ROOM_STATE = connected", async () => {
    vi.useFakeTimers();

    const { delegates } = defineBehavior(
      AUTH_SUCCESS,
      SOCKET_AUTOCONNECT_AND_ROOM_STATE()
    );

    const didConnect = vi.fn();

    const mgr = new ManagedSocket(delegates);
    mgr.events.didConnect.subscribe(didConnect);

    mgr.connect();
    await vi.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).toHaveBeenCalledTimes(1);
  });

  test("flapping connections keep backing off", async () => {
    const gaps = await retryGaps(SOCKET_DROPS_AFTER(2300), {
      runFor: 60_000,
      random: 0, // No jitter
    });

    expect(gaps).toEqual([
      2300 + 250,
      2300 + 500,
      2300 + 1000,
      2300 + 2000,
      2300 + 4000,
      2300 + 8000,
      2300 + 10000,
      2300 + 10000,
    ]);
  });

  test("backoff resets after a connection has been healthy for a while", async () => {
    const gaps = await retryGaps(
      SOCKET_SEQUENCE(
        SOCKET_DROPS_AFTER(2300),
        SOCKET_DROPS_AFTER(2300),
        SOCKET_DROPS_AFTER(2300),
        SOCKET_DROPS_AFTER(20_000), // Healthy for a while
        SOCKET_DROPS_AFTER(2300)
      ),
      { runFor: 40_000, random: 0 /* No jitter */ }
    );

    expect(gaps).toEqual([
      2300 + 250,
      2300 + 500,
      2300 + 1000,
      20_000 + 250, // Backoff got reset after the healthy connection
      2300 + 500,
      2300 + 1000,
      2300 + 2000,
    ]);
  });

  test("backoff delays are jittered", async () => {
    const gaps = await retryGaps(SOCKET_DROPS_AFTER(2300), {
      runFor: 10_000,
      random: 0.5,
    });

    // Each delay is extended by a random amount of up to 20%
    expect(gaps).toEqual([2300 + 275, 2300 + 550, 2300 + 1100]);
  });

  test("calling reconnect() on a working connection does not back off", async () => {
    const { mgr, attempts } = setup(SOCKET_AUTOCONNECT_AND_ROOM_STATE(), {
      random: 0, // No jitter
    });

    // Calls reconnect() after the connection has been open for the given
    // time, and returns how long it took until the next connection attempt
    async function reconnectAfter(ms: number): Promise<number> {
      await vi.advanceTimersByTimeAsync(ms);
      const reconnectedAt = Date.now();
      mgr.reconnect();
      await vi.advanceTimersByTimeAsync(2000);
      return attempts[attempts.length - 1] - reconnectedAt;
    }

    // The app chose to close a working connection, which says nothing about
    // the network, so this should not count as a failed attempt
    mgr.connect();
    expect(await reconnectAfter(3000)).toBe(250);
    expect(await reconnectAfter(3000)).toBe(250);
    expect(await reconnectAfter(3000)).toBe(250);
    mgr.disconnect();
  });

  test("calling reconnect() on a working connection resets an escalated backoff", async () => {
    const { mgr, attempts } = setup(
      SOCKET_SEQUENCE(
        SOCKET_DROPS_AFTER(2300),
        SOCKET_DROPS_AFTER(2300),
        SOCKET_DROPS_AFTER(2300),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Stays open
      ),
      { random: 0 /* No jitter */ }
    );

    // Three flapping connections escalate the backoff (250, 500, 1000ms),
    // after which the fourth connection stays open
    mgr.connect();
    await vi.advanceTimersByTimeAsync(3 * 2300 + 250 + 500 + 1000 + 1000);
    expect(attempts.length).toBe(4);

    const reconnectedAt = Date.now();
    mgr.reconnect();
    await vi.advanceTimersByTimeAsync(3000);
    expect(attempts[4] - reconnectedAt).toBe(250);
    mgr.disconnect();
  });
});
