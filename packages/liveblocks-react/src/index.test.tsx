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
import * as React from "react";

import {
  LiveblocksProvider,
  RoomProvider,
  useMyPresence,
  useObject,
  useOthers,
} from ".";

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

  addEventListener(
    event: "open" | "close" | "message",
    callback: (event: any) => void
  ) {
    this.callbacks[event].push(callback);
  }

  removeEventListener(
    event: "open" | "close" | "message",
    callback: (event: any) => void
  ) {
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
          // actor = 0
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJrNXdtaDBGOVVMbHJ6TWdadFMyWl8iLCJhcHBJZCI6IjYwNWE0ZmQzMWEzNmQ1ZWE3YTJlMDkxNCIsImFjdG9yIjowLCJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2N30.AinBUN1gzA1-QdwrQ3cT1X4tNM_7XYCkKgHH94M5wszX-1AEDIgsBdM_7qN9cv0Y7SDFTUVGYLinHgpBonE8tYiNTe4uSpVUmmoEWuYLgsdUccHj5IJYlxPDGb1mgesSNKdeyfkFnu8nFjramLQXBa5aBb5Xq721m4Lgy2dtL_nFicavhpyCsdTVLSjloCDlQpQ99UPY--3ODNbbznHGYu8IyI1DnqQgDPlbAbFPRF6CBZiaUZjSFTRGnVVPE0VN3NunKHimMagBfHrl4AMmxG4kFN8ImK1_7oXC_br1cqoyyBTs5_5_XeA9MTLwbNDX8YBPtjKP1z2qTDpEc22Oxw",
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
  const [me, setPresence] = useMyPresence<{ x: number }>();
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
    );

    await waitForSocketToBeConnected();

    expect(screen.getByTestId(testIds.meX).textContent).toBe("1");

    act(() => {
      fireEvent.click(screen.getByTestId(testIds.incrementButton));
    });

    expect(screen.getByTestId(testIds.meX).textContent).toBe("2");
  });

  test("others presence should be set on update", async () => {
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider id="room" initialPresence={() => ({ x: 1 })}>
          <PresenceComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });

    render(
      <LiveblocksProvider client={client}>
        <RoomProvider
          id="room"
          initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
        >
          <ObjectComponent />
        </RoomProvider>
      </LiveblocksProvider>
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
    const client = createClient({ authEndpoint: "/api/auth" });
    render(
      <LiveblocksProvider client={client}>
        <RoomProvider
          id="room"
          initialStorage={() => ({ obj: new LiveObject({ a: 0 }) })}
        >
          <UnmountContainer>
            <ObjectComponent />
          </UnmountContainer>
        </RoomProvider>
      </LiveblocksProvider>
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
