import { createClient, shallow } from "@liveblocks/client";
import type { ThreadData } from "@liveblocks/core";
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
  useThreads,
  useUndo,
} from "./_liveblocks.config";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import { act, renderHook, wait } from "./_utils"; // Basically re-exports from @testing-library/react

const exampleToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-";
let requestCount = 0;
const server = setupServer(
  rest.post("/api/auth", (_, res, ctx) => {
    return res(
      ctx.json({
        token:
          // Append a unique counter in the (unchecked) signature part of the
          // JWT token at the end, to make each subsequent request return
          // a unique value
          `${exampleToken}${requestCount++}`,
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
      {
        connectionId: 1,
        presence: { x: 2 },
        canWrite: true,
        canComment: true,
        isReadOnly: false,
      },
    ]);
  });

  test("others presence should be merged on update", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() => sim.simulateUserJoins(1, { x: 0 }));

    expect(result.current).toEqual([
      {
        connectionId: 1,
        presence: { x: 0 },
        canWrite: true,
        canComment: true,
        isReadOnly: false,
      },
    ]);

    act(() =>
      sim.simulateIncomingMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { y: 0 },
        actor: 1,
      })
    );

    expect(result.current).toEqual([
      {
        connectionId: 1,
        presence: { x: 0, y: 0 },
        canWrite: true,
        canComment: true,
        isReadOnly: false,
      },
    ]);
  });

  test("others presence should be cleared on close", async () => {
    const { result } = renderHook(() => useOthers());

    const sim = await websocketSimulator();
    act(() => sim.simulateUserJoins(1, { x: 2 }));

    expect(result.current).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        canComment: true,
        canWrite: true,
        isReadOnly: false,
      },
    ]);

    act(() => sim.simulateAbnormalClose());

    expect(result.current).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        canWrite: true,
        canComment: true,
        isReadOnly: false,
      },
    ]);

    // After 100ms (half the lostConnectionTimeout value), the others aren't
    // cleared yet
    await wait(100);
    expect(result.current).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        canWrite: true,
        canComment: true,
        isReadOnly: false,
      },
    ]);

    // After another 100ms we crossed the lostConnectionTimeout, so the others
    // are cleared out
    await wait(100);
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
  test("return null before storage has loaded", () => {
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

describe("useThreads", () => {
  test("should return { isLoading: true } as initial state", () => {
    const { result } = renderHook(() => useThreads());

    expect(result.current).toEqual({ isLoading: true });
  });

  test("should load threads on mount", async () => {
    const threads: ThreadData[] = [
      {
        id: "th_xxx",
        metadata: {},
        roomId: "room",
        type: "thread",
        createdAt: "2021-10-06T01:45:56.558Z",
        comments: [],
      },
    ];

    server.use(
      rest.get(
        "https://api.liveblocks.io/v2/c/rooms/room/threads",
        (_, res, ctx) => {
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { result } = renderHook(() => useThreads());

    await websocketSimulator();

    expect(result.current).toEqual({ isLoading: false, threads });
  });
});
