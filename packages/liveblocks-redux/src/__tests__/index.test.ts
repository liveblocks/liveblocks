import type { BaseUserMeta, Json, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  IdTuple,
  RoomStateServerMsg,
  SerializedCrdt,
  ServerMsg,
  UpdatePresenceServerMsg,
} from "@liveblocks/core";
import {
  ClientMsgCode,
  CrdtType,
  nodeStreamToCompactNodes,
  OpCode,
  ServerMsgCode,
} from "@liveblocks/core";
import type { Reducer } from "@reduxjs/toolkit";
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { Mapping, WithLiveblocks } from "..";
import { actions, liveblocksEnhancer } from "..";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingValueShouldBeABoolean,
  missingClient,
} from "../errors";
import { list, MockWebSocket, obj, waitFor } from "./_utils";
window.WebSocket = MockWebSocket as any;

const { enterRoom, leaveRoom } = actions;

const server = setupServer(
  http.post("/api/auth", () => {
    return HttpResponse.json({
      token:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg",
    });
  }),
  http.post("/api/auth-fail", () => {
    return new HttpResponse(null, { status: 400 });
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
  const store = configureStore<
    WithLiveblocks<BasicState, BasicPresence, never>
  >({
    reducer: reducer as any,
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(liveblocksEnhancer({ client, ...options })),
    preloadedState: preloadedState as any,
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

type BasicPresence = Pick<BasicState, "cursor">;

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

  return state;
}) as Reducer<BasicState>;

const basicInitialState = {
  value: 0,
  items: [],
  mappedToFalse: 0,
  notMapped: "default",
  cursor: { x: 0, y: 0 },
};

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

async function prepareWithStorage<T extends Record<string, unknown>>(
  reducer: Reducer<T>,
  preloadedState: T,
  options: {
    storageMapping: Mapping<T>;
    presenceMapping: Mapping<T>;
    room?: string;
    items: IdTuple<SerializedCrdt>[];
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
  store.dispatch(enterRoom(options?.room || "room"));

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.open[0]!();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMsgCode.INITIAL_STORAGE_CHUNK,
      done: true,
      nodes: Array.from(nodeStreamToCompactNodes(options.items)),
    }),
  } as MessageEvent);

  function sendMessage(
    serverMessage: ServerMsg<JsonObject, BaseUserMeta, Json>
  ) {
    socket.callbacks.message[0]!({
      data: JSON.stringify(serverMessage),
    } as MessageEvent);
  }

  await waitFor(() => !store.getState().liveblocks.isStorageLoading);

  return { client, store, socket, sendMessage };
}

