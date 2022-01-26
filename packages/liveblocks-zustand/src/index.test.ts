import { rest } from "msw";
import { setupServer } from "msw/node";
import { createClient } from "@liveblocks/client";
import { Mapping, middleware } from ".";
import create from "zustand";
import { StateCreator } from "zustand";
import {
  SerializedCrdtWithId,
  ServerMessageType,
} from "@liveblocks/client/lib/cjs/live";
import { MockWebSocket, obj, waitFor } from "../test/utils";

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

const basicStateCreator: StateCreator<BasicStore> = (set) => ({
  value: 0,
  setValue: (newValue: number) => set({ value: newValue }),
});

function prepareClientAndStore<T extends Object>(
  stateCreator: StateCreator<T>,
  mapping: Mapping<T> = {}
) {
  const client = createClient({ authEndpoint: "/api/auth" });

  const store = create(
    middleware<T, any>(stateCreator, {
      client,
      mapping,
      presenceMapping: {},
    })
  );

  return { client, store };
}

async function prepareWithStorage<T extends Object>(
  stateCreator: StateCreator<T>,
  items: SerializedCrdtWithId[],
  options?: {
    room?: string;
    mapping?: Mapping<T>;
  }
) {
  const { client, store } = prepareClientAndStore<T>(
    stateCreator,
    options?.mapping
  );

  store.getState().liveblocks.enter(options?.room || "room");

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.open[0]!();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMessageType.InitialStorageState,
      items,
    }),
  } as MessageEvent);

  await waitFor(() => !store.getState().liveblocks.isStorageLoading);

  return { client, store };
}

describe("middleware", () => {
  test("init middleware", () => {
    const { store } = prepareClientAndStore(basicStateCreator);

    const { liveblocks, value } = store.getState();

    // Others should be empty before entering the room
    expect(liveblocks.others).toEqual([]);
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const { store } = prepareClientAndStore(basicStateCreator);

    const { liveblocks } = store.getState();

    liveblocks.enter("room");

    expect(store.getState().liveblocks.isStorageLoading).toBe(true);

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    socket.callbacks.message[0]!({
      data: JSON.stringify({
        type: ServerMessageType.InitialStorageState,
        items: [obj("root", {})],
      }),
    } as MessageEvent);

    await waitFor(() => !store.getState().liveblocks.isStorageLoading);
  });

  test("enter room should set the connection to open", async () => {
    const { store } = prepareClientAndStore<BasicStore>((set) => ({
      value: 0,
      setValue: (newValue: number) => set({ value: newValue }),
    }));

    const { liveblocks } = store.getState();

    liveblocks.enter("room");

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    expect(store.getState().liveblocks.connection).toBe("open");
  });

  test("storage initialize storage if storage mapping key is true", async () => {
    const { store } = await prepareWithStorage(
      basicStateCreator,
      [obj("root", { value: 1 })],
      { mapping: { value: true } }
    );

    expect(store.getState().value).toBe(1);
  });
});
