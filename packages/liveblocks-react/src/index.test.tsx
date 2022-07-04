import { createClient, LiveObject } from "@liveblocks/client";
import {
  ClientMsgCode,
  CrdtType,
  ServerMsgCode,
} from "@liveblocks/client/internal";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import * as React from "react";

import { createRoomContext } from "./factory";

/**
 * https://github.com/Luka967/websocket-close-codes
 */
enum WebSocketErrorCodes {
  CLOSE_ABNORMAL = 1006,
}

type Presence = {
  x: number;
};

type Storage = {
  obj: LiveObject<{
    a: number;
  }>;
};

const client = createClient({ authEndpoint: "/api/auth" });

const { RoomProvider, useObject, useOthers, useMyPresence } = createRoomContext<
  Presence,
  Storage
>(client);

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

const testIds = {
  meX: "me-x",
  incrementButton: "increment",
  errorMessage: "error-message",
  errorConstructorName: "error-constructor-name",
  othersJson: "othersJson",
  liveObject: "liveObject",
  unmount: "unmount",
};

function PresenceComponent() {
  const [me, setPresence] = useMyPresence();
  const others = useOthers();

  return (
    <div>
      <button
        data-testid={testIds.incrementButton}
        onClick={() => setPresence({ x: me.x + 1 })}
      >
        Increment
      </button>
      <div data-testid={testIds.meX}>{me.x}</div>
      <div data-testid={testIds.othersJson}>
        {JSON.stringify(others.toArray())}
      </div>
    </div>
  );
}

async function waitForSocketToBeConnected() {
  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));

  const socket = MockWebSocket.instances[0];
  expect(socket.callbacks.open.length).toBe(1);

  return socket;
}

describe("presence", () => {
  test("initial presence should be set on state immediately", async () => {
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

    expect(screen.getByTestId(testIds.meX).textContent).toBe("1");

    await waitForSocketToBeConnected();
  });

  // test("updating room should disconnect and reconnect and replace initial presence", async () => {
  //   const client = createClient({ authEndpoint: "/api/auth" });

  //   const { rerender } = render(
  //     <LiveblocksProvider client={client}>
  //       <PresenceComponent room="room" initialPresence={{ x: 1 }} />
  //     </LiveblocksProvider>
  //   );

  //   expect(screen.getByTestId(testIds.meX).textContent).toBe("1");

  //   await waitForSocketToBeConnected();

  //   MockWebSocket.instances = [];

  //   rerender(
  //     <LiveblocksProvider client={client}>
  //       <PresenceComponent room="room-b" initialPresence={{ x: 2 }} />
  //     </LiveblocksProvider>
  //   );

  //   expect(screen.getByTestId(testIds.meX).textContent).toBe("1");

  //   await waitForSocketToBeConnected();
  // });

  test("initial presence should be sent to other users when socket is connected", async () => {
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

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
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

    await waitForSocketToBeConnected();

    expect(screen.getByTestId(testIds.meX).textContent).toBe("1");

    act(() => {
      fireEvent.click(screen.getByTestId(testIds.incrementButton));
    });

    expect(screen.getByTestId(testIds.meX).textContent).toBe("2");
  });

  test("others presence should be set on update", async () => {
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(screen.getByTestId(testIds.othersJson).textContent).toEqual(
      JSON.stringify([
        {
          connectionId: 1,
          presence: {
            x: 2,
          },
        },
      ])
    );
  });

  test("others presence should be merged on update", async () => {
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 0 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(screen.getByTestId(testIds.othersJson).textContent).toEqual(
      JSON.stringify([
        {
          connectionId: 1,
          presence: {
            x: 0,
          },
        },
      ])
    );

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { y: 0 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(screen.getByTestId(testIds.othersJson).textContent).toEqual(
      JSON.stringify([
        {
          connectionId: 1,
          presence: {
            x: 0,
            y: 0,
          },
        },
      ])
    );
  });

  // test.only("reconnect websocket if server close connection unexpectedly", async () => {
  //   const client = createClient({ authEndpoint: "/api/auth" });

  //   render(
  //     <LiveblocksProvider client={client}>
  //       <PresenceComponent room="room" initialPresence={{ x: 1 }} />
  //     </LiveblocksProvider>
  //   );

  //   let socket = await waitForSocketToBeConnected();

  //   socket.callbacks.open[0]();

  //   act(() => {
  //     socket.callbacks.close[0]({
  //       reason: "",
  //       wasClean: false,
  //       code: WebSocketErrorCodes.CLOSE_ABNORMAL,
  //     } as CloseEvent);
  //   });

  //   MockWebSocket.instances = [];

  //   socket = await waitForSocketToBeConnected();

  //   socket.callbacks.open[0]();

  //   expect(socket.sentMessages[0]).toStrictEqual(
  //     JSON.stringify({
  //       type: ClientMsgCode.UPDATE_PRESENCE,
  //       data: { x: 1 },
  //     })
  //   );
  // });

  test("others presence should be cleared on close", async () => {
    render(
      <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
        <PresenceComponent />
      </RoomProvider>
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        }),
      } as MessageEvent);
    });

    expect(screen.getByTestId(testIds.othersJson).textContent).toEqual(
      JSON.stringify([
        {
          connectionId: 1,
          presence: {
            x: 2,
          },
        },
      ])
    );

    act(() => {
      socket.callbacks.close[0]({
        reason: "",
        wasClean: false,
        code: WebSocketErrorCodes.CLOSE_ABNORMAL,
      } as CloseEvent);
    });

    expect(screen.getByTestId(testIds.othersJson).textContent).toEqual(
      JSON.stringify([])
    );
  });
});

