import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
} from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type { PlainLsonObject } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { describe, expect, onTestFinished, test } from "vitest";
import type { StateCreator } from "zustand";
import { create } from "zustand";

import type { LiveblocksContext, Mapping, WithLiveblocks } from "..";
import { liveblocks as liveblocksMiddleware } from "..";
import { randomRoomId, waitFor } from "./_utils";

const INVALID_CONFIG_ERROR = /Invalid @liveblocks\/zustand middleware config/;

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

const DEV_SERVER = "http://localhost:1154";

/**
 * Creates a room on the dev server and initializes its storage.
 * Returns the room ID, which can be passed to enterAndConnect().
 */
async function initRoom(storage?: PlainLsonObject): Promise<string> {
  const roomId = randomRoomId();

  // Create the room
  await fetch(`${DEV_SERVER}/v2/rooms`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: roomId }),
  });

  // Initialize its storage
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

function createTestStore<
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
  const client = createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: UNSAFE_generateAccessToken,
    polyfills: { WebSocket: globalThis.WebSocket },
    // @ts-expect-error Deliberately testing internal option to disable throttling for tests
    __DANGEROUSLY_disableThrottling: true,
  });
  const store = create<WithLiveblocks<TState, P, S, U, E>>()(
    liveblocksMiddleware(stateCreator, { ...options, client }) as any
  );
  return { client, store };
}

function createBasicStore() {
  const { store } = createTestStore(basicStateCreator, {
    storageMapping: { value: true, mappedToFalse: false, items: true },
    presenceMapping: { cursor: true },
  });
  return store;
}

/**
 * Enters a room with a unique random ID and registers cleanup.
 * Call this inside a test to get a connected store.
 */
type AnyLiveblocksStore = {
  getState: () => {
    liveblocks: Pick<
      LiveblocksContext<
        JsonObject,
        LsonObject,
        BaseUserMeta,
        Json,
        BaseMetadata,
        BaseMetadata
      >,
      "enterRoom" | "leaveRoom" | "status"
    >;
  };
};

function enterRoom(
  store: AnyLiveblocksStore,
  roomId: string = randomRoomId()
): () => void {
  store.getState().liveblocks.enterRoom(roomId);
  const leave = () => store.getState().liveblocks.leaveRoom();
  onTestFinished(leave);
  return leave;
}

async function enterAndConnect(
  store: AnyLiveblocksStore,
  roomId: string = randomRoomId()
): Promise<() => void> {
  const leave = enterRoom(store, roomId);
  await waitFor(() => store.getState().liveblocks.status === "connected");
  return leave;
}

async function connectClient() {
  const store = createBasicStore();
  await enterAndConnect(store);
  return store;
}

async function connectTwoClients() {
  const roomId = randomRoomId();
  const storeA = createBasicStore();
  await enterAndConnect(storeA, roomId);
  const storeB = createBasicStore();
  await enterAndConnect(storeB, roomId);
  return { storeA, storeB };
}

