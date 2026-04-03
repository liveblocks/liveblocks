/**
 * Test utilities for running @liveblocks/core unit tests against the real
 * local dev server at localhost:1154.
 */
import { expect, onTestFinished, vi } from "vitest";

import { createClient } from "../client";
import type { LsonObject } from "../crdts/Lson";
import type { ToJson } from "../crdts/Lson";
import { kInternal } from "../internal";
import type { JsonObject } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import type { PlainLsonObject } from "../types/PlainLson";
import type { JsonStorageUpdate } from "./_updatesUtils";
import { serializeUpdateToJson } from "./_updatesUtils";

const DEV_SERVER = "http://localhost:1154";

export function randomRoomId(): string {
  return `room-${nanoid()}`;
}

/**
 * Creates a room on the dev server and initializes its storage.
 * Returns the room ID, which can be passed to enterAndConnect().
 */
export async function initRoom(storage?: PlainLsonObject): Promise<string> {
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

async function UNSAFE_generateAccessToken(
  roomId?: string,
  permissions?: string[]
) {
  const res = await fetch(`${DEV_SERVER}/v2/authorize-user`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `user-${nanoid()}`,
      userInfo: { name: "Testy McTester" },
      permissions: { [roomId!]: permissions ?? ["room:write"] },
    }),
  });
  return (await res.json()) as { token: string };
}

export function createTestClient(permissions?: string[]) {
  return createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: (roomId) => UNSAFE_generateAccessToken(roomId, permissions),
    polyfills: { WebSocket: globalThis.WebSocket },
    __DANGEROUSLY_disableThrottling: true,
  });
}

/**
 * Enters a room, waits for "connected" status, and registers cleanup
 * via onTestFinished.
 */
export async function enterAndConnect<S extends LsonObject>(
  roomId: string,
  opts?: { initialStorage?: S; permissions?: string[] }
) {
  const client = createTestClient(opts?.permissions);
  const { room, leave } = client.enterRoom<JsonObject, S>(
    roomId,
    // @ts-expect-error Test helper passes options directly
    {
      initialPresence: {},
      initialStorage: (opts?.initialStorage ?? {}) as S,
    }
  );

  onTestFinished(leave);

  await vi.waitUntil(() => room.getStatus() === "connected");
  return { room, leave };
}

/**
 * Like enterAndConnect, but also calls getStorage() before returning.
 * Useful for parallelizing connection + storage fetch across multiple clients.
 */
export async function enterConnectAndGetStorage<S extends LsonObject>(
  roomId: string,
  opts?: { permissions?: string[] }
) {
  const { room, leave } = await enterAndConnect<S>(roomId, opts);
  const storage = await room.getStorage();
  return { room, leave, storage };
}

/**
 * Atomically replaces a room's storage on the dev server and disconnects all
 * clients, forcing them to reconnect and reconcile with the new storage.
 *
 * TODO: This does not exist yet in the dev server.
 * See https://linear.app/liveblocks/issue/LB-3529/dev-server-needs-support-for-a-crash-replace-storage-atomic-feature
 *
 * The dev server needs a new endpoint (e.g. POST /v2/rooms/{roomId}/storage
 * with force-replace semantics) that:
 *   1. Replaces the room's storage with the provided PlainLsonObject
 *   2. Disconnects all connected clients in that room
 *   3. Clients reconnect automatically and receive the new storage
 *   4. The client reconciles the diff and fires subscription callbacks
 */
