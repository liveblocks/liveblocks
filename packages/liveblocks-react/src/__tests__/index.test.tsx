import type { BaseUserMeta, Json, JsonObject } from "@liveblocks/client";
import type { ServerMsg } from "@liveblocks/client/internal";
import {
  ClientMsgCode,
  CrdtType,
  ServerMsgCode,
} from "@liveblocks/client/internal";
import { rest } from "msw";
import { setupServer } from "msw/node";

import {
  useMyPresence,
  useObject,
  useOthers,
  useRoom,
} from "./_liveblocks.config";
import { act, renderHook, waitFor } from "./_utils"; // Basically re-exports from @testing-library/react

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

/**
 * Testing tool to simulate fake incoming server events.
 */
async function websocketSimulator() {
  const socket = await waitForSocketToBeConnected();
  socket.callbacks.open[0]();

  // Simulator API
  return {
    // Field for introspection of simulator state
    sentMessages: socket.sentMessages,
    callbacks: socket.callbacks,

    //
    // Simulating actions
    //
    simulateIncomingMessage(msg: ServerMsg<JsonObject, BaseUserMeta, Json>) {
      socket.callbacks.message.forEach((cb) =>
        cb({
          data: JSON.stringify(msg),
        } as MessageEvent)
      );
    },

    simulateAbnormalClose() {
      socket.callbacks.close[0]({
        reason: "",
        wasClean: false,
        code: WebSocketErrorCodes.CLOSE_ABNORMAL,
      } as CloseEvent);
    },
  };
}

describe("useRoom", () => {
  test("initial presence should be sent to other users when socket is connected", async () => {
    renderHook(() => useRoom()); // Ignore return value here, this hook triggers the initialization side effect

    const sim = await websocketSimulator();
    expect(sim.sentMessages[0]).toStrictEqual(
      JSON.stringify([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { x: 1 },
        },
      ])
    );
  });
});

describe("useMyPresence", () => {
  test("initial presence should be readable immediately", () => {
    const { result } = renderHook(() => useMyPresence());
    const [me] = result.current;
    expect(me.x).toBe(1);
  });

  test("set presence should replace current presence", () => {
    const { result } = renderHook(() => useMyPresence());
    const [, setPresence] = result.current;

    let me = result.current[0];
    expect(me).toEqual({ x: 1 });

    act(() => setPresence({ x: me.x + 1 }));

    me = result.current[0];
    expect(me).toEqual({ x: 2 });
  });
});

describe("useOthers", () => {
  test("others presence should be set on update", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
      })
    );

    expect(result.current.toArray()).toEqual([
      { connectionId: 1, presence: { x: 2 } },
    ]);
  });

  test("others presence should be merged on update", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();

    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 0 },
        actor: 1,
      })
    );

    expect(result.current.toArray()).toEqual([
      { connectionId: 1, presence: { x: 0 } },
    ]);

    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { y: 0 },
        actor: 1,
      })
    );

    expect(result.current.toArray()).toEqual([
      { connectionId: 1, presence: { x: 0, y: 0 } },
    ]);
  });

  test("others presence should be cleared on close", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
      })
    );

    expect(result.current.toArray()).toEqual([
      { connectionId: 1, presence: { x: 2 } },
    ]);

    act(() => sim.simulateAbnormalClose());

    expect(result.current.toArray()).toEqual([]);
  });
});

describe("useObject", () => {
  test("initialization happens asynchronously", async () => {
    const { result, rerender } = renderHook(() => useObject("obj"));

    // On the initial render, this hook will return `null`
    expect(result.current).toBeNull();

    const sim = await websocketSimulator();

    rerender();
    expect(result.current).toBeNull();

    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: {} }]],
      })
    );

    await waitFor(() => expect(result.current?.toObject()).toEqual({ a: 0 }));
  });

  test("unmounting useObject while storage is loading should not cause a memory leak", async () => {
    const { result, rerender, unmount } = renderHook(() => useObject("obj"));

    // On the initial render, this hook will return `null`
    expect(result.current).toBeNull();

    const sim = await websocketSimulator();

    rerender();
    expect(result.current).toBeNull();

    // Grab a handle to the callback before unmounting the component
    const callback = sim.callbacks.message[0];
    unmount();

    act(() =>
      // Manually simulate an incoming server message
      callback({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent)
    );

    expect(result.current).toBeNull();
  });
});
