import { rest } from "msw";
import { setupServer } from "msw/node";
import { createClient } from "@liveblocks/client";
import { Mapping, middleware } from ".";
import create from "zustand/vanilla";
import { StateCreator } from "zustand";
import {
  CrdtType,
  SerializedCrdtWithId,
  ServerMessageType,
} from "@liveblocks/client/lib/cjs/live";

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
    // TODO: Fix TS issue
    remove(this.callbacks[event] as any, callback);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {}
}

window.WebSocket = MockWebSocket as any;

const server = setupServer(
  rest.post("/api/auth", (req, res, ctx) => {
    return res(
      ctx.json({
        token:
          // actor = 0
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJrNXdtaDBGOVVMbHJ6TWdadFMyWl8iLCJhcHBJZCI6IjYwNWE0ZmQzMWEzNmQ1ZWE3YTJlMDkxNCIsImFjdG9yIjowLCJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2N30.AinBUN1gzA1-QdwrQ3cT1X4tNM_7XYCkKgHH94M5wszX-1AEDIgsBdM_7qN9cv0Y7SDFTUVGYLinHgpBonE8tYiNTe4uSpVUmmoEWuYLgsdUccHj5IJYlxPDGb1mgesSNKdeyfkFnu8nFjramLQXBa5aBb5Xq721m4Lgy2dtL_nFicavhpyCsdTVLSjloCDlQpQ99UPY--3ODNbbznHGYu8IyI1DnqQgDPlbAbFPRF6CBZiaUZjSFTRGnVVPE0VN3NunKHimMagBfHrl4AMmxG4kFN8ImK1_7oXC_br1cqoyyBTs5_5_XeA9MTLwbNDX8YBPtjKP1z2qTDpEc22Oxw",
      })
    );
  }),
  rest.post("/api/auth-fail", (req, res, ctx) => {
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
  await waitFor(() => MockWebSocket.instances.length === 1);

  const socket = MockWebSocket.instances[0]!;
  expect(socket.callbacks.open.length).toBe(1);

  return socket;
}

type BasicStore = {
  value: number;
  setValue: (newValue: number) => void;
};

function prepareClientAndStore<T extends Object>(
  stateCreator: StateCreator<T>,
  mapping: Mapping<T> = {}
) {
  const client = createClient({ authEndpoint: "/api/auth" });

  const store = create(
    middleware<T, any>(stateCreator, {
      client,
      mapping: {},
      presenceMapping: {},
    })
  );

  return { client, store };
}

async function prepare<T extends Object>(
  stateCreator: StateCreator<T>,
  room: string,
  items: SerializedCrdtWithId[]
) {
  const { client, store } = prepareClientAndStore<T>(stateCreator);

  store.getState().enter(room);

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.open[0]!();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMessageType.InitialStorageState,
      items,
    }),
  } as MessageEvent);

  return { client, store };
}

describe("middleware", () => {
  test("init middleware", () => {
    const { client, store } = prepareClientAndStore<BasicStore>((set) => ({
      value: 0,
      setValue: (newValue: number) => set({ value: newValue }),
    }));

    const { others, value, me } = store.getState();

    expect(others).toEqual([]);
    expect(value).toBe(0);
    expect(me).toBe(null);
  });

  test("enter room should set the connection to open", async () => {
    const { client, store } = await prepare<BasicStore>(
      (set) => ({
        value: 0,
        setValue: (newValue: number) => set({ value: newValue }),
      }),
      "room",
      [obj("root", {})]
    );

    expect(store.getState().connection).toBe("open");

    expect(true).toBe(true);
  });
});

export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}

export function obj(
  id: string,
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Object,
      data,
      parentId,
      parentKey,
    },
  ];
}

export function list(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.List,
      parentId,
      parentKey,
    },
  ];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Map,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedRegister(
  id: string,
  parentId: string,
  parentKey: string,
  data: any
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Register,
      parentId,
      parentKey,
      data,
    },
  ];
}
