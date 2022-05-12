import type { JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  RoomStateMessage,
  SerializedCrdtWithId,
  ServerMessage,
} from "@liveblocks/client/internal";
import {
  ClientMessageType,
  OpType,
  ServerMessageType,
} from "@liveblocks/client/internal";
import type { Reducer } from "@reduxjs/toolkit";
import { configureStore } from "@reduxjs/toolkit";
import { rest } from "msw";
import { setupServer } from "msw/node";

import { list, MockWebSocket, obj, waitFor } from "../test/utils";
import type { LiveblocksState, Mapping } from ".";
import { actions, enhancer } from ".";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingValueShouldBeABoolean,
  missingClient,
} from "./errors";
window.WebSocket = MockWebSocket as any;

const { enterRoom, leaveRoom } = actions;

const server = setupServer(
  rest.post("/api/auth", (_req, res, ctx) => {
    return res(
      ctx.json({
        token:
          // actor = 0
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJrNXdtaDBGOVVMbHJ6TWdadFMyWl8iLCJhcHBJZCI6IjYwNWE0ZmQzMWEzNmQ1ZWE3YTJlMDkxNCIsImFjdG9yIjowLCJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2N30.AinBUN1gzA1-QdwrQ3cT1X4tNM_7XYCkKgHH94M5wszX-1AEDIgsBdM_7qN9cv0Y7SDFTUVGYLinHgpBonE8tYiNTe4uSpVUmmoEWuYLgsdUccHj5IJYlxPDGb1mgesSNKdeyfkFnu8nFjramLQXBa5aBb5Xq721m4Lgy2dtL_nFicavhpyCsdTVLSjloCDlQpQ99UPY--3ODNbbznHGYu8IyI1DnqQgDPlbAbFPRF6CBZiaUZjSFTRGnVVPE0VN3NunKHimMagBfHrl4AMmxG4kFN8ImK1_7oXC_br1cqoyyBTs5_5_XeA9MTLwbNDX8YBPtjKP1z2qTDpEc22Oxw",
      })
    );
  }),
  rest.post("/api/auth-fail", (_req, res, ctx) => {
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

function prepareClientAndStore<T>(
  reducer: Reducer<T>,
  options: {
    storageMapping: Mapping<T>;
    presenceMapping: Mapping<T>;
  },
  preloadedState?: T
) {
  const client = createClient({ authEndpoint: "/api/auth" });
  const store = configureStore<LiveblocksState<BasicState>>({
    reducer: reducer as any,
    enhancers: [enhancer({ client, ...options })],
    preloadedState,
  });
  return { client, store };
}

type BasicState = {
  value: number;
  items: Array<{ text: string }>;
  mappedToFalse: number;
  notMapped: string;
  cursor: { x: number; y: number };
};

const basicStoreReducer = ((
  state: BasicState = {
    value: 0,
    items: [],
    mappedToFalse: 0,
    notMapped: "default",
    cursor: { x: 0, y: 0 },
  },
  action: any
) => {
  switch (action.type) {
    case "SET_CURSOR": {
      return {
        ...state,
        cursor: action.cursor,
      };
    }
    case "SET_VALUE": {
      return {
        ...state,
        value: action.value,
      };
    }
    case "SET_ITEMS": {
      return {
        ...state,
        items: action.items,
      };
    }
  }

  return state as BasicState;
}) as Reducer<BasicState>;

function prepareClientAndBasicStore() {
  return prepareClientAndStore<BasicState>(
    basicStoreReducer,
    {
      storageMapping: { value: true, mappedToFalse: false, items: true },
      presenceMapping: { cursor: true },
    },
    {
      value: 0,
      items: [],
      mappedToFalse: 0,
      notMapped: "default",
      cursor: { x: 0, y: 0 },
    }
  );
}

async function prepareWithStorage<
  T extends Record<string, unknown>,
  TPresence extends JsonObject = never
>(
  reducer: Reducer<T>,
  preloadedState: T,
  options: {
    storageMapping: Mapping<T>;
    presenceMapping: Mapping<T>;
    room?: string;
    initialState?: any;
    items: SerializedCrdtWithId[];
  }
) {
  const { client, store } = prepareClientAndStore(
    reducer,
    {
      storageMapping: options.storageMapping,
      presenceMapping: options.presenceMapping,
    },
    preloadedState
  );
  store.dispatch(enterRoom(options?.room || "room", options?.initialState));

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.open[0]!();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMessageType.InitialStorageState,
      items: options.items,
    }),
  } as MessageEvent);

  function sendMessage(serverMessage: ServerMessage<TPresence>) {
    socket.callbacks.message[0]!({
      data: JSON.stringify(serverMessage),
    } as MessageEvent);
  }

  await waitFor(() => !store.getState().liveblocks.isStorageLoading);

  return { client, store, socket, sendMessage };
}

