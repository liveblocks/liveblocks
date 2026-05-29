/**
 * Notification-equivalence tests for the reconnect path.
 *
 * Each test calls `bothPhases`, which runs the same `mutate` function in two
 * fully-independent fresh room pairs that share the same `initialStorage`:
 *
 *   Phase 1 (online):            A is connected; B makes mutations; A receives
 *                                them as live ops and fires notifications.
 *   Phase 2 (offline+reconnect): A disconnects; B makes the same mutations; A
 *                                reconnects and receives them as a snapshot.
 *
 * Because both phases start from identical state and apply identical mutations,
 * the resulting StorageUpdate batches must be equal. Each test asserts that
 * equivalence — this is the spec for the node-stream reconcile refactor (see
 * tech-design-node-stream-reconcile.md) and must pass on the current
 * diff+apply path before any _reconcile code is written.
 *
 * NOTE ON CONTROL KEYS: several LiveObject tests carry an unchanged scalar key
 * (e.g. `keep`) that the mutation never touches. The reconnect path routes a
 * snapshot through `getTreesDiffOperations`, which re-sends the *full*
 * UPDATE_OBJECT data — so an unchanged key can be spuriously re-notified. The
 * control key is what makes that bug observable; do not remove it.
 */
import { expect, onTestFinished, test } from "vitest";
import WebSocket from "ws";