describe("middleware", () => {
  test("init middleware", () => {
    const store = createBasicStore();
    const { liveblocks, value } = store.getState();
    expect(liveblocks.others).toEqual([]); // Others should be empty before entering the room
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
  });

  test("storage should be loading while socket is connecting and initial storage message", async () => {
    const store = createBasicStore();
    enterRoom(store);
    expect(store.getState().liveblocks.isStorageLoading).toBe(true);
    await waitFor(() => store.getState().liveblocks.isStorageLoading === false);
  });

  test("enter room should set the connection to open", async () => {
    const store = await connectClient();
    expect(store.getState().liveblocks.status).toBe("connected");
  });

  describe("presence", () => {
    test("should update state if presence is updated via room", async () => {
      const { storeA, storeB } = await connectTwoClients();

      storeA
        .getState()
        .liveblocks.room!.updatePresence({ cursor: { x: 100, y: 100 } });

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

      // Update presence via zustand state setter
      storeA.getState().setCursor({ x: 1, y: 1 });

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

    test("should set liveblocks.others if there are other users in the room", async () => {
      const { storeA, storeB } = await connectTwoClients();

      // storeA updates presence
      storeA.getState().setCursor({ x: 1, y: 1 });

      // storeB should see storeA in others with full metadata
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

        const store = createBasicStore();
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

        const store = createBasicStore();
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

        const store = createBasicStore();
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

        const { store: storeA } = createTestStore(() => ({ value: 5 }), {
          storageMapping: { value: true },
          presenceMapping: {},
        });
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        // Local state should keep the default value
        expect(storeA.getState().value).toBe(5);

        // The default should have been synced to storage —
        // verify by joining a second client
        const { store: storeB } = createTestStore(() => ({ value: 0 }), {
          storageMapping: { value: true },
          presenceMapping: {},
        });
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );
        expect(storeB.getState().value).toBe(5);
      });

      test("should batch initialization", async () => {
        // Storage has empty root — missing both "value" and "items"
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {},
        });

        const { store: storeA } = createTestStore(
          () => ({ value: 5, items: [] as Array<{ text: string }> }),
          { storageMapping: { value: true, items: true }, presenceMapping: {} }
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
          () => ({ value: 0, items: [] as Array<{ text: string }> }),
          { storageMapping: { value: true, items: true }, presenceMapping: {} }
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

        // Zustand default is value: 5, but storage should win
        const { store: storeA } = createTestStore(() => ({ value: 5 }), {
          storageMapping: { value: true },
          presenceMapping: {},
        });
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );
        expect(storeA.getState().value).toBe(1);

        // Verify storage was NOT overwritten with the default —
        // a second client should also see 1
        const { store: storeB } = createTestStore(() => ({ value: 0 }), {
          storageMapping: { value: true },
          presenceMapping: {},
        });
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

        const storeA = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const storeB = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Both clients should start with value: 1
        expect(storeA.getState().value).toBe(1);
        expect(storeB.getState().value).toBe(1);

        // Client A updates value
        storeA.getState().setValue(2);

        // Client B should see the remote update
        await waitFor(() => storeB.getState().value === 2);
        expect(storeB.getState().value).toBe(2);
      });

      test("should not update state if key is not part of the mapping", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: { value: 1 },
        });

        const storeA = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const storeB = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A updates a non-mapped key directly on the LiveObject
        const { root } = await storeA.getState().liveblocks.room!.getStorage();
        root.set("notMapped", "hey");

        // Client B: "notMapped" is not in storageMapping, so zustand
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

        const storeA = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );
        expect(storeA.getState().value).toBe(1);

        const storeB = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A updates value via zustand setter
        storeA.getState().setValue(2);

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

        const storeA = createBasicStore();
        await enterAndConnect(storeA, roomId);
        await waitFor(
          () => storeA.getState().liveblocks.isStorageLoading === false
        );

        const storeB = createBasicStore();
        await enterAndConnect(storeB, roomId);
        await waitFor(
          () => storeB.getState().liveblocks.isStorageLoading === false
        );

        // Client A sets two items at once
        storeA.getState().setItems([{ text: "A" }, { text: "B" }]);

        // Client B should see both items
        await waitFor(() => storeB.getState().items.length === 2);
        expect(storeB.getState().items).toEqual([{ text: "A" }, { text: "B" }]);
      });

      test("assigning new object identity overrides previous identity", async () => {
        const roomId = await initRoom({
          liveblocksType: "LiveObject",
          data: {},
        });

        interface ObjState {
          obj: { a: number };
          setObj: (newObj: { a: number }) => void;
        }

        const { store } = createTestStore(
          ((set) => ({
            obj: { a: 0 },
            setObj: (newObj) => {
              set({ obj: newObj });
            },
          })) satisfies StateCreator<ObjState>,
          { storageMapping: { obj: true }, presenceMapping: {} }
        );
        await enterAndConnect(store, roomId);
        await waitFor(
          () => store.getState().liveblocks.isStorageLoading === false
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
  });

  describe("past regressions", () => {
    // Fixes this bug reported by Arcol
    // https://github.com/liveblocks/liveblocks/issues/491
    test("assigning explicit-`undefined` to a nested key should delete it", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: {
          nest: { liveblocksType: "LiveObject", data: { a: 13 } },
        },
      });

      interface NestState {
        nest: { a?: number };
        setA: (a?: number) => void;
      }

      const { store: storeA } = createTestStore(
        ((set) => ({
          nest: { a: 13 },
          setA: (a) => {
            set({ nest: { a } });
          },
        })) satisfies StateCreator<NestState>,
        { storageMapping: { nest: true }, presenceMapping: {} }
      );
      await enterAndConnect(storeA, roomId);
      await waitFor(
        () => storeA.getState().liveblocks.isStorageLoading === false
      );

      expect(storeA.getState().nest.a).toBe(13);

      storeA.getState().setA(undefined);

      // Local state should reflect the deletion immediately
      expect(storeA.getState().nest.a).toBeUndefined();

      // Verify the deletion was synced — a second client should also
      // see `a` as undefined
      const { store: storeB } = createTestStore(
        ((set) => ({
          nest: { a: 99 },
          setA: (a) => {
            set({ nest: { a } });
          },
        })) satisfies StateCreator<NestState>,
        { storageMapping: { nest: true }, presenceMapping: {} }
      );
      await enterAndConnect(storeB, roomId);
      await waitFor(
        () => storeB.getState().liveblocks.isStorageLoading === false
      );
      expect(storeB.getState().nest.a).toBeUndefined();
    });
  });

  describe("history", () => {
    test("undo / redo", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const store = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      expect(store.getState().value).toBe(1);

      store.getState().setValue(2);
      expect(store.getState().value).toBe(2);

      store.getState().liveblocks.room!.history.undo();
      expect(store.getState().value).toBe(1);

      store.getState().liveblocks.room!.history.redo();
      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const store = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      expect(store.getState().value).toBe(1);

      store.getState().setValue(2);
      expect(store.getState().value).toBe(2);

      store.getState().liveblocks.room!.history.undo();

      store.getState().setCursor({ x: 0, y: 1 });

      store.getState().liveblocks.room!.history.redo();
      expect(store.getState().value).toBe(2);
    });

    test("updating presence should not reset redo stack", async () => {
      const roomId = await initRoom({
        liveblocksType: "LiveObject",
        data: { value: 1 },
      });

      const store = createBasicStore();
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      store
        .getState()
        .liveblocks.room?.updatePresence(
          { cursor: { x: 100, y: 100 } },
          { addToHistory: true }
        );

      store
        .getState()
        .liveblocks.room?.updatePresence(
          { cursor: { x: 200, y: 200 } },
          { addToHistory: true }
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
          // @ts-expect-error Deliberately testing missing client
          client: undefined,
          storageMapping: {},
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("storageMapping should be an object", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: "invalid_mapping",
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("invalid storageMapping key value should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: { key: "value" },
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("duplicated key should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: { key: true },
          presenceMapping: { key: true },
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("invalid presenceMapping should throw", () => {
      const client = createClient({ publicApiKey: "pk_localdev" });
      expect(() =>
        liveblocksMiddleware(() => ({}), {
          client,
          storageMapping: {},
          presenceMapping: "invalid_mapping",
        })
      ).toThrow(INVALID_CONFIG_ERROR);
    });

    test("mapping on function should throw", async () => {
      const roomId = await initRoom();

      interface FuncTestState {
        notAFunc: any;
        setFunction: () => void;
      }

      const { store } = createTestStore(
        ((set) => ({
          notAFunc: null,
          setFunction: () => {
            set({ notAFunc: /* 😈 */ () => {} });
          },
        })) satisfies StateCreator<FuncTestState>,
        {
          storageMapping: { notAFunc: true },
          presenceMapping: {},
        }
      );
      await enterAndConnect(store, roomId);
      await waitFor(
        () => store.getState().liveblocks.isStorageLoading === false
      );

      expect(() => store.getState().setFunction()).toThrow(
        INVALID_CONFIG_ERROR
      );
    });
  });
});