async function prepareBasicStoreWithStorage(
  items: SerializedCrdtWithId[],
  options?: {
    room?: string;
    initialState?: Partial<BasicState>;
  }
) {
  return prepareWithStorage(
    basicStoreReducer,
    {
      value: 0,
      items: [],
      mappedToFalse: 0,
      notMapped: "default",
      cursor: { x: 0, y: 0 },
    },
    {
      storageMapping: { value: true, mappedToFalse: false, items: true },
      presenceMapping: { cursor: true },
      items,
      room: options?.room,
      initialState: options?.initialState,
    }
  );
}

describe("middleware", () => {
  test("init middleware", () => {
    const { store } = prepareClientAndBasicStore();

    const { liveblocks, value } = store.getState();

    // Others should be empty before entering the room
    expect(liveblocks.others).toEqual([]);
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
    expect(store.getState().cursor).toEqual({ x: 0, y: 0 });
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const { store } = prepareClientAndBasicStore();

    store.dispatch(enterRoom("room"));

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
    const { store } = prepareClientAndBasicStore();

    store.dispatch(enterRoom("room"));

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    expect(store.getState().liveblocks.connection).toBe("open");
  });

  describe("presence", () => {
    test("should update state if presence is updated via room", async () => {
      const { store, client } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      client.getRoom("room")!.updatePresence({ cursor: { x: 100, y: 100 } });

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

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

      await waitFor(() => socket.sentMessages[1] != null);

      expect(socket.sentMessages[1]).toEqual(
        JSON.stringify([
          {
            type: ClientMessageType.UpdatePresence,
            data: { cursor: { x: 100, y: 100 } },
          },
        ])
      );
    });

    test("should broadcast presence when connecting to the room", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

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
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

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

      store.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

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

    test("should not update presence if state is updated after leaving the room", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

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

      store.dispatch(leaveRoom("room"));

      store.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

      expect(socket.sentMessages[1]).toBeUndefined();
    });

    test("should set liveblocks.others if there are others users in the room", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

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
        } as RoomStateMessage),
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
        const { store } = await prepareBasicStoreWithStorage([
          obj("root", { value: 1 }),
        ]);

        expect(store.getState().value).toBe(1);
      });

      test("should not initialize if mapping key does not exist", async () => {
        const { store } = await prepareBasicStoreWithStorage([
          obj("root", { notMapped: "not mapped" }),
        ]);

        expect(store.getState().notMapped).toBe("default");
      });

      test("should not initialize if mapping key is false", async () => {
        const { store } = await prepareBasicStoreWithStorage([
          obj("root", { mappedToFalse: 1 }),
        ]);

        expect(store.getState().mappedToFalse).toBe(0);
      });

      test("should initialize with default state if key is missing from liveblocks storage", async () => {
        const { store, socket } = await prepareBasicStoreWithStorage(
          [obj("root", {})],
          {
            initialState: {
              value: 5,
            },
          }
        );

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

      test("should initialize with LiveList if key is missing from liveblocks storage and initial value is an array", async () => {
        const { store, socket } = await prepareBasicStoreWithStorage(
          [obj("root", {})],
          {
            initialState: {
              items: [],
            },
          }
        );

        expect(store.getState().items).toEqual([]);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(socket.sentMessages[1]).toEqual(
          JSON.stringify([
            {
              type: ClientMessageType.UpdateStorage,
              ops: [
                {
                  id: "0:0",
                  opId: "0:1",
                  type: OpType.CreateList,
                  parentId: "root",
                  parentKey: "items",
                },
              ],
            },
          ])
        );
      });

      test("should batch initialization", async () => {
        const { store, socket } = await prepareBasicStoreWithStorage(
          [obj("root", {})],
          {
            initialState: {
              value: 5,
              items: [],
            },
          }
        );

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
        const { store, socket } = await prepareBasicStoreWithStorage(
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
        const { store, sendMessage } = await prepareBasicStoreWithStorage([
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
        const { store, sendMessage } = await prepareBasicStoreWithStorage([
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
        const { store, socket } = await prepareBasicStoreWithStorage([
          obj("root", { value: 1 }),
        ]);

        store.dispatch({ type: "SET_VALUE", value: 2 });

        // Waiting for last update to be sent because of room internal throttling
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
                  data: { value: 2 },
                },
              ],
            },
          ])
        );
      });

      test("should batch modifications", async () => {
        const { store, socket } = await prepareBasicStoreWithStorage([
          obj("root", { value: 1 }),
          list("1:0", "root", "items"),
        ]);

        store.dispatch({
          type: "SET_ITEMS",
          items: [{ text: "A" }, { text: "B" }],
        });

        // Waiting for last update to be sent because of room internal throttling
        await waitFor(() => socket.sentMessages[1] != null);

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
    test("undo / redo", async () => {
      const { store, client } = await prepareBasicStoreWithStorage(
        [obj("root", { value: 1 })],
        {
          room: "room",
        }
      );

      expect(store.getState().value).toBe(1);

      store.dispatch({ type: "SET_VALUE", value: 2 });

      expect(store.getState().value).toBe(2);

      client.getRoom("room")!.history.undo();

      expect(store.getState().value).toBe(1);

      client.getRoom("room")!.history.redo();

      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const { store, client } = await prepareBasicStoreWithStorage([
        obj("root", { value: 1 }),
      ]);

      expect(store.getState().value).toBe(1);

      store.dispatch({ type: "SET_VALUE", value: 2 });

      expect(store.getState().value).toBe(2);

      client.getRoom("room")!.history.undo();

      store.dispatch({ type: "SET_CURSOR", cursor: { x: 0, y: 1 } });

      client.getRoom("room")!.history.redo();

      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const { store, client } = await prepareBasicStoreWithStorage([
        obj("root", { value: 1 }),
      ]);

      client.getRoom("room")!.updatePresence(
        {
          cursor: {
            x: 100,
            y: 100,
          },
        },
        {
          addToHistory: true,
        }
      );

      client.getRoom("room")!.updatePresence(
        {
          cursor: {
            x: 200,
            y: 200,
          },
        },
        {
          addToHistory: true,
        }
      );

      client.getRoom("room")!.history.undo();

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

      client.getRoom("room")!.history.redo();

      expect(store.getState().cursor).toEqual({ x: 200, y: 200 });
    });
  });

  describe("configuration validation", () => {
    test("missing client should throw", () => {
      expect(() =>
        enhancer({ client: undefined as any, storageMapping: {} })
      ).toThrow(missingClient());
    });

    test("storageMapping should be an object", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        enhancer({
          client,
          storageMapping: "invalid_mapping" as any,
        })
      ).toThrow(mappingShouldBeAnObject("storageMapping"));
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        enhancer({
          client,
          storageMapping: { key: "value" as any },
        })
      ).toThrow(mappingValueShouldBeABoolean("storageMapping", "key"));
    });

    test("duplicated key should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        enhancer({
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow(mappingShouldNotHaveTheSameKeys("key"));
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        enhancer({
          client,
          storageMapping: {},
          presenceMapping: "invalid_mapping" as any,
        })
      ).toThrow(mappingShouldBeAnObject("presenceMapping"));
    });
  });
});
