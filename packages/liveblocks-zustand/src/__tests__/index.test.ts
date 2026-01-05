import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
} from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  IdTuple,
  RoomStateServerMsg,
  SerializedCrdt,
  ServerMsg,
  UpdatePresenceServerMsg,
} from "@liveblocks/core";
import { ClientMsgCode, OpCode, ServerMsgCode } from "@liveblocks/core";
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
import type { StateCreator } from "zustand";
import { create } from "zustand";

import type { Mapping, WithLiveblocks } from "..";
import { liveblocks as liveblocksMiddleware } from "..";
import { list, MockWebSocket, obj, waitFor } from "./_utils";

window.WebSocket = MockWebSocket as any;

const INVALID_CONFIG_ERROR = /Invalid @liveblocks\/zustand middleware config/;

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
  expect(socket.callbacks.open.length).toBe(1); // Got open callback
  expect(socket.callbacks.message.length).toBe(1); // Got ROOM_STATE message callback

  return socket;
}

interface BasicStore {
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
}

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

function prepareClientAndStore<
  TState,
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
>(
  stateCreator: StateCreator<TState>,
  options: {
    storageMapping: Mapping<TState>;
    presenceMapping: Mapping<TState>;
  }
) {
  const client = createClient({ authEndpoint: "/api/auth" });
  const store = create<WithLiveblocks<TState, P, S, U, E>>()(
    liveblocksMiddleware(stateCreator, {
      ...options,
      client,
    }) as any
  );
  return { client, store };
}

function prepareClientAndBasicStore() {
  return prepareClientAndStore(basicStateCreator, {
    storageMapping: { value: true, mappedToFalse: false, items: true },
    presenceMapping: { cursor: true },
  });
}

