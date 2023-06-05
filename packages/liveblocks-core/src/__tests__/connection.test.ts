import { ManagedSocket } from "../connection";
import {
  ALWAYS_FAIL_AUTH,
  AUTO_OPEN_SOCKETS,
  DEFAULT_AUTH,
  defineBehavior,
  MANUAL_SOCKETS,
} from "./_behaviors";

describe("ManagedSocket", () => {
  test("failure to authenticate", async () => {
    jest.useFakeTimers();

    const { delegates } = defineBehavior(ALWAYS_FAIL_AUTH, MANUAL_SOCKETS);

    const didConnect = jest.fn();
    // const didDisconnect = jest.fn();

    const mgr = new ManagedSocket(delegates);
    mgr.events.didConnect.subscribe(didConnect);
    // mgr.events.didDisconnect.subscribe(didDisconnect);

    mgr.connect();
    await jest.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).not.toBeCalled();
    // expect(didDisconnect).not.toBeCalled(); // Never connected, so never disconnected either
  });

  test("authenticate succeeds, but no websocket connection", async () => {
    jest.useFakeTimers();

    const { delegates } = defineBehavior(DEFAULT_AUTH, AUTO_OPEN_SOCKETS);

    const didConnect = jest.fn();
    // const didDisconnect = jest.fn();

    const mgr = new ManagedSocket(delegates);
    mgr.events.didConnect.subscribe(didConnect);
    // mgr.events.didDisconnect.subscribe(didDisconnect);

    mgr.connect();
    await jest.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).toBeCalledTimes(1);
    // expect(didDisconnect).toBeCalledTimes(1);
  });
});
