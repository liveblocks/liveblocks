import { createClient } from "@liveblocks/client";
import type { PlainLsonObject } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import type { Reducer } from "@reduxjs/toolkit";
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, onTestFinished, test } from "vitest";

import type { Mapping, WithLiveblocks } from "..";
import { actions, liveblocksEnhancer } from "..";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingValueShouldBeABoolean,
  missingClient,
} from "../errors";
import { randomRoomId, waitFor } from "./_utils";

const { enterRoom: enterRoomAction, leaveRoom: leaveRoomAction } = actions;

const DEV_SERVER = "http://localhost:1154";

// ---------------------------------------------------------------------------
// Dev-server helpers
// ---------------------------------------------------------------------------

/**
 * Creates a room on the dev server and optionally seeds its storage.
 */
async function initRoom(storage?: PlainLsonObject): Promise<string> {
  const roomId = randomRoomId();

  await fetch(`${DEV_SERVER}/v2/rooms`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: roomId }),
  });

  if (storage) {
    await fetch(
      `${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_localdev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storage),
      }
    );
  }
  return roomId;
}

async function UNSAFE_generateAccessToken(roomId?: string) {
  const res = await fetch(`${DEV_SERVER}/v2/authorize-user`, {
    method: "POST",
    headers: {
      // ⚠️ WARNING ⚠️
      // DO NOT USE THIS IN PRODUCTION!
      // Never expose your secret key on the client in production this way!
      // We only do this here because these tests don't have a backend.
      // Do not treat this setup as a reference for how to implement
      // authentication in your app.
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `user-${nanoid()}`,
      userInfo: { name: "Testy McTester" },
      permissions: { [roomId!]: ["room:write"] },
    }),
  });
  return (await res.json()) as { token: string };
}

// ---------------------------------------------------------------------------
// Store types & reducer
// ---------------------------------------------------------------------------

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

const basicInitialState: BasicState = {
  value: 0,
  items: [],
  mappedToFalse: 0,
  notMapped: "default",
  cursor: { x: 0, y: 0 },
};

// ---------------------------------------------------------------------------
// Store creation helpers
// ---------------------------------------------------------------------------

function createTestStore<T>(
  reducer: Reducer<T>,
  options: {
    storageMapping: Mapping<T>;
    presenceMapping: Mapping<T>;
  },
  preloadedState?: T
) {
  const client = createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: UNSAFE_generateAccessToken,
    polyfills: { WebSocket: globalThis.WebSocket },
    // @ts-expect-error Deliberately testing internal option to disable throttling for tests
    __DANGEROUSLY_disableThrottling: true,
  });
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

function createBasicStore() {
  return createTestStore<BasicState>(
    basicStoreReducer,
    {
      storageMapping: { value: true, mappedToFalse: false, items: true },
      presenceMapping: { cursor: true },
    },
    basicInitialState
  );
}

// ---------------------------------------------------------------------------
// Room lifecycle helpers
// ---------------------------------------------------------------------------

function enterRoom(
  store: ReturnType<typeof createBasicStore>["store"],
  roomId: string = randomRoomId()
): string {
  store.dispatch(enterRoomAction(roomId));
  onTestFinished(() => {
    store.dispatch(leaveRoomAction());
  });
  return roomId;
}

async function enterAndConnect(
  store: ReturnType<typeof createBasicStore>["store"],
  roomId: string = randomRoomId()
): Promise<string> {
  const id = enterRoom(store, roomId);
  await waitFor(() => store.getState().liveblocks.status === "connected");
  return id;
}

async function connectClient(roomId?: string) {
  const { client, store } = createBasicStore();
  const id = await enterAndConnect(store, roomId ?? randomRoomId());
  return { client, store, roomId: id };
}

async function connectTwoClients(roomId?: string) {
  const id = roomId ?? randomRoomId();
  const { client: clientA, store: storeA } = createBasicStore();
  await enterAndConnect(storeA, id);
  const { store: storeB } = createBasicStore();
  await enterAndConnect(storeB, id);
  return { clientA, storeA, storeB, roomId: id };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("middleware", () => {
  test("init middleware", () => {
    const { store } = createBasicStore();

    const { liveblocks, value } = store.getState();

    // Others should be empty before entering the room
    expect(liveblocks.others).toEqual([]);
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
    expect(store.getState().cursor).toEqual({ x: 0, y: 0 });
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const { store } = createBasicStore();

    enterRoom(store);

    expect(store.getState().liveblocks.isStorageLoading).toBe(true);

    await waitFor(() => store.getState().liveblocks.isStorageLoading === false);
  });

  test("enter room should set the connection to open", async () => {
    const { store } = await connectClient();
    expect(store.getState().liveblocks.status).toBe("connected");
  });

  describe("presence", () => {
    test("should update state if presence is updated via room", async () => {
      const { clientA, storeA, storeB, roomId } = await connectTwoClients();

      clientA.getRoom(roomId)!.updatePresence({ cursor: { x: 100, y: 100 } });

      // Local store should reflect the update immediately
      expect(storeA.getState().cursor).toEqual({ x: 100, y: 100 });

      // Client B should see A's updated presence
      await waitFor(
        () =>
          (
            storeB.getState().liveblocks.others[0]?.presence as {
              cursor: { x: number; y: number };
            }
          )?.cursor?.x === 100
      );
      expect(storeB.getState().liveblocks.others[0]!.presence).toEqual({
        cursor: { x: 100, y: 100 },
      });
    });

    test("should broadcast presence when connecting to the room", async () => {
      const { storeB } = await connectTwoClients();

      // Client B should see A's initial presence
      await waitFor(() => storeB.getState().liveblocks.others.length === 1);
      expect(storeB.getState().liveblocks.others[0]!.presence).toEqual({
        cursor: { x: 0, y: 0 },
      });
    });

    test("should update presence if state is updated", async () => {
      const { storeA, storeB } = await connectTwoClients();

      // Update presence via redux dispatch
      storeA.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

      // Client B should see the updated cursor
      await waitFor(() => storeB.getState().liveblocks.others.length === 1);
      await waitFor(
        () =>
          (
            storeB.getState().liveblocks.others[0]!.presence as {
              cursor: { x: number; y: number };
            }
          ).cursor.x === 1
      );
      expect(storeB.getState().liveblocks.others[0]!.presence).toEqual({
        cursor: { x: 1, y: 1 },
      });
    });

    test("should not update presence if state is updated after leaving the room", async () => {
      const { store } = createBasicStore();
      await enterAndConnect(store);

      store.dispatch(leaveRoomAction());

      // Dispatching after leaving should not throw
      store.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

      // Local state still updates (redux reducer runs), but no crash
      expect(store.getState().cursor).toEqual({ x: 1, y: 1 });
    });

    test("should set liveblocks.others if there are other users in the room", async () => {
      const { storeA, storeB } = await connectTwoClients();

      // Store A updates cursor
      storeA.dispatch({ type: "SET_CURSOR", cursor: { x: 1, y: 1 } });

      // Store B should see store A in others with full metadata
      await waitFor(
        () =>
          (
            storeB.getState().liveblocks.others[0]?.presence as {
              cursor: { x: number; y: number };
            }
          )?.cursor?.x === 1
      );

      const other = storeB.getState().liveblocks.others[0]!;
      expect(other.connectionId).toEqual(expect.any(Number));
      expect(other.id).toEqual(expect.any(String));
      expect(other.info).toEqual({ name: "Testy McTester" });
      expect(other.canWrite).toBe(true);
      expect(other.canComment).toBe(true);
      expect(other.presence).toEqual({ cursor: { x: 1, y: 1 } });
    });
  });

  describe("storage", () => {
    describe("initialization", () => {
      test("should initialize if mapping key is true", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { value: 1 },
        });

        const { store } = createBasicStore();
        await enterAndConnect(store, roomId);
        await waitFor(
          () => store.getState().liveblocks.isStorageLoading === false
        );
        expect(store.getState().value).toBe(1);
      });

      test("should not initialize if mapping key does not exist", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { notMapped: "not mapped" },
        });

        const { store } = createBasicStore();
        await enterAndConnect(store, roomId);
        await waitFor(
          () => store.getState().liveblocks.isStorageLoading === false
        );
        expect(store.getState().notMapped).toBe("default");
      });

      test("should not initialize if mapping key is false", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { mappedToFalse: 1 },
        });

        const { store } = createBasicStore();
        await enterAndConnect(store, roomId);
        await waitFor(
          () => store.getState().liveblocks.isStorageLoading === false
        );
        expect(store.getState().mappedToFalse).toBe(0);
      });

      test("should initialize with default state if key is missing from liveblocks storage", async () => {
        // Storage has empty root — no "value" key
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {},
        });

        const { store: storeA } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 5 }
        );
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        // Local state should keep the default value
        expect(storeA.getState().value).toBe(5);

        // The default should have been synced to storage —
        // verify by joining a second client
        const { store: storeB } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 0 }
        );
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );
        expect(storeB.getState().value).toBe(5);
      });

      test("should initialize with LiveList if key is missing from liveblocks storage and initial value is an array", async () => {
        // Storage has empty root — no "items" key
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {},
        });

        const { store: storeA } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { mappedToFalse: false, items: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, items: [] }
        );
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        expect(storeA.getState().items).toEqual([]);

        // Verify sync: a second client should also see items: []
        const { store: storeB } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { mappedToFalse: false, items: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, items: [] }
        );
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );
        expect(storeB.getState().items).toEqual([]);
      });

      test("should batch initialization", async () => {
        // Storage has empty root — missing both "value" and "items"
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {},
        });

        const { store: storeA } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: {
              value: true,
              mappedToFalse: false,
              items: true,
            },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 5, items: [] }
        );
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        // Local state should keep the defaults
        expect(storeA.getState().value).toBe(5);
        expect(storeA.getState().items).toEqual([]);

        // Both defaults should have been synced to storage —
        // verify by joining a second client
        const { store: storeB } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: {
              value: true,
              mappedToFalse: false,
              items: true,
            },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 0, items: [] }
        );
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );
        expect(storeB.getState().value).toBe(5);
        expect(storeB.getState().items).toEqual([]);
      });

      test("should not override liveblocks state with initial state if key exists", async () => {
        // Storage already has value: 1
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { value: 1 },
        });

        // Redux default is value: 5, but storage should win
        const { store: storeA } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 5 }
        );
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );
        expect(storeA.getState().value).toBe(1);

        // Verify storage was NOT overwritten with the default —
        // a second client should also see 1
        const { store: storeB } = createTestStore(
          basicStoreReducer,
          {
            storageMapping: { value: true },
            presenceMapping: { cursor: true },
          },
          { ...basicInitialState, value: 0 }
        );
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );
        expect(storeB.getState().value).toBe(1);
      });
    });

    describe("remote updates", () => {
      test("should update state if mapping allows it", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { value: 1 },
        });

        const { store: storeA } = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const { store: storeB } = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Both clients should start with value: 1
        expect(storeA.getState().value).toBe(1);
        expect(storeB.getState().value).toBe(1);

        // Client A updates value
        storeA.dispatch({ type: "SET_VALUE", value: 2 });

        // Client B should see the remote update
        await waitFor(() => storeB.getState().value === 2);
        expect(storeB.getState().value).toBe(2);
      });

      test("should not update state if key is not part of the mapping", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { value: 1 },
        });

        const { client: clientA, store: storeA } = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const { store: storeB } = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A updates a non-mapped key directly on the LiveObject
        const { root } = await clientA.getRoom(roomId)!.getStorage();
        root.set("notMapped", "hey");

        // Client B: "notMapped" is not in storageMapping, so redux
        // state should remain at its default
        // Give it a moment — if the update were going to propagate, it would
        await waitFor(() => storeB.getState().value === 1);
        expect(storeB.getState().notMapped).toBe("default");
      });
    });

    describe("patching Liveblocks state", () => {
      test("should update liveblocks state if mapping allows it", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {
            value: 1,
            items: { liveblocksType: "LiveList", data: [] },
          },
        });

        const { store: storeA } = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );
        expect(storeA.getState().value).toBe(1);

        const { store: storeB } = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A updates value via redux dispatch
        storeA.dispatch({ type: "SET_VALUE", value: 2 });

        // Client B should see the update
        await waitFor(() => storeB.getState().value === 2);
        expect(storeB.getState().value).toBe(2);
      });

      test("should batch modifications", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {
            value: 1,
            items: { liveblocksType: "LiveList", data: [] },
          },
        });

        const { store: storeA } = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const { store: storeB } = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A sets two items at once
        storeA.dispatch({
          type: "SET_ITEMS",
          items: [{ text: "A" }, { text: "B" }],
        });

        // Client B should see both items
        await waitFor(() => storeB.getState().items.length === 2);
        expect(storeB.getState().items).toEqual([{ text: "A" }, { text: "B" }]);
      });
    });
  });

  describe("history", () => {
    test("undo / redo", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const { client, store } = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      expect(store.getState().value).toBe(1);

      store.dispatch({ type: "SET_VALUE", value: 2 });
      expect(store.getState().value).toBe(2);

      client.getRoom(roomId)!.history.undo();
      expect(store.getState().value).toBe(1);

      client.getRoom(roomId)!.history.redo();
      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack #1", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const { client, store } = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      expect(store.getState().value).toBe(1);

      store.dispatch({ type: "SET_VALUE", value: 2 });
      expect(store.getState().value).toBe(2);

      client.getRoom(roomId)!.history.undo();

      store.dispatch({ type: "SET_CURSOR", cursor: { x: 0, y: 1 } });

      client.getRoom(roomId)!.history.redo();
      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack #2", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const { client, store } = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      client.getRoom(roomId)!.updatePresence(
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

      client.getRoom(roomId)!.updatePresence(
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

      client.getRoom(roomId)!.history.undo();

      expect(store.getState().cursor).toEqual({ x: 100, y: 100 });

      client.getRoom(roomId)!.history.redo();

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
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: "invalid_mapping" as any,
        })
      ).toThrow(mappingShouldBeAnObject("storageMapping"));
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: { key: "value" as any },
        })
      ).toThrow(mappingValueShouldBeABoolean("storageMapping", "key"));
    });

    test("duplicated key should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksEnhancer({
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow(mappingShouldNotHaveTheSameKeys("key"));
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
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
