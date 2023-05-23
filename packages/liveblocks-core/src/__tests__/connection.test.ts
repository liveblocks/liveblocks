import { ManagedSocket } from "../connection";
import { MockWebSocketServer } from "./_utils";

const ALWAYS_SUCCEEDS = () => Promise.resolve({ token: "MY_TOKEN" });
const ALWAYS_FAILS = () => Promise.reject(new Error("Nope"));

describe("ManagedSocket", () => {
  test("failure to authenticate", async () => {
    jest.useFakeTimers();

    const wss = new MockWebSocketServer();

    const didConnect = jest.fn();
    // const didDisconnect = jest.fn();

    const mgr = new ManagedSocket({
      authenticate: ALWAYS_FAILS,
      createSocket: () => wss.newSocket(),
    });
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

    const wss = new MockWebSocketServer();

    const didConnect = jest.fn();
    // const didDisconnect = jest.fn();

    const mgr = new ManagedSocket({
      authenticate: ALWAYS_SUCCEEDS,
      createSocket: () => wss.newSocketAndAccept(),
    });
    mgr.events.didConnect.subscribe(didConnect);
    // mgr.events.didDisconnect.subscribe(didDisconnect);

    mgr.connect();
    await jest.advanceTimersByTimeAsync(4000);
    mgr.disconnect();

    expect(didConnect).toBeCalledTimes(1);
    // expect(didDisconnect).toBeCalledTimes(1);
  });
});
