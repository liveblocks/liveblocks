import { rest } from "msw";
import { setupServer } from "msw/node";
import { createClient } from "@liveblocks/client";
import { middleware } from ".";
import create from "zustand";
import { StateCreator } from "zustand";
import {
  ClientMessageType,
  OpType,
  SerializedCrdtWithId,
  ServerMessage,
  ServerMessageType,
} from "@liveblocks/client/lib/cjs/live";
import { list, MockWebSocket, obj, waitFor } from "../test/utils";

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

  items: Array<{ text: string }>;
  setItems: (newItems: Array<{ text: string }>) => void;

  mappedToFalse: number;
  setMappedToFalse: (newValue: number) => void;

  notMapped: string;
  setNotMapped: (newValue: string) => void;

  cursor: { x: number; y: number };
  setCursor: (cursor: { x: number; y: number }) => void;
};

const basicStateCreator: StateCreator<BasicStore> = (set) => ({
  value: 0,
  setValue: (newValue: number) => set({ value: newValue }),

  items: [],
  setItems: (items: Array<{ text: string }>) => set({ items }),

  mappedToFalse: 0,
  setMappedToFalse: (newValue: number) => set({ value: newValue }),

  notMapped: "default",
  setNotMapped: (notMapped: string) => set({ notMapped }),

  cursor: { x: 0, y: 0 },
  setCursor: (cursor: { x: number; y: number }) => set({ cursor }),
});

function prepareClientAndStore() {
  const client = createClient({ authEndpoint: "/api/auth" });

  const store = create(
    middleware<BasicStore, any>(basicStateCreator, {
      client,
      storageMapping: { value: true, mappedToFalse: false, items: true },
      presenceMapping: { cursor: true },
    })
  );

  return { client, store };
}

async function prepareWithStorage(
  items: SerializedCrdtWithId[],
  options?: {
    room?: string;
    initialState?: any;
  }
) {
  const { client, store } = prepareClientAndStore();

  store
    .getState()
    .liveblocks.enter(options?.room || "room", options?.initialState || {});

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.open[0]!();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMessageType.InitialStorageState,
      items,
    }),
  } as MessageEvent);

  function sendMessage(serverMessage: ServerMessage) {
    socket.callbacks.message[0]!({
      data: JSON.stringify(serverMessage),
    } as MessageEvent);
  }

  await waitFor(() => !store.getState().liveblocks.isStorageLoading);

  return { client, store, socket, sendMessage };
}