async function prepareWithStorage<TState>(
  stateCreator: StateCreator<TState>,
  options: {
    storageMapping: Mapping<TState>;
    presenceMapping: Mapping<TState>;
    room?: string;
    items: IdTuple<SerializedCrdt>[];
  }
) {
  const { client, store } = prepareClientAndStore(stateCreator, {
    storageMapping: options.storageMapping,
    presenceMapping: options.presenceMapping,
  });
  store.getState().liveblocks.enterRoom(options?.room || "room");

  const socket = await waitForSocketToBeConnected();

  socket.callbacks.message[0]!({
    data: JSON.stringify({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: options.items,
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
  options?: { room?: string }
) {
  return prepareWithStorage(basicStateCreator, {
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
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const { store } = prepareClientAndBasicStore();

    const { liveblocks } = store.getState();

    liveblocks.enterRoom("room");

    expect(store.getState().liveblocks.isStorageLoading).toBe(true);

    const socket = await waitForSocketToBeConnected();

    socket.callbacks.message[0]!({
      data: JSON.stringify({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [obj("root", {})],
      }),
    } as MessageEvent);

    await waitFor(() => store.getState().liveblocks.isStorageLoading === false);
  });

  test("enter room should set the connection to open", async () => {
    const { store } = prepareClientAndBasicStore();

    const { liveblocks } = store.getState();

    liveblocks.enterRoom("room");

    await waitForSocketToBeConnected();

    expect(store.getState().liveblocks.status).toBe("connected");
  });

  describe("presence", () => {
    test("should update state if presence is updated via room", async () => {
      const { store } = prepareClientAndBasicStore();

      const { liveblocks } = store.getState();

      liveblocks.enterRoom("room");

      const socket = await waitForSocketToBeConnected();

      store
        .getState()
        .liveblocks.room!.updatePresence({ cursor: { x: 100, y: 100 } });

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        {
          type: ClientMsgCode.FETCH_STORAGE,
          stream: true,
        },
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

      const { liveblocks } = store.getState();

      liveblocks.enterRoom("room");

      const socket = await waitForSocketToBeConnected();

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        {
          type: ClientMsgCode.FETCH_STORAGE,
          stream: true,
        },
      ]);
    });

    test("should update presence if state is updated", async () => {
      const { store } = prepareClientAndBasicStore();

      const { liveblocks } = store.getState();

      liveblocks.enterRoom("room");

      const socket = await waitForSocketToBeConnected();

      expect(JSON.parse(socket.sentMessages[0]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { cursor: { x: 0, y: 0 } },
        },
        {
          type: ClientMsgCode.FETCH_STORAGE,
          stream: true,
        },
      ]);

      store.getState().setCursor({ x: 1, y: 1 });

      await waitFor(() => socket.sentMessages[1] != null);

      expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          data: { cursor: { x: 1, y: 1 } },
        },
      ]);
    });

    test("should set liveblocks.others if there are others users in the room", async () => {
      const { store } = prepareClientAndBasicStore();

      const { liveblocks } = store.getState();

      liveblocks.enterRoom("room");

      const socket = await waitForSocketToBeConnected();

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
          canWrite: true,
          canComment: true,
          isReadOnly: false,
          presence: { x: 1 },
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
          () => ({ value: 5 }),
          {
            storageMapping: { value: true },
            presenceMapping: {},
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

      test("should batch initialization", async () => {
        const items = [obj("root", {})];
        const { store, socket } = await prepareWithStorage(
          () => ({ value: 5, items: [] }),
          {
            storageMapping: { value: true, items: true },
            presenceMapping: {},
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
          () => ({ value: 5 }),
          {
            storageMapping: { value: true },
            presenceMapping: {},
            items,
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

        store.getState().setValue(2);

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

        store.getState().setItems([{ text: "A" }, { text: "B" }]);

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

      test("assigning new object identity overrides previous identity", async () => {
        const { store } = await prepareWithStorage<{
          obj: { a: number };
          setObj: (newObj: { a: number }) => void;
        }>(
          (set) => ({
            obj: { a: 0 },

            setObj: (newObj) => {
              set({ obj: newObj });
            },
          }),
          {
            storageMapping: { obj: true },
            presenceMapping: {},
            items: [obj("root", {})],
          }
        );

        const oldVal = store.getState().obj;
        const newVal = { a: 0 };

        // Explicitly check concern surfaced by Guillaume in this comment:
        // https://github.com/liveblocks/liveblocks/pull/404/files#r940605025
        expect(store.getState().obj).toBe(oldVal);
        store.getState().setObj(newVal);
        expect(store.getState().obj).toBe(newVal);
      });
    });

    // Fixes this bug reported by Arcol
    // https://github.com/liveblocks/liveblocks/issues/491
    test("assigning explicit-`undefined` to a nested key should delete it", async () => {
      const { store, socket } = await prepareWithStorage<{
        nest: { a?: number };
        setA: (a?: number) => void;
      }>(
        (set) => ({
          nest: { a: 13 },
          setA: (a) => {
            set({ nest: { a } });
          },
        }),
        {
          storageMapping: { nest: true },
          presenceMapping: {},
          items: [
            // Mimic the initial Zustand state to limit network syncing at the start
            obj("root", {}),
            obj("0:1", { a: 13 }, "root", "nest"),
          ],
        }
      );

      expect(store.getState().nest.a).toBe(13);

      store.getState().setA(undefined);

      // Waiting for last update to be sent because of room internal throttling
      await waitFor(() => socket.sentMessages[1] != null);

      expect(JSON.parse(socket.sentMessages[1]!)).toEqual([
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              type: OpCode.DELETE_OBJECT_KEY,
              opId: "0:0",
              id: "0:1",
              key: "a",
            },
          ],
        },
      ]);

      expect(store.getState().nest.a).toBeUndefined();
    });
  });

  describe("history", () => {
    test("undo / redo", async () => {
      const { store } = await prepareBasicStoreWithStorage([
        obj("root", { value: 1 }),
      ]);

      expect(store.getState().value).toBe(1);

      store.getState().setValue(2);

      expect(store.getState().value).toBe(2);

      store.getState().liveblocks.room!.history.undo();

      expect(store.getState().value).toBe(1);

      store.getState().liveblocks.room!.history.redo();

      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const { store } = await prepareBasicStoreWithStorage([
        obj("root", { value: 1 }),
      ]);

      expect(store.getState().value).toBe(1);

      store.getState().setValue(2);

      expect(store.getState().value).toBe(2);

      store.getState().liveblocks.room!.history.undo();

      store.getState().setCursor({ x: 0, y: 1 });

      store.getState().liveblocks.room!.history.redo();

      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const { store } = await prepareBasicStoreWithStorage([
        obj("root", { value: 1 }),
      ]);

      store.getState().liveblocks.room?.updatePresence(
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

      store.getState().liveblocks.room?.updatePresence(
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

      store.getState().liveblocks.room?.history.undo();

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

      store.getState().liveblocks.room?.history.redo();

      expect(store.getState().cursor).toEqual({ x: 200, y: 200 });
    });
  });

  describe("configuration validation", () => {
    test("missing client should throw", () => {
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client: undefined as any,
          storageMapping: {},
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("storageMapping should be an object", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: "invalid_mapping" as any,
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: { key: "value" },
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("duplicated key should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ authEndpoint: "/api/auth" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: {},
          presenceMapping: "invalid_mapping",
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("mapping on function should throw", async () => {
      const { store } = await prepareWithStorage<{
        notAFunc: any;
        setFunction: () => void;
      }>(
        (set) => ({
          notAFunc: null,

          setFunction: () => {
            set({ notAFunc: /* 😈 */ () => {} });
          },
        }),
        {
          storageMapping: { notAFunc: true },
          presenceMapping: {},
          items: [obj("root", {})],
        }
      );

      expect(() => store.getState().setFunction()).toThrow(
        INVALID_CONFIG_ERROR
      );
    });
  });
});