async function prepareBasicStoreWithStorage(
  items: IdTuple<SerializedCrdt>[],
  options?: {
    room?: string;
  }
) {
  return prepareWithStorage(basicStoreReducer, basicInitialState, {
    storageMapping: { value: true, mappedToFalse: false, items: true },
    presenceMapping: { cursor: true },
    items,
    room: options?.room,
  });
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
        type: ServerMsgCode.INITIAL_STORAGE_CHUNK,
        done: true,
        nodes: [["root", CrdtType.OBJECT, {}]],
      }),
    } as MessageEvent);

    await waitFor(() => store.getState().liveblocks.isStorageLoading === false);
  });

  test("enter room should set the connection to open", async () => {
    const { store } = prepareClientAndBasicStore();

    store.dispatch(enterRoom("room"));

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.open[0]!();

    expect(store.getState().liveblocks.status).toBe("connected");
  });

  describe("presence", () => {
    test("should update state if presence is updated via room", async () => {
      const { store, client } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      client.getRoom("room")!.updatePresence({ cursor: { x: 100, y: 100 } });

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        { type: ClientMsgCode.FETCH_STORAGE },
      ]);

      await waitFor(() => socket.sentMessages[1] != null);

      expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { cursor: { x: 100, y: 100 } },
        },
      ]);
    });

    test("should broadcast presence when connecting to the room", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        { type: ClientMsgCode.FETCH_STORAGE },
      ]);
    });

    test("should update presence if state is updated", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        { type: ClientMsgCode.FETCH_STORAGE },
      ]);

      store.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

      await waitFor(() => socket.sentMessages[1] != null);

      expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { cursor: { x: 1, y: 1 } },
        },
      ]);
    });

    test("should not update presence if state is updated after leaving the room", async () => {
      const { store } = prepareClientAndBasicStore();

      store.dispatch(enterRoom("room"));

      const socket = await waitForSocketToBeConnected();

      socket.callbacks.open[0]!();

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        { type: ClientMsgCode.FETCH_STORAGE },
      ]);

      store.dispatch(leaveRoom());

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
          type: ServerMsgCode.ROOM_STATE,
          users: {
            "1": {
              info: { name: "Testy McTester" },
              scopes: ["room:write"],
            },
          },
          actor: 2,
          nonce: "nonce-for-actor-2",
          scopes: ["room:write"],
          meta: {},
        } as RoomStateServerMsg<BaseUserMeta>),
      } as MessageEvent);

      socket.callbacks.message[0]!({
        data: JSON.stringify({
          type: ServerMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          actor: 1,
          data: { x: 1 },
        } as UpdatePresenceServerMsg<JsonObject>),
      } as MessageEvent);

      expect(store.getState().liveblocks.others).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: {
            name: "Testy McTester",
          },
          presence: { x: 1 },
          canWrite: true,
          canComment: true,
          isReadOnly: false,
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
        const items = [obj("root", {})];
        const { store, socket } = await prepareWithStorage(
          basicStoreReducer,
          {
            ...basicInitialState,
            value: 5,
          },
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
            items,
          }
        );

        expect(store.getState().value).toBe(5);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                opId: "0:0",
                id: "root",
                type: OpCode.UPDATE_OBJECT,
                data: { value: 5 },
              },
            ],
          },
        ]);
      });

      test("should initialize with LiveList if key is missing from liveblocks storage and initial value is an array", async () => {
        const items = [obj("root", {})];
        const { store, socket } = await prepareWithStorage(
          basicStoreReducer,
          { ...basicInitialState, items: [] },
          {
            storageMapping: { mappedToFalse: false, items: true },
            presenceMapping: { cursor: true },
            items,
          }
        );

        expect(store.getState().items).toEqual([]);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                id: "0:0",
                opId: "0:1",
                type: OpCode.CREATE_LIST,
                parentId: "root",
                parentKey: "items",
              },
            ],
          },
        ]);
      });

      test("should batch initialization", async () => {
        const items = [obj("root", {})];
        const { store, socket } = await prepareWithStorage(
          basicStoreReducer,
          {
            ...basicInitialState,
            value: 5,
            items: [],
          },
          {
            storageMapping: { value: true, mappedToFalse: false, items: true },
            presenceMapping: { cursor: true },
            items,
          }
        );

        expect(store.getState().value).toBe(5);

        await waitFor(() => socket.sentMessages[1] != null);

        expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                opId: "0:0",
                id: "root",
                type: OpCode.UPDATE_OBJECT,
                data: { value: 5 },
              },
              {
                id: "0:0",
                opId: "0:2", // TODO: We currently have a tiny issue in LiveObject.update who generate an opId 0:1 for a potential UpdateObject
                type: OpCode.CREATE_LIST,
                parentId: "root",
                parentKey: "items",
              },
            ],
          },
        ]);
      });

      test("should not override liveblocks state with initial state if key exists", async () => {
        const items = [obj("root", { value: 1 })];
        const { store, socket } = await prepareWithStorage(
          basicStoreReducer,
          { ...basicInitialState, value: 5 },
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
            items,
          }
        );

        expect(store.getState().value).toBe(1); // not 5!

        expect(socket.sentMessages[1]).toEqual(undefined); // no data sent to the server
      });
    });

    describe("remote updates", () => {
      test("should update state if mapping allows it", async () => {
        const { store, sendMessage } = await prepareBasicStoreWithStorage([
          obj("root", { value: 1 }),
        ]);

        sendMessage({
          type: ServerMsgCode.UPDATE_STORAGE,
          ops: [
            {
              type: OpCode.UPDATE_OBJECT,
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
          type: ServerMsgCode.UPDATE_STORAGE,
          ops: [
            {
              type: OpCode.UPDATE_OBJECT,
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
          list("1:0", "root", "items"),
        ]);

        store.dispatch({ type: "SET_VALUE", value: 2 });

        // Waiting for last update to be sent because of room internal throttling
        await waitFor(() => socket.sentMessages[1] != null);

        expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                opId: "0:0",
                id: "root",
                type: OpCode.UPDATE_OBJECT,
                data: { value: 2 },
              },
            ],
          },
        ]);
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

        expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                id: "0:0",
                opId: "0:0",
                type: OpCode.CREATE_OBJECT,
                parentId: "1:0",
                parentKey: "!",
                data: { text: "A" },
              },
              {
                id: "0:1",
                opId: "0:1",
                type: OpCode.CREATE_OBJECT,
                parentId: "1:0",
                parentKey: '"',
                data: { text: "B" },
              },
            ],
          },
        ]);
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

    test("updating presence should not reset redo stack #1", async () => {
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

    test("updating presence should not reset redo stack #2", async () => {
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
        liveblocksEnhancer({ client: undefined as any, storageMapping: {} })
      ).toThrow(missingClient());
    });

    test("storageMapping should be an object", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: "invalid_mapping" as any,
        })
      ).toThrow(mappingShouldBeAnObject("storageMapping"));
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: { key: "value" as any },
        })
      ).toThrow(mappingValueShouldBeABoolean("storageMapping", "key"));
    });

    test("duplicated key should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow(mappingShouldNotHaveTheSameKeys("key"));
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: {},
          presenceMapping: "invalid_mapping" as any,
        })
      ).toThrow(mappingShouldBeAnObject("presenceMapping"));
    });
  });
});