describe("middleware", () => {
  test("init middleware", () => {
    const { store } = prepareClientAndStore();

    const { liveblocks, value } = store.getState();

    // Others should be empty before entering the room
    expect(liveblocks.others).toEqual([]);
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const { store } = prepareClientAndStore();

    const { liveblocks } = store.getState();

    liveblocks.enter("room", {});

    expect(store.getState().liveblocks.isStorageLoading).toBe(true);

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    socket.callbacks.message[0]!({
      data: JSON.stringify({
        type: ServerMessageType.InitialStorageState,
        items: [obj("root", {})],
      }),
    } as MessageEvent);

    await waitFor(() => store.getState().liveblocks.isStorageLoading === false);
  });

  test("enter room should set the connection to open", async () => {
    const { store } = prepareClientAndStore();

    const { liveblocks } = store.getState();

    liveblocks.enter("room", {});

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    expect(store.getState().liveblocks.connection).toBe("open");
  });

  describe("presence", () => {
    test("should broadcast presence when connecting to the room", async () => {
      const { store } = prepareClientAndStore();

      const { liveblocks } = store.getState();

      liveblocks.enter("room", {});

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      expect(socket.sentMessages[0]).toEqual(
        JSON.stringify([
          {
            type: ClientMessageType.UpdatePresence,
            data: { cursor: { x: 0, y: 0 } },
          },
          {
            type: ClientMessageType.FetchStorage,
          },
        ])
      );
    });

    test("should update presence if state is updated", async () => {
      const { store } = prepareClientAndStore();

      const { liveblocks } = store.getState();

      liveblocks.enter("room", {});

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      expect(socket.sentMessages[0]).toEqual(
        JSON.stringify([
          {
            type: ClientMessageType.UpdatePresence,
            data: { cursor: { x: 0, y: 0 } },
          },
          {
            type: ClientMessageType.FetchStorage,
          },
        ])
      );

      store.getState().setCursor({ x: 1, y: 1 });

      await waitFor(() => socket.sentMessages[1] != null);

      expect(socket.sentMessages[1]).toEqual(
        JSON.stringify([
          {
            type: ClientMessageType.UpdatePresence,
            data: { cursor: { x: 1, y: 1 } },
          },
        ])
      );
    });

    test("should set liveblocks.others if there are others users in the room", async () => {
      const { store } = prepareClientAndStore();

      const { liveblocks } = store.getState();

      liveblocks.enter("room", {});

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      socket.callbacks.message[0]!({
        data: JSON.stringify({
          type: ServerMessageType.RoomState,
          users: {
            "1": {
              info: { name: "Testy McTester" },
            },
          },
        } as ServerMessage),
      } as MessageEvent);

      expect(store.getState().liveblocks.others).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: {
            name: "Testy McTester",
          },
        },
      ]);
    });
  });

  describe("storage", () => {
    describe("initialization", () => {
      test("should initialize if mapping key is true", async () => {
        const { store } = await prepareWithStorage([obj("root", { value: 1 })]);

        expect(store.getState().value).toBe(1);
      });

      test("should not initialize if mapping key does not exist", async () => {
        const { store } = await prepareWithStorage([
          obj("root", { notMapped: "not mapped" }),
        ]);

        expect(store.getState().notMapped).toBe("default");
      });

      test("should not initialize if mapping key is false", async () => {
        const { store } = await prepareWithStorage([
          obj("root", { mappedToFalse: 1 }),
        ]);

        expect(store.getState().mappedToFalse).toBe(0);
      });

      test("should initialize with default state if key is missing from liveblocks storage", async () => {
        const { store, socket } = await prepareWithStorage([obj("root", {})], {
          initialState: {
            value: 5,
          },
        });

        expect(store.getState().value).toBe(5);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(socket.sentMessages[1]).toEqual(
          JSON.stringify([
            {
              type: ClientMessageType.UpdateStorage,
              ops: [
                {
                  opId: "0:0",
                  id: "root",
                  type: OpType.UpdateObject,
                  data: { value: 5 },
                },
              ],
            },
          ])
        );
      });

      test("should batch initialization", async () => {
        const { store, socket } = await prepareWithStorage([obj("root", {})], {
          initialState: {
            value: 5,
            items: [],
          },
        });

        expect(store.getState().value).toBe(5);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(socket.sentMessages[1]).toEqual(
          JSON.stringify([
            {
              type: ClientMessageType.UpdateStorage,
              ops: [
                {
                  opId: "0:0",
                  id: "root",
                  type: OpType.UpdateObject,
                  data: { value: 5 },
                },
                {
                  id: "0:0",
                  opId: "0:2", // TODO: We currently have a tiny issue in LiveObject.update who generate an opId 0:1 for a potential UpdateObject
                  type: OpType.CreateList,
                  parentId: "root",
                  parentKey: "items",
                },
              ],
            },
          ])
        );
      });

      test("should not override liveblocks state with initial state if key exists", async () => {
        const { store, socket } = await prepareWithStorage(
          [obj("root", { value: 1 })],
          {
            initialState: {
              value: 5,
            },
          }
        );

        expect(store.getState().value).toBe(1);

        expect(socket.sentMessages[1]).toEqual(undefined);
      });
    });

    describe("remote updates", () => {
      test("should update state if mapping allows it", async () => {
        const { store, sendMessage } = await prepareWithStorage([
          obj("root", { value: 1 }),
        ]);

        sendMessage({
          type: ServerMessageType.UpdateStorage,
          ops: [
            {
              type: OpType.UpdateObject,
              id: "root",
              data: {
                value: 2,
              },
            },
          ],
        });

        expect(store.getState().value).toBe(2);
      });

      test("should not update state if key is not part of the mapping", async () => {
        const { store, sendMessage } = await prepareWithStorage([
          obj("root", { value: 1 }),
        ]);

        sendMessage({
          type: ServerMessageType.UpdateStorage,
          ops: [
            {
              type: OpType.UpdateObject,
              id: "root",
              data: {
                notMapped: "hey",
              },
            },
          ],
        });

        expect(store.getState().notMapped).toBe("default");
      });
    });

    describe("patching Liveblocks state", () => {
      test("should update liveblocks state if mapping allows it", async () => {
        const { store, socket } = await prepareWithStorage([
          obj("root", { value: 1 }),
        ]);

        store.getState().setValue(2);

        expect(socket.sentMessages[1]).toEqual(
          JSON.stringify([
            {
              type: ClientMessageType.UpdateStorage,
              ops: [
                {
                  opId: "0:0",
                  id: "root",
                  type: OpType.UpdateObject,
                  data: { value: 2 },
                },
              ],
            },
          ])
        );
      });

      test("should batch modifications", async () => {
        const { store, socket } = await prepareWithStorage([
          obj("root", { value: 1 }),
          list("1:0", "root", "items"),
        ]);

        store.getState().setItems([{ text: "A" }, { text: "B" }]);

        expect(socket.sentMessages[1]).toEqual(
          JSON.stringify([
            {
              type: ClientMessageType.UpdateStorage,
              ops: [
                {
                  id: "0:0",
                  opId: "0:0",
                  type: OpType.CreateObject,
                  parentId: "1:0",
                  parentKey: "!",
                  data: { text: "A" },
                },
                {
                  id: "0:1",
                  opId: "0:1",
                  type: OpType.CreateObject,
                  parentId: "1:0",
                  parentKey: '"',
                  data: { text: "B" },
                },
              ],
            },
          ])
        );
      });
    });
  });

  describe("history", () => {
    test("undo", async () => {
      const { store } = await prepareWithStorage([obj("root", { value: 1 })]);

      expect(store.getState().value).toBe(1);

      store.getState().setValue(2);

      expect(store.getState().value).toBe(2);

      store.getState().liveblocks.history.undo();

      expect(store.getState().value).toBe(1);
    });
  });

  describe("configuration validation", () => {
    test("missing client should throw", () => {
      expect(() =>
        middleware(() => ({}), { client: undefined as any, storageMapping: {} })
      ).toThrow();
    });

    test("missing mapping should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        middleware(() => ({}), { client, storageMapping: null as any })
      ).toThrow();
    });

    test("invalid storageMapping type should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        middleware(() => ({}), {
          client,
          storageMapping: "invalid_mapping" as any,
        })
      ).toThrow();
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        middleware(() => ({}), {
          client,
          storageMapping: { key: "value" },
        })
      ).toThrow();
    });

    test("duplicated key should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        middleware(() => ({}), {
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow();
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        middleware(() => ({}), {
          client,
          storageMapping: {},
          presenceMapping: "invalid_mapping",
        })
      ).toThrow();
    });
  });
});
