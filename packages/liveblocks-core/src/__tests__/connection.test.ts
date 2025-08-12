import { describe, expect, test, vi } from "vitest";

import { ManagedSocket } from "../connection";
import {
  ALWAYS_FAIL_AUTH,
  AUTH_SUCCESS,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
  SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE,
  SOCKET_NO_BEHAVIOR,
} from "./_behaviors";

describe("ManagedSocket", () => {
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
});
