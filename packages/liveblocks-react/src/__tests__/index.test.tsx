import {
  ClientMsgCode,
  CrdtType,
  ServerMsgCode,
} from "@liveblocks/client/internal";
import { rest } from "msw";
import { setupServer } from "msw/node";
import * as React from "react";

import {
  useMyPresence,
  useObject,
  useOthers,
  useRoom,
} from "./_liveblocks.config";
import { act, fireEvent, render, renderHook, screen, waitFor } from "./_utils"; // Basically re-exports from @testing-library/react

type TestID = "me-x" | "increment" | "othersJson" | "liveObject" | "unmount";

function testId(testId: TestID) {
  return testId;
}

function element(testId: TestID) {
  return screen.getByTestId(testId);
}

/**
 * https://github.com/Luka967/websocket-close-codes
 */
enum WebSocketErrorCodes {
  CLOSE_ABNORMAL = 1006,
}

function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  isMock = true;

  callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(event: "open", callback: (event: Event) => void): void;
  addEventListener(event: "close", callback: (event: CloseEvent) => void): void;
  addEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  addEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    this.callbacks[event].push(callback as any);
  }

  removeEventListener(event: "open", callback: (event: Event) => void): void;
  removeEventListener(
    event: "close",
    callback: (event: CloseEvent) => void
  ): void;
  removeEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  removeEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    remove(this.callbacks[event], callback);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {}
}

window.WebSocket = MockWebSocket as any;

const server = setupServer(
  rest.post("/api/auth", (_, res, ctx) => {
    return res(
      ctx.json({
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2Nywicm9vbUlkIjoiazV3bWgwRjlVTGxyek1nWnRTMlpfIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJhY3RvciI6MCwic2NvcGVzIjpbIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIiwicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.IQFyw54-b4F6P0MTSzmBVwdZi2pwPaxZwzgkE2l0Mi4",
      })
    );
  }),
  rest.post("/api/auth-fail", (_, res, ctx) => {
    return res(ctx.status(400));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  MockWebSocket.instances = [];
});
beforeEach(() => {
  MockWebSocket.instances = [];
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function waitForSocketToBeConnected() {
  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));

  const socket = MockWebSocket.instances[0];
  expect(socket.callbacks.open.length).toBe(1);

  return socket;
}

describe("presence", () => {
  test("initial presence should be set on state immediately", () => {
    const { result } = renderHook(() => useMyPresence());
    const [me] = result.current;
    expect(me.x).toBe(1);
  });

  // test("updating room should disconnect and reconnect and replace initial presence", async () => {
  //   const client = createClient({ authEndpoint: "/api/auth" });

  //   const { rerender } = render(
  //     <LiveblocksProvider client={client}>
  //       <PresenceComponent room="room" initialPresence={{ x: 1 }} />
  //     </LiveblocksProvider>
  //   );

  //   expect(element("me-x").textContent).toBe("1");

  //   await waitForSocketToBeConnected();

  //   MockWebSocket.instances = [];

  //   rerender(
  //     <LiveblocksProvider client={client}>
  //       <PresenceComponent room="room-b" initialPresence={{ x: 2 }} />
  //     </LiveblocksProvider>
  //   );

  //   expect(element("me-x").textContent).toBe("1");

  //   await waitForSocketToBeConnected();
  // });

  test("initial presence should be sent to other users when socket is connected", async () => {
    renderHook(() => useRoom()); // Ignore return value here, this hook triggers the initialization side effect

    const socket = await waitForSocketToBeConnected();
    socket.callbacks.open[0]();

    expect(socket.sentMessages[0]).toStrictEqual(
      JSON.stringify([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { x: 1 },
        },
      ])
    );
  });

  test("set presence should replace current presence", async () => {
    const { result } = renderHook(() => useMyPresence());
    let [me, setPresence] = result.current;

    await waitForSocketToBeConnected();

    expect(me).toEqual({ x: 1 });

    act(() => {
      setPresence({ x: me.x + 1 });
    });

    me = result.current[0];
    expect(me).toEqual({ x: 2 });
  });

  test("others presence should be set on update", async () => {
    const { result } = renderHook(() => useOthers());

    const socket = await waitForSocketToBeConnected();
    socket.callbacks.open[0]();

    act(() => {
      // Simulate a fake incoming presence update for actor 1
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(result.current.toArray()).toEqual([
      {
        connectionId: 1,
        presence: {
          x: 2,
        },
      },
    ]);
  });

  test("others presence should be merged on update", async () => {
    const { result } = renderHook(() => useOthers());

    const socket = await waitForSocketToBeConnected();
    socket.callbacks.open[0]();

    act(() => {
      // Simulate a fake incoming presence update for actor 1
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 0 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(result.current.toArray()).toEqual([
      {
        connectionId: 1,
        presence: { x: 0 },
      },
    ]);

    act(() => {
      // Simulate another fake incoming presence update for actor 1
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { y: 0 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(result.current.toArray()).toEqual([
      {
        connectionId: 1,
        presence: {
          x: 0,
          y: 0,
        },
      },
    ]);
  });

  test("others presence should be cleared on close", async () => {
    const { result } = renderHook(() => useOthers());

    const socket = await waitForSocketToBeConnected();
    socket.callbacks.open[0]();

    act(() => {
      // Simulate a fake incoming presence update for actor 1
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(result.current.toArray()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
      },
    ]);

    act(() => {
      socket.callbacks.close[0]({
        reason: "",
        wasClean: false,
        code: WebSocketErrorCodes.CLOSE_ABNORMAL,
      } as CloseEvent);
    });

    expect(result.current.toArray()).toEqual([]);
  });
});

describe("Storage", () => {
  test("useObject initialization", async () => {
    const { result, rerender } = renderHook(() => useObject("obj"));

    // On the initial render, this hook will return `null`
    expect(result.current).toBeNull();

    const socket = await waitForSocketToBeConnected();
    socket.callbacks.open[0]();

    rerender();
    expect(result.current).toBeNull();

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });

    await waitFor(() => expect(result.current?.toObject()).toEqual({ a: 0 }));
  });

  test("unmounting useObject while storage is loading should not cause a memory leak", async () => {
    const { result, rerender, unmount } = renderHook(() => useObject("obj"));

    // On the initial render, this hook will return `null`
    expect(result.current).toBeNull();

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    rerender();
    expect(result.current).toBeNull();

    const callback = socket.callbacks.message[0];
    unmount();

    act(() => {
      callback({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });

    expect(result.current).toBeNull();
  });
});
