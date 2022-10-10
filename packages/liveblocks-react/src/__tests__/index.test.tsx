import type { BaseUserMeta, Json, JsonObject } from "@liveblocks/client";
import { createClient, shallow } from "@liveblocks/client";
import type { ServerMsg } from "@liveblocks/core";
import { ClientMsgCode, CrdtType, ServerMsgCode } from "@liveblocks/core";
import { render } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import * as React from "react";

import { createRoomContext } from "../factory";
import {
  useCanRedo,
  useCanUndo,
  useMutation,
  useMyPresence,
  useObject,
  useOthers,
  useRoom,
  useStorage,
  useUndo,
} from "./_liveblocks.config";
import { act, renderHook, waitFor } from "./_utils"; // Basically re-exports from @testing-library/react

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
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

  function simulateIncomingMessage(
    msg: ServerMsg<JsonObject, BaseUserMeta, Json>
  ) {
    socket.callbacks.message.forEach((cb) =>
      cb({
        data: JSON.stringify(msg),
      } as MessageEvent)
    );
  }

  function simulateStorageLoaded() {
    simulateIncomingMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: [["root", { type: CrdtType.OBJECT, data: {} }]],
    });
  }

  function simulateExistingStorageLoaded() {
    simulateIncomingMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:0",
          {
            type: CrdtType.OBJECT,
            data: {},
            parentId: "root",
            parentKey: "obj",
          },
        ],
      ],
    });
  }

  function simulateAbnormalClose() {
    socket.callbacks.close[0]({
      reason: "",
      wasClean: false,
      code: WebSocketErrorCodes.CLOSE_ABNORMAL,
    } as CloseEvent);
  }

  function simulateUserJoins(actor: number, presence: JsonObject) {
    simulateIncomingMessage({
      type: ServerMsgCode.USER_JOINED,
      actor,
      id: undefined,
      info: undefined,
      scopes: [],
    });

    simulateIncomingMessage({
      type: ServerMsgCode.UPDATE_PRESENCE,
      targetActor: -1,
      data: presence,
      actor,
    });
  }

  // Simulator API
  return {
    // Field for introspection of simulator state
    sentMessages: socket.sentMessages,
    callbacks: socket.callbacks,

    //
    // Simulating actions (low level)
    //
    simulateIncomingMessage,
    simulateStorageLoaded,
    simulateExistingStorageLoaded,
    simulateAbnormalClose,

    //
    // Composed simulations
    //
    simulateUserJoins,
  };
}

describe("RoomProvider", () => {
  test("shouldInitiallyConnect equals false should not call the auth endpoint", () => {
    const authEndpointMock = jest.fn();
    const client = createClient({
      authEndpoint: authEndpointMock,
    });

    const { RoomProvider } = createRoomContext(client);

    render(
      <RoomProvider
        id="room"
        initialPresence={{}}
        shouldInitiallyConnect={false}
      >
        <></>
      </RoomProvider>
    );

    expect(authEndpointMock).not.toBeCalled();
  });

  test("shouldInitiallyConnect equals true should call the auth endpoint", () => {
    const authEndpointMock = jest.fn();
    const client = createClient({
      authEndpoint: authEndpointMock,
    });

    const { RoomProvider } = createRoomContext(client);

    render(
      <RoomProvider
        id="room"
        initialPresence={{}}
        shouldInitiallyConnect={true}
      >
        <></>
      </RoomProvider>
    );

    expect(authEndpointMock).toBeCalled();
  });
});

describe("useRoom", () => {
  test("initial presence should be sent to other users when socket is connected", async () => {
    renderHook(() => useRoom()); // Ignore return value here, this hook triggers the initialization side effect

    const sim = await websocketSimulator();
    expect(sim.sentMessages[0]).toBe(
      JSON.stringify([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
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
    act(() => sim.simulateUserJoins(1, { x: 2 }));

    expect(result.current).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);
  });

  test("others presence should be merged on update", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() => sim.simulateUserJoins(1, { x: 0 }));

    expect(result.current).toEqual([
      { connectionId: 1, presence: { x: 0 }, isReadOnly: false },
    ]);

    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { y: 0 },
        actor: 1,
      })
    );

    expect(result.current).toEqual([
      { connectionId: 1, presence: { x: 0, y: 0 }, isReadOnly: false },
    ]);
  });

  test("others presence should be cleared on close", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() => sim.simulateUserJoins(1, { x: 2 }));

    expect(result.current).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);

    act(() => sim.simulateAbnormalClose());

    expect(result.current).toEqual([]);
  });
});

