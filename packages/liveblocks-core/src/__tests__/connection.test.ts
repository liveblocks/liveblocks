import { ManagedSocket } from "../connection";
import { MockWebSocket } from "./_utils";

const ALWAYS_SUCCEEDS = () => Promise.resolve({ token: "MY_TOKEN" });
const ALWAYS_FAILS = () => Promise.reject(new Error("Nope"));

describe("ManagedSocket", () => {
  test("failure to authenticate", async () => {
    jest.useFakeTimers();

    let lastSocket;
    const connect = () => {
      lastSocket = new MockWebSocket("wss://ignored");
      return lastSocket;
    };

    const mgr = new ManagedSocket({
      authenticate: ALWAYS_FAILS,
      connect,
    });

    mgr.connect();

    await jest.advanceTimersByTimeAsync(4000);
    mgr.disconnect();
  });

  test("authenticate succeeds, but no websocket connection", async () => {
    jest.useFakeTimers();

    let lastSocket: MockWebSocket;
    const connect = () => {
      lastSocket = new MockWebSocket("wss://ignored");
      setTimeout(() => {
        lastSocket.simulateOpen();
      }, 500);
      return lastSocket;
    };

    const mgr = new ManagedSocket({
      authenticate: ALWAYS_SUCCEEDS,
      connect,
    });

    mgr.connect();

    await jest.advanceTimersByTimeAsync(4000);
    mgr.disconnect();
  });
});
