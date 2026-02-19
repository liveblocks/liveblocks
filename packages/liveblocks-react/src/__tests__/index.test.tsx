import { createClient, shallow } from "@liveblocks/client";
import { ClientMsgCode, ServerMsgCode, wait } from "@liveblocks/core";
import { render } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";

import { createRoomContext } from "../room";
import {
  useCanRedo,
  useCanUndo,
  useIsInsideRoom,
  useMutation,
  useMyPresence,
  useOthers,
  useRoom,
  useStorage,
  useUndo,
} from "./_liveblocks.config";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import { act, renderHook } from "./_utils"; // Basically re-exports from @testing-library/react

// Access token with perms: { "*": ["room:write"] } - missing last char so we can append counter
const exampleToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyIqIjpbInJvb206d3JpdGUiXX0sImsiOiJhY2MifQ.OwLJdtVzMmIwIGO4gVWEJSng3DaUFsljpFXKE0Jcl1OTSHKCpDqJDkHMkkhgHmpUbBPMMdf8QmYa-4h4tMAikxzZL_tFdWQ-5kr92jOFqXPscDQTk0_GCMhv7R6vFj4YjT-msYVNVPI5M0Jlmm9fU5U_s3ZssEYhQl6AYkZT0XErrFYch8WmCVCIQ3bmFuUg5WDtnGJFiQIuCvLr0RyalJh4aILKPZ7ii_u9Q04__rN5kUhIqh2NaXWqFwsITuKaFwn24PJfBz-GJNX5Jk-tlmfJItkPFuBFp3WY8J9r9m59rJF35W_UxMU1tBNYVYRs8c3pjJKdnBiSUDUjNPvxr";
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
  MockWebSocket.reset();
});
beforeEach(() => {
  MockWebSocket.reset();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RoomProvider", () => {
  test("autoConnect equals false should not call the auth endpoint", () => {
    const authEndpointMock = jest.fn();
    const client = createClient({
      authEndpoint: authEndpointMock,
    });

    const { RoomProvider } = createRoomContext(client);

    render(
      <RoomProvider id="room" autoConnect={false}>
        <></>
      </RoomProvider>
    );

    expect(authEndpointMock).not.toHaveBeenCalled();
  });

  test("autoConnect equals true should call the auth endpoint", () => {
    const authEndpointMock = jest.fn();
    const client = createClient({
      authEndpoint: authEndpointMock,
    });

    const { RoomProvider } = createRoomContext(client);

    render(
      <RoomProvider id="room" autoConnect={true}>
        <></>
      </RoomProvider>
    );

    expect(authEndpointMock).toHaveBeenCalled();
  });

  // TODO: This behavior is a bug that should be fixed. Each createRoomContext()
  // call should create its own isolated React context, allowing nested providers
  // from different contexts to coexist independently.
  test("nested providers from different contexts share the same React context", () => {
    const client = createClient({ authEndpoint: "/api/auth" });

    const contextA = createRoomContext(client);
    const contextB = createRoomContext(client);

    function TestComponent() {
      const roomA = contextA.useRoom();
      const roomB = contextB.useRoom();
      return (
        <div>
          <span data-testid="room-a">{roomA.id}</span>
          <span data-testid="room-b">{roomB.id}</span>
        </div>
      );
    }

    const { getByTestId } = render(
      <contextA.RoomProvider
        id="room-a"
        initialPresence={{}}
        autoConnect={false}
      >
        <contextB.RoomProvider
          id="room-b"
          initialPresence={{}}
          autoConnect={false}
        >
          <TestComponent />
        </contextB.RoomProvider>
      </contextA.RoomProvider>
    );

    // All contexts share the same underlying RoomContext, so the innermost
    // provider wins and both hooks return the same room
    expect(getByTestId("room-a").textContent).toBe("room-b"); // TODO: Should be "room-a" once fixed
    expect(getByTestId("room-b").textContent).toBe("room-b");
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

describe("useRoom({ allowOutsideRoom })", () => {
  test("useRoom({ allowOutsideRoom }) should not return null when inside room", () => {
    const { result } = renderHook(() => useRoom({ allowOutsideRoom: true }));
    const room = result.current;
    expect(room).not.toBe(null);
  });

  test("useRoom({ allowOutsideRoom }) should return null when outside room", () => {
    const { result } = renderHook(() => useRoom({ allowOutsideRoom: true }), {
      wrapper: undefined, // Skip using RoomProvider wrapper
    });
    const room = result.current;
    expect(room).toBe(null);
  });
});

describe("useIsInsideRoom", () => {
  test("useIsInsideRoom should return true inside a room", () => {
    const { result } = renderHook(() => useIsInsideRoom());
    const isInsideRoom = result.current;
    expect(isInsideRoom).toBe(true);
  });

  test("useIsInsideRoom should return false outside a room", () => {
    const { result } = renderHook(() => useIsInsideRoom(), {
      wrapper: undefined, // Skip using RoomProvider wrapper
    });
    const isInsideRoom = result.current;
    expect(isInsideRoom).toBe(false);
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
    const { result: mut } = renderHook(() =>
      useMutation(({ storage }) => storage.get("obj").set("a", 1), [])
    ); // Used to trigger mutations

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const render1 = result.current!;
    act(() => mut.current());
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
    const { result: mut } = renderHook(() =>
      useMutation(({ storage }) => storage.get("obj").set("a", 1), [])
    ); // Used to trigger mutations

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const render1 = result.current!;
    act(() =>
      // Now, only change `a`, let `nested` remain untouched
      mut.current()
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