function ObjectComponent() {
  const obj = useObject("obj");
  return (
    <div data-testid={testIds.liveObject}>
      {obj == null ? "Loading" : JSON.stringify(obj.toObject())}
    </div>
  );
}

function ObjectComponentWithSuspense() {
  const obj = useObject("obj", { suspense: true });
  return (
    <div data-testid={testIds.liveObject}>{JSON.stringify(obj.toObject())}</div>
  );
}

function UnmountContainer({ children }: { children: React.ReactElement }) {
  const [isVisible, setIsVisible] = React.useState(true);

  return (
    <div>
      <button
        data-testid={testIds.unmount}
        onClick={() => {
          setIsVisible(!isVisible);
        }}
      >
        {isVisible ? "Unmount" : "Mount"}
      </button>
      {isVisible && children}
    </div>
  );
}

describe("Storage", () => {
  test("useObject initialization", async () => {
    render(
      <RoomProvider
        id="room"
        initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
      >
        <ObjectComponent />
      </RoomProvider>
    );

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Loading"
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Loading"
    );

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });

    await waitFor(() =>
      expect(screen.getByTestId(testIds.liveObject).textContent).toBe(
        JSON.stringify({ a: 0 })
      )
    );
  });

  test("unmounting useObject while storage is loading should not cause a memory leak", async () => {
    render(
      <RoomProvider
        id="room"
        initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
      >
        <UnmountContainer>
          <ObjectComponent />
        </UnmountContainer>
      </RoomProvider>
    );

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Loading"
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Loading"
    );

    act(() => {
      fireEvent.click(screen.getByTestId(testIds.unmount));
    });

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });
  });
});

describe("Storage (with Suspense)", () => {
  test("useObject initialization", async () => {
    render(
      <RoomProvider
        id="room"
        initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
      >
        <Suspense fallback={"Suspended..."}>
          <ObjectComponent />
        </Suspense>
      </RoomProvider>
    );

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Suspended..."
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Suspended..."
    );

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });

    await waitFor(() =>
      expect(screen.getByTestId(testIds.liveObject).textContent).toBe(
        JSON.stringify({ a: 0 })
      )
    );
  });

  test("unmounting useObject while storage is loading should not cause a memory leak", async () => {
    render(
      <RoomProvider
        id="room"
        initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
      >
        <Suspense fallback={"Suspended..."}>
          <UnmountContainer>
            <ObjectComponentWithSuspense />
          </UnmountContainer>
        </Suspense>
      </RoomProvider>
    );

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Suspended..."
    );

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]();

    expect(screen.getByTestId(testIds.liveObject).textContent).toEqual(
      "Suspended..."
    );

    act(() => {
      fireEvent.click(screen.getByTestId(testIds.unmount));
    });

    act(() => {
      socket.callbacks.message[0]({
        data: JSON.stringify({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        }),
      } as MessageEvent);
    });
  });
});