import { nanoid } from "../src";
import { createClient } from "../src/client";
import { LiveList } from "../src/crdts/LiveList";
import { LiveMap } from "../src/crdts/LiveMap";
import { LiveObject } from "../src/crdts/LiveObject";
import type { LsonObject } from "../src/crdts/Lson";
import type { StorageUpdate } from "../src/crdts/StorageUpdates";
import type { Json, JsonObject } from "../src/lib/Json";
import type { Room } from "../src/room";

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = `http://localhost:${process.env.LIVEBLOCKS_DEV_SERVER_PORT ?? 1154}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = 10_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await sleep(50);
  }
  throw new Error(`Timed out waiting for: ${description} (${timeoutMs}ms)`);
}

type Actor<S extends LsonObject> = {
  room: Room<JsonObject, S>;
  root: LiveObject<S>;
};

// Create one room participant and wait until it is connected with storage
// loaded. The first actor to join a room creates it with `initialStorage`;
// later joiners pass `{}` and receive the existing storage from the server.
async function createActor<S extends LsonObject>(
  roomId: string,
  initialStorage: S
): Promise<Actor<S>> {
  const client = createClient({
    __DANGEROUSLY_disableThrottling: true,
    publicApiKey: "pk_localdev",
    polyfills: {
      WebSocket: WebSocket as unknown as typeof globalThis.WebSocket,
    },
    baseUrl: BASE_URL,
  });

  // XXX enterRoom needs explicit generics + a cast to accept the test options;
  //     mirrors the pattern in e2e/utils.ts.
  const { room, leave } = client.enterRoom<JsonObject, S, Json>(roomId, {
    initialPresence: {},
    initialStorage,
  } as never);

  await waitUntil(
    () => room.getStatus() === "connected",
    `room ${roomId} connected`
  );

  const { root } = await room.getStorage();
  onTestFinished(() => leave());

  return { room: room as Room<JsonObject, S>, root };
}

// A JSON.stringify replacer that emits object keys in sorted order, so two
// structurally-equal trees stringify identically. LiveObject key order differs
// between a locally-built tree and one loaded from the server (inline `data`
// keys vs child nodes merge in different orders), so a plain JSON.stringify
// comparison is not reliable. Returning a key-sorted copy makes stringify walk
// the keys in canonical order (it recurses into the returned object's values).
function sortKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    )
  );
}

const sameJson = <S extends LsonObject>(a: Actor<S>, b: Actor<S>): boolean =>
  JSON.stringify(a.root.toJSON(), sortKeys) ===
  JSON.stringify(b.root.toJSON(), sortKeys);

// ─────────────────────────────────────────────────────────────────────────────
// bothPhases
// ─────────────────────────────────────────────────────────────────────────────

// Run `mutate` in two independent fresh room pairs with the same
// `initialStorage`, and return the StorageUpdate batches A receives in each:
//
//   online.batches    — A stayed connected; got B's mutations as live ops.
//   reconnect.batches — A disconnected; got B's mutations via a fresh snapshot.
//
// Both phases start from the same state and apply the same mutations, so the
// batches should be structurally identical. Each test asserts that.
//
// We capture only the notifications that result from B's mutations: in each
// phase A's subscription is attached right before those mutations land (online)
// or right before the reconnect snapshot is applied (reconnect), so no
// connection/handshake noise leaks into the batches.
async function bothPhases<S extends LsonObject>(
  initialStorageFn: () => S,
  mutate: (root: LiveObject<S>) => void
): Promise<{
  online: { batches: StorageUpdate[][]; root: LiveObject<S> };
  reconnect: { batches: StorageUpdate[][]; root: LiveObject<S> };
}> {
  // ── Phase 1: online ──────────────────────────────────────────────────────
  const roomId1 = "notif-equiv-" + nanoid();
  const a1 = await createActor(roomId1, initialStorageFn());
  const b1 = await createActor(roomId1, initialStorageFn());

  const onlineBatches: StorageUpdate[][] = [];
  a1.room.subscribe(a1.root, (u) => onlineBatches.push(u), { isDeep: true });

  mutate(b1.root);
  await waitUntil(() => sameJson(a1, b1), "Phase 1: A converges to B");
  await sleep(100);

  // ── Phase 2: offline + reconnect ─────────────────────────────────────────
  const roomId2 = "notif-equiv-" + nanoid();
  const a2 = await createActor(roomId2, initialStorageFn());
  const b2 = await createActor(roomId2, initialStorageFn());

  // A goes offline; B applies the mutations and flushes them to the server.
  a2.room.disconnect();
  mutate(b2.root);
  await sleep(300); // let the server store B's changes before A re-fetches

  // Subscribe only now, so the batches contain exactly the reconnect reconcile.
  const reconnectBatches: StorageUpdate[][] = [];
  a2.room.subscribe(a2.root, (u) => reconnectBatches.push(u), { isDeep: true });

  a2.room.reconnect();
  await waitUntil(
    () => sameJson(a2, b2),
    "Phase 2: A converges to B after reconnect"
  );
  await sleep(100);

  return {
    online: { batches: onlineBatches, root: a1.root },
    reconnect: { batches: reconnectBatches, root: a2.root },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch reducers
// ─────────────────────────────────────────────────────────────────────────────

type ListUpdate = Extract<StorageUpdate, { type: "LiveList" }>;
type ObjUpdate = Extract<StorageUpdate, { type: "LiveObject" }>;
type MapUpdate = Extract<StorageUpdate, { type: "LiveMap" }>;

// StorageUpdate[][] (one array per notification batch)
//   → flat array of LiveListUpdateDelta for the given node
//
//   [ [{type:"LiveList", node:list1, updates:[{type:"insert",index:0,item:"a"}]}],
//     [{type:"LiveList", node:list1, updates:[{type:"insert",index:1,item:"b"}]}] ]
//                                     ↓
//   [ {type:"insert",index:0,item:"a"}, {type:"insert",index:1,item:"b"} ]
function collectListDeltas(
  batches: StorageUpdate[][],
  targetNode: object
): ListUpdate["updates"] {
  return batches
    .flat()
    .filter(
      (u): u is ListUpdate =>
        u.type === "LiveList" && (u.node as object) === targetNode
    )
    .flatMap((u) => u.updates);
}

// StorageUpdate[][] (one array per notification batch)
//   → single merged LiveObjectUpdateDelta for the given node
//
//   [ [{type:"LiveObject", node:obj1, updates:{x:{type:"update"}}}],
//     [{type:"LiveObject", node:obj1, updates:{z:{type:"update"}}}] ]
//                                     ↓
//   { x: {type:"update"}, z: {type:"update"} }
function mergeObjUpdates(
  batches: StorageUpdate[][],
  targetNode: object
): ObjUpdate["updates"] {
  return batches
    .flat()
    .filter(
      (u): u is ObjUpdate =>
        u.type === "LiveObject" && (u.node as object) === targetNode
    )
    .reduce<ObjUpdate["updates"]>((acc, u) => ({ ...acc, ...u.updates }), {});
}

// StorageUpdate[][] (one array per notification batch)
//   → single merged LiveMapUpdates.updates for the given node
//
//   [ [{type:"LiveMap", node:map1, updates:{x:{type:"update"}}}],
//     [{type:"LiveMap", node:map1, updates:{b:{type:"delete",deletedItem:2}}}] ]
//                                   ↓
//   { x: {type:"update"}, b: {type:"delete", deletedItem:2} }
function mergeMapUpdates(
  batches: StorageUpdate[][],
  targetNode: object
): MapUpdate["updates"] {
  return batches
    .flat()
    .filter(
      (u): u is MapUpdate =>
        u.type === "LiveMap" && (u.node as object) === targetNode
    )
    .reduce<MapUpdate["updates"]>((acc, u) => ({ ...acc, ...u.updates }), {});
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveList
// ─────────────────────────────────────────────────────────────────────────────

test("LiveList: inserts fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ list: new LiveList<string>([]) }),
    (r) => {
      r.get("list").push("a");
      r.get("list").push("b");
    }
  );
  const expected = [
    { type: "insert", index: 0, item: "a" },
    { type: "insert", index: 1, item: "b" },
  ];
  expect(collectListDeltas(online.batches, online.root.get("list"))).toEqual(
    expected
  );
  expect(
    collectListDeltas(reconnect.batches, reconnect.root.get("list"))
  ).toEqual(expected);
});

test("LiveList: deletes fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ list: new LiveList<string>(["a", "b", "c"]) }),
    (r) => {
      r.get("list").delete(1); // remove "b"
    }
  );
  const expected = [{ type: "delete", index: 1, deletedItem: "b" }];
  expect(collectListDeltas(online.batches, online.root.get("list"))).toEqual(
    expected
  );
  expect(
    collectListDeltas(reconnect.batches, reconnect.root.get("list"))
  ).toEqual(expected);
});

test("LiveList: moves fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ list: new LiveList<string>(["a", "b", "c"]) }),
    (r) => {
      r.get("list").move(2, 0); // move "c" to front
    }
  );
  const expected = [{ type: "move", previousIndex: 2, index: 0, item: "c" }];
  expect(collectListDeltas(online.batches, online.root.get("list"))).toEqual(
    expected
  );
  expect(
    collectListDeltas(reconnect.batches, reconnect.root.get("list"))
  ).toEqual(expected);
});

// ─────────────────────────────────────────────────────────────────────────────
// LiveObject
// ─────────────────────────────────────────────────────────────────────────────

test("LiveObject: updates/adds fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    // `keep` is a control key the mutation never touches (see file header).
    () => ({
      obj: new LiveObject<{ x: number; keep: number; z?: string }>({
        x: 1,
        keep: 0,
      }),
    }),
    (r) => {
      r.get("obj").set("x", 99);
      r.get("obj").set("z", "new");
    }
  );
  const expected = { x: { type: "update" }, z: { type: "update" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

test("LiveObject: untouched scalar keys are never re-notified online or on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ obj: new LiveObject({ a: 1, b: 2, c: 3 }) }),
    (r) => {
      r.get("obj").set("a", 99); // b and c are untouched
    }
  );
  const expected = { a: { type: "update" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

test("LiveObject: scalar deletes fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ obj: new LiveObject({ a: 1, b: 2 }) }),
    (r) => {
      r.get("obj").delete("b"); // a survives
    }
  );
  const expected = { b: { type: "delete", deletedItem: 2 } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// LiveMap
// ─────────────────────────────────────────────────────────────────────────────

test("LiveMap: updates/adds fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({ map: new LiveMap<string, number>([["x", 1]]) }),
    (r) => {
      r.get("map").set("x", 99);
      r.get("map").set("z", 7);
    }
  );
  const expected = { x: { type: "update" }, z: { type: "update" } };
  expect(mergeMapUpdates(online.batches, online.root.get("map"))).toEqual(
    expected
  );
  expect(mergeMapUpdates(reconnect.batches, reconnect.root.get("map"))).toEqual(
    expected
  );
});

test("LiveMap: deletes fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({
      map: new LiveMap<string, number>([
        ["a", 1],
        ["b", 2],
      ]),
    }),
    (r) => {
      r.get("map").delete("b");
    }
  );
  const expected = { b: { type: "delete", deletedItem: 2 } };
  expect(mergeMapUpdates(online.batches, online.root.get("map"))).toEqual(
    expected
  );
  expect(mergeMapUpdates(reconnect.batches, reconnect.root.get("map"))).toEqual(
    expected
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// LiveObject key transitions: scalar ↔ nested live structure
//
// Scalars are stored in the LiveObject's own `data` field (serialized inline).
// Nested live structures become separate nodes in the pool (separate parentId
// chain). The two storage representations produce different ops on reconnect:
// scalar changes go through UPDATE_OBJECT / DELETE_OBJECT_KEY while nested
// node changes go through CREATE_*/DELETE_CRDT. Each test carries a `keep`
// control scalar so the snapshot's full-data UPDATE_OBJECT is exercised.
// ─────────────────────────────────────────────────────────────────────────────

test("LiveObject: nested-object deletes fire equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({
      obj: new LiveObject<{
        child: LiveObject<{ x: number }>;
        sibling: LiveObject<{ y: number }>;
        keep: number;
      }>({
        child: new LiveObject({ x: 1 }),
        sibling: new LiveObject({ y: 2 }),
        keep: 0,
      }),
    }),
    (r) => {
      r.get("obj").delete("child");
    }
  );
  // Deleting a nested live node fires { type: "delete" } with no deletedItem
  // (deletedItem is only set for scalar values).
  const expected = { child: { type: "delete" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

// Baseline (passes today): when the transitioned key is the object's *only*
// scalar, moving it into a child node empties the object's `data`, so the
// snapshot diff produces an UPDATE_OBJECT with empty data — nothing left for
// the full-data re-send to spuriously re-notify. Contrast with the next test,
// which adds a surviving scalar sibling and exposes that exact leak.
test("LiveObject: scalar→nested-object transition (sole key) fires equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({
      obj: new LiveObject<{ a: number | LiveObject<{ x: number }> }>({ a: 1 }),
    }),
    (r) => {
      r.get("obj").set("a", new LiveObject({ x: 10 }));
    }
  );
  // _attachChild always fires { type: "update" } regardless of the previous
  // value type (scalar or live node).
  const expected = { a: { type: "update" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

test("LiveObject: scalar→nested-object transition fires equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({
      obj: new LiveObject<{
        a: number | LiveObject<{ x: number }>;
        keep: number;
      }>({ a: 1, keep: 0 }),
    }),
    (r) => {
      r.get("obj").set("a", new LiveObject({ x: 10 }));
    }
  );
  // _attachChild always fires { type: "update" } regardless of the previous
  // value type (scalar or live node).
  const expected = { a: { type: "update" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});

test("LiveObject: nested-object→scalar transition fires equivalent notifications online and on reconnect", async () => {
  const { online, reconnect } = await bothPhases(
    () => ({
      obj: new LiveObject<{
        nested: LiveObject<{ x: number }> | number;
        keep: number;
      }>({
        nested: new LiveObject({ x: 1 }),
        keep: 0,
      }),
    }),
    (r) => {
      r.get("obj").set("nested", 99);
    }
  );
  // Replacing a live node with a scalar: _detachChild fires { type: "delete" }
  // then #applyUpdate fires { type: "update" }; merging last-write-wins gives
  // { type: "update" }.
  const expected = { nested: { type: "update" } };
  expect(mergeObjUpdates(online.batches, online.root.get("obj"))).toEqual(
    expected
  );
  expect(mergeObjUpdates(reconnect.batches, reconnect.root.get("obj"))).toEqual(
    expected
  );
});