export async function replaceStorageAndReconnectDevServer(
  roomId: string,
  newStorage: PlainLsonObject
): Promise<void> {
  await fetch(`${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newStorage),
  });
}

// ---------------------------------------------------------------------------
// High-level test helpers
// ---------------------------------------------------------------------------

function deepCloneWithoutOpId<T>(item: T) {
  return JSON.parse(
    JSON.stringify(item),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (key, value) => (key === "opId" ? undefined : value)
  ) as T;
}

/**
 * Two clients (A and B) connected to the same room via the real dev server.
 *
 * Returns { roomA, roomB, storageA, storageB, expectStorage, assertUndoRedo }.
 *
 * - expectStorage(data) is async: asserts client A's storage equals `data`,
 *   then waits for client B to sync to the same state.
 * - assertUndoRedo() is async: walks the full undo/redo stack on client A,
 *   verifying client B stays in sync at each step.
 */
export async function prepareStorageTest<S extends LsonObject>(
  initialStorage: PlainLsonObject
) {
  const roomId = await initRoom(initialStorage);

  const [clientA, clientB] = await Promise.all([
    enterConnectAndGetStorage<S>(roomId),
    enterConnectAndGetStorage<S>(roomId),
  ]);

  const storageA = clientA.storage;
  const storageB = clientB.storage;

  // Wait for both clients to have synced initial storage
  await vi.waitFor(() => {
    expect(storageA.root.toJSON()).toEqual(storageB.root.toJSON());
  });

  const states: ToJson<S>[] = [];

  async function expectBothClientStoragesToEqual(data: ToJson<S>) {
    expect(storageA.root.toJSON()).toEqual(data);

    await vi.waitFor(() => {
      expect(storageB.root.toJSON()).toEqual(data);
    });

    expect(clientA.room[kInternal].nodeCount).toBe(
      clientB.room[kInternal].nodeCount
    );
  }

  async function expectStorage(data: ToJson<S>) {
    states.push(data);
    await expectBothClientStoragesToEqual(data);
  }

  async function assertUndoRedo() {
    const before = deepCloneWithoutOpId(
      clientA.room[kInternal].undoStack[
        clientA.room[kInternal].undoStack.length - 1
      ]
    );

    // Undo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      clientA.room.history.undo();
      await expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }

    // Redo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      clientA.room.history.redo();
      await expectBothClientStoragesToEqual(states[i + 1]);
    }

    const after = deepCloneWithoutOpId(
      clientA.room[kInternal].undoStack[
        clientA.room[kInternal].undoStack.length - 1
      ]
    );

    // It should be identical before/after
    expect(before).toEqual(after);

    // Undo everything again
    for (let i = 0; i < states.length - 1; i++) {
      clientA.room.history.undo();
      await expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }
  }

  return {
    roomA: clientA.room,
    roomB: clientB.room,
    storageA,
    storageB,
    expectStorage,
    assertUndoRedo,
  };
}

/**
 * Single client connected to a room via the real dev server.
 *
 * Returns { root, room, expectStorage }.
 *
 * - expectStorage(data) is synchronous: just asserts the single client's
 *   storage equals `data` (no second client to wait for).
 */
export async function prepareIsolatedStorageTest<S extends LsonObject>(
  initialStorage?: PlainLsonObject,
  opts?: { permissions?: string[] }
) {
  const roomId = initialStorage
    ? await initRoom(initialStorage)
    : randomRoomId();

  const { room, storage } = await enterConnectAndGetStorage<S>(roomId, {
    permissions: opts?.permissions,
  });

  function expectStorage(data: ToJson<S>) {
    expect(storage.root.toJSON()).toEqual(data);
  }

  return {
    root: storage.root,
    room,
    expectStorage,
  };
}

/**
 * Two clients (A and B) connected to the same room via the real dev server,
 * both subscribed to storageBatch events.
 *
 * Returns { roomA, roomB, rootA, expectUpdates }.
 *
 * - expectUpdates(updates) is async: asserts client A received the expected
 *   update batches, then waits for client B to receive the same.
 */
export async function prepareStorageUpdateTest<S extends LsonObject>(
  initialStorage: PlainLsonObject
) {
  const roomId = await initRoom(initialStorage);

  const [clientA, clientB] = await Promise.all([
    enterConnectAndGetStorage<S>(roomId),
    enterConnectAndGetStorage<S>(roomId),
  ]);

  const storageA = clientA.storage;
  const storageB = clientB.storage;

  // Wait for both clients to have synced initial storage
  await vi.waitFor(() => {
    expect(storageA.root.toJSON()).toEqual(storageB.root.toJSON());
  });

  const updatesA: JsonStorageUpdate[][] = [];
  const updatesB: JsonStorageUpdate[][] = [];

  onTestFinished(
    clientA.room.events.storageBatch.subscribe((updates) =>
      updatesA.push(updates.map(serializeUpdateToJson))
    )
  );
  onTestFinished(
    clientB.room.events.storageBatch.subscribe((updates) =>
      updatesB.push(updates.map(serializeUpdateToJson))
    )
  );

  async function expectUpdates(updates: JsonStorageUpdate[][]) {
    expect(updatesA).toEqual(updates);

    await vi.waitFor(() => {
      expect(updatesB).toEqual(updates);
    });
  }

  return {
    roomA: clientA.room,
    roomB: clientB.room,
    rootA: storageA.root,
    expectUpdates,
  };
}