describe("useObject", () => {
  test("initialization happens asynchronously", async () => {
    const { result } = renderHook(() => useObject("obj"));

    // On the initial render, this hook will return `null`
    expect(result.current).toBeNull();

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    expect(result.current?.toImmutable()).toEqual({
      a: 0,
      nested: ["foo", "bar"],
    });
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

describe("useStorage", () => {
  test("return null before storage has loaded", async () => {
    const { result } = renderHook(() => useStorage((root) => root.obj));
    expect(result.current).toBeNull();
  });

  test("nested data remains referentially equal between renders", async () => {
    const { result, rerender } = renderHook(() =>
      useStorage((root) => root.obj)
    );

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const render1 = result.current;
    rerender();
    const render2 = result.current;

    expect(render1).toEqual({ a: 0, nested: ["foo", "bar"] });
    expect(render2).toEqual({ a: 0, nested: ["foo", "bar"] });
    expect(render1).toBe(render2); // Referentially equal!
  });

  test("unchanged nested data remains referentially equal between mutations", async () => {
    const { result } = renderHook(() => useStorage((root) => root.obj));
    const { result: liveObj } = renderHook(() => useObject("obj")); // Used to trigger mutations

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const render1 = result.current!;
    act(() =>
      // Now, only change `a`, let `nested` remain untouched
      liveObj.current!.set("a", 1)
    );
    const render2 = result.current!;

    // Property `a` changed between renders...
    expect(render1.a).toEqual(0);
    expect(render2.a).toEqual(1);

    // ...but `nested` remained referentially equal
    expect(render1.nested).toEqual(["foo", "bar"]);
    expect(render2.nested).toEqual(["foo", "bar"]);
    expect(render1.nested).toBe(render2.nested); // Referentially equal!
  });

  test("arbitrary expressions", async () => {
    const { result } = renderHook(() =>
      useStorage((root) => JSON.stringify(root.obj).toUpperCase())
    );

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    expect(result.current).toEqual('{"A":0,"NESTED":["FOO","BAR"]}');
  });

  test("dynamically computed results remain referentially equal only when using shallow comparison", async () => {
    const { result } = renderHook(() =>
      useStorage(
        (root) => root.obj.nested.map((item) => item.toUpperCase()),
        shallow // <-- Important! Key line of the test!
      )
    );
    const { result: liveObj } = renderHook(() => useObject("obj")); // Used to trigger mutations

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const render1 = result.current!;
    act(() =>
      // Now, only change `a`, let `nested` remain untouched
      liveObj.current!.set("a", 1)
    );

    const render2 = result.current!;

    expect(render1).toEqual(["FOO", "BAR"]);
    expect(render2).toEqual(["FOO", "BAR"]);
    expect(render1).toBe(render2); // Referentially equal!
  });
});

describe("useCanUndo / useCanRedo", () => {
  test("can undo and redo", async () => {
    const canUndo = renderHook(() => useCanUndo());
    const canRedo = renderHook(() => useCanRedo());
    const undo = renderHook(() => useUndo());
    const mutation = renderHook(() =>
      useMutation(
        ({ storage }) => storage.get("obj").set("a", Math.random()),
        []
      )
    );

    expect(canUndo.result.current).toEqual(false);
    expect(canRedo.result.current).toEqual(false);

    const sim = await websocketSimulator();
    act(() => sim.simulateExistingStorageLoaded());

    expect(canUndo.result.current).toEqual(false);
    expect(canRedo.result.current).toEqual(false);

    // Run a mutation
    act(() => mutation.result.current());

    expect(canUndo.result.current).toEqual(true);
    expect(canRedo.result.current).toEqual(false);

    // Undo that!
    act(() => undo.result.current());

    expect(canUndo.result.current).toEqual(false);
    expect(canRedo.result.current).toEqual(true);

    // Run 3 mutations
    act(() => mutation.result.current());
    act(() => mutation.result.current());
    act(() => mutation.result.current());

    expect(canUndo.result.current).toEqual(true);
    expect(canRedo.result.current).toEqual(false);

    // Undo 2 of them
    act(() => undo.result.current());
    act(() => undo.result.current());

    expect(canUndo.result.current).toEqual(true);
    expect(canRedo.result.current).toEqual(true);

    // Undo the last one
    act(() => undo.result.current());

    expect(canUndo.result.current).toEqual(false);
    expect(canRedo.result.current).toEqual(true);
  });
});
