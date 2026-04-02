import * as fc from "fast-check";
import { produce } from "immer";
import type { MockInstance } from "vitest";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import {
  jsonObject,
  liveStructure,
  liveStructureWithoutMap,
} from "../crdts/__tests__/_arbitraries";
import { LiveList } from "../crdts/LiveList";
import { LiveMap } from "../crdts/LiveMap";
import { LiveObject } from "../crdts/LiveObject";
import type { LsonObject, ToJson } from "../crdts/Lson";
import type { StorageUpdate } from "../crdts/StorageUpdates";
import {
  legacy_patchImmutableObject,
  legacy_patchLiveObject,
  legacy_patchLiveObjectKey,
  lsonToJson,
} from "../immutable";
import { kInternal } from "../internal";
import * as console from "../lib/fancy-console";
import type { PlainLsonObject } from "../types/PlainLson";
import {
  enterConnectAndGetStorage,
  initRoom,
  prepareStorageUpdateTest,
} from "./_devserver";
import { objectUpdate } from "./_updatesUtils";

/**
 * Sets up two real clients (A and B) connected to the same room via the dev
 * server, with storage initialized from `initialStorage`.
 *
 * Returns:
 * - `storage`  — client A's storage root (the "active" client that tests
 *   mutate via `legacy_patchLiveObjectKey` / `legacy_patchLiveObject`)
 * - `refStorage` — client B's storage root (the "reference" client that
 *   passively receives changes via server-mediated sync)
 * - `state` — a plain-JSON mirror of client A's storage, shared by reference
 *   with the caller. Tests mutate this object directly (e.g.
 *   `state.foo = "bar"`) and then call `legacy_patchLiveObjectKey` to propagate
 *   the diff into the live CRDT tree.
 * - `expectStorageAndState(data, itemsCount?)` — asserts that both clients'
 *   storage equals `data`, that the CRDT node count matches `itemsCount`
 *   (if provided), and that the JSON `state` mirror was kept in sync by
 *   the `storageBatch` subscription.
 * - `expectStorage(data)` — lighter variant that only checks storage equality
 *   across both clients (no node count or state mirror checks).
 */
export async function prepareStorageImmutableTest<S extends LsonObject>(
  initialStorage: PlainLsonObject
) {
  const roomId = await initRoom(initialStorage);

  const [clientA, clientB] = await Promise.all([
    enterConnectAndGetStorage<S>(roomId),
    enterConnectAndGetStorage<S>(roomId),
  ]);

  const storageA = clientA.storage;
  const storageB = clientB.storage;

  // Wait for both clients to sync initial storage
  await vi.waitFor(() => {
    expect(lsonToJson(storageA.root)).toEqual(lsonToJson(storageB.root));
  });

  const state = lsonToJson(storageA.root) as ToJson<S>;

  async function expectStorageAndState(data: ToJson<S>, itemsCount?: number) {
    expect(lsonToJson(storageA.root)).toEqual(data);

    await vi.waitFor(() => {
      expect(lsonToJson(storageB.root)).toEqual(data);
    });

    if (itemsCount !== undefined) {
      expect(clientA.room[kInternal].nodeCount).toBe(itemsCount);
    }
  }

  async function expectStorage(data: ToJson<S>) {
    expect(lsonToJson(storageA.root)).toEqual(data);
    await vi.waitFor(() => {
      expect(lsonToJson(storageB.root)).toEqual(data);
    });
  }

  return {
    storage: storageA,
    refStorage: storageB,
    expectStorageAndState,
    expectStorage,
    state,
  };
}

describe("immutableIs", () => {
  test("returns true when cached immutable matches the provided value", () => {
    const liveObj = new LiveObject({ a: 1 });
    const snapshot = liveObj.toImmutable();
    expect(liveObj.immutableIs(snapshot)).toBe(true);
  });

  test("returns false when toImmutable was never called", () => {
    const liveObj = new LiveObject({ a: 1 });
    expect(liveObj.immutableIs({ a: 1 })).toBe(false);
  });

  test("returns false after invalidation", () => {
    const liveObj = new LiveObject({ a: 1 });
    const snapshot = liveObj.toImmutable();
    liveObj.set("a", 2);
    expect(liveObj.immutableIs(snapshot)).toBe(false);
  });

  test("returns false when value does not match", () => {
    const liveObj = new LiveObject({ a: 1 });
    liveObj.toImmutable();
    expect(liveObj.immutableIs({ a: 999 })).toBe(false);
  });
});

describe("toJSON", () => {
  test("property: without LiveMaps, toJSON() always deep-equals toImmutable()", () => {
    fc.assert(
      fc.property(liveStructureWithoutMap, (live) => {
        expect(live.toJSON()).toEqual(live.toImmutable());
      })
    );
  });

  test("property: with LiveMaps, toJSON() replaces Map instances with plain objects", () => {
    /**
     * Recursively walks the toImmutable() result and converts every Map
     * instance to a plain object, so we can assert structural equality
     * with toJSON().
     */
    function mapsToObjects(value: unknown): unknown {
      if (value instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of value) {
          obj[k] = mapsToObjects(v);
        }
        return obj;
      }
      if (Array.isArray(value)) {
        return value.map(mapsToObjects);
      }
      if (value !== null && typeof value === "object") {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          obj[k] = mapsToObjects(v);
        }
        return obj;
      }
      return value;
    }

    fc.assert(
      fc.property(liveStructure, (live) => {
        expect(live.toJSON()).toEqual(mapsToObjects(live.toImmutable()));
      })
    );
  });

  test("property: toJSON() result never contains Map instances", () => {
    function containsMap(value: unknown): boolean {
      if (value instanceof Map) return true;
      if (Array.isArray(value)) return value.some(containsMap);
      if (value !== null && typeof value === "object") {
        return Object.values(value).some(containsMap);
      }
      return false;
    }

    fc.assert(
      fc.property(liveStructure, (live) => {
        expect(containsMap(live.toJSON())).toBe(false);
      })
    );
  });

  test("toJSON() is cached (returns same reference on repeated calls)", () => {
    const liveObj = new LiveObject({ a: 1, b: new LiveList([2, 3]) });
    const first = liveObj.toJSON();
    const second = liveObj.toJSON();
    expect(first).toBe(second);
  });

  test("toJSON() cache is invalidated after mutation", () => {
    const liveObj = new LiveObject({ a: 1 });
    const before = liveObj.toJSON();
    liveObj.set("a", 2);
    const after = liveObj.toJSON();
    expect(before).not.toBe(after);
    expect(after).toEqual({ a: 2 });
  });
});

describe("reconcileLiveObject", () => {
  test("updates a changed scalar value", () => {
    const liveObj = new LiveObject({ a: 1, b: 2 });
    liveObj.reconcile({ a: 1, b: 3 });
    expect(liveObj.toImmutable()).toEqual({ a: 1, b: 3 });
  });

  test("adds a new key", () => {
    const liveObj = new LiveObject({ a: 1 });
    liveObj.reconcile({ a: 1, b: "hello" });
    expect(liveObj.toImmutable()).toEqual({ a: 1, b: "hello" });
  });

  test("deletes a removed key", () => {
    const liveObj = new LiveObject({ a: 1, b: 2 });
    liveObj.reconcile({ a: 1 });
    expect(liveObj.toImmutable()).toEqual({ a: 1 });
  });

  test("leaves unchanged scalars untouched", () => {
    const liveObj = new LiveObject({ a: 1, b: 2 });
    const before = liveObj.toImmutable();

    liveObj.reconcile({ a: 1, b: 2 });
    expect(liveObj.toImmutable()).toEqual({ a: 1, b: 2 });

    // Referentially identical when a no-op
    expect(liveObj.toImmutable()).toBe(before);
  });

  test("deep-liveifies a new nested object", () => {
    const liveObj = new LiveObject<{ a: number; nested?: { x: number } }>({
      a: 1,
    });
    liveObj.reconcile({ a: 1, nested: { x: 10 } });
    expect(liveObj.toImmutable()).toEqual({ a: 1, nested: { x: 10 } });
    expect(liveObj.get("nested")).toBeInstanceOf(LiveObject);
  });

  test("recursively reconciles a nested LiveObject", () => {
    const liveObj = new LiveObject({
      nested: new LiveObject({ x: 1, y: 2 }),
    });
    const nestedBefore = liveObj.get("nested");
    liveObj.reconcile({ nested: { x: 1, y: 99 } });
    expect(liveObj.toImmutable()).toEqual({ nested: { x: 1, y: 99 } });
    // Same LiveObject instance — reconciled in place, not replaced
    expect(liveObj.get("nested")).toBe(nestedBefore);
  });

  test("replaces LiveObject with scalar when type changes", () => {
    const liveObj = new LiveObject({
      val: new LiveObject({ x: 1 }),
    });
    liveObj.reconcile({ val: 42 });
    expect(liveObj.toImmutable()).toEqual({ val: 42 });
  });

  test("deep-liveifies a new array as LiveList", () => {
    const liveObj = new LiveObject<{ a: number; items?: number[] }>({ a: 1 });
    liveObj.reconcile({ a: 1, items: [1, 2, 3] });
    expect(liveObj.toImmutable()).toEqual({ a: 1, items: [1, 2, 3] });
    expect(liveObj.get("items")).toBeInstanceOf(LiveList);
  });

  test("reconciles a nested LiveList", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2, 3]),
    });
    const listBefore = liveObj.get("items");
    liveObj.reconcile({ items: [1, 2, 4] });
    expect(liveObj.toImmutable()).toEqual({ items: [1, 2, 4] });
    // Same LiveList instance
    expect(liveObj.get("items")).toBe(listBefore);
  });

  test("skips subtree when cached immutable matches", () => {
    const nested = new LiveObject({ x: 1, y: 2 });
    const liveObj = new LiveObject({ nested });
    const snapshot = nested.toImmutable();
    liveObj.reconcile({ nested: snapshot });
    expect(liveObj.toImmutable()).toEqual({ nested: { x: 1, y: 2 } });
    expect(liveObj.get("nested")).toBe(nested);
  });

  test("handles deeply nested updates minimally", () => {
    const liveObj = new LiveObject({
      foo: new LiveObject({
        bar: new LiveObject({ qux: 1, other: "keep" }),
      }),
    });
    const barBefore = liveObj.get("foo")?.get("bar");
    liveObj.reconcile({
      foo: { bar: { qux: 123, other: "keep" } },
    });
    expect(liveObj.toImmutable()).toEqual({
      foo: { bar: { qux: 123, other: "keep" } },
    });
    // Same LiveObject instances preserved
    expect(liveObj.get("foo")?.get("bar")).toBe(barBefore);
  });

  test("replaces LiveObject in list when json is scalar", () => {
    const liveObj = new LiveObject({
      items: new LiveList([new LiveObject({ a: 1 })]),
    });
    liveObj.reconcile({ items: [42] });
    expect(liveObj.toImmutable()).toEqual({ items: [42] });
  });

  test("appends elements when new array is longer", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2]),
    });
    liveObj.reconcile({ items: [1, 2, 3, 4] });
    expect(liveObj.toImmutable()).toEqual({ items: [1, 2, 3, 4] });
  });

  test("removes elements when new array is shorter", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2, 3, 4]),
    });
    liveObj.reconcile({ items: [1, 2] });
    expect(liveObj.toImmutable()).toEqual({ items: [1, 2] });
  });

  test("replaces LiveList with scalar when type changes", () => {
    const liveObj = new LiveObject({
      val: new LiveList([1, 2]),
    });
    liveObj.reconcile({ val: "hello" });
    expect(liveObj.toImmutable()).toEqual({ val: "hello" });
  });

  test("replaces scalar with LiveObject when type changes", () => {
    const liveObj = new LiveObject({ val: 42 });
    liveObj.reconcile({ val: { a: 1 } });
    expect(liveObj.toImmutable()).toEqual({ val: { a: 1 } });
    expect(liveObj.get("val")).toBeInstanceOf(LiveObject);
  });

  test("replaces scalar with LiveList when type changes", () => {
    const liveObj = new LiveObject({ val: 42 });
    liveObj.reconcile({ val: [1, 2] });
    expect(liveObj.toImmutable()).toEqual({ val: [1, 2] });
    expect(liveObj.get("val")).toBeInstanceOf(LiveList);
  });

  test("throws when encountering a LiveMap", () => {
    const liveObj = new LiveObject({
      map: new LiveMap([["a", 1]]),
    });
    expect(() => liveObj.reconcile({ map: { a: 2 } })).toThrow(
      "LiveMap is not supported yet"
    );
  });

  test("property: reconciling to any JsonObject produces matching immutable", () => {
    fc.assert(
      fc.property(jsonObject, jsonObject, (initial, target) => {
        const liveObj = LiveObject.from(initial);
        expect(liveObj.toImmutable()).toEqual(initial);

        liveObj.reconcile(target);
        expect(liveObj.toImmutable()).toEqual(target);
      })
    );
  });

  // --- Dev-server tests: verify minimal ops ---

  test("changing one nested key only emits update for that key path", async () => {
    const { rootA, expectUpdates } = await prepareStorageUpdateTest<{
      nested: LiveObject<{ x: number; y: number }>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        nested: { liveblocksType: "LiveObject", data: { x: 1, y: 2 } },
      },
    });

    rootA.reconcile({ nested: { x: 1, y: 99 } });

    await expectUpdates([
      [
        // Only the inner "nested" object should fire with { y: update }
        objectUpdate({ x: 1, y: 99 }, { y: { type: "update" } }),
      ],
    ]);
  });

  test("unchanged data emits no updates", async () => {
    const { rootA, expectUpdates } = await prepareStorageUpdateTest<{
      a: number;
      b: number;
    }>({
      liveblocksType: "LiveObject",
      data: { a: 1, b: 2 },
    });

    rootA.reconcile({ a: 1, b: 2 });

    await expectUpdates([]);
  });

  test("deeply nested change only emits updates along the changed path", async () => {
    const { rootA, expectUpdates } = await prepareStorageUpdateTest<{
      foo: LiveObject<{
        bar: LiveObject<{ qux: number; keep: string }>;
      }>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        foo: {
          liveblocksType: "LiveObject",
          data: {
            bar: {
              liveblocksType: "LiveObject",
              data: { qux: 1, keep: "same" },
            },
          },
        },
      },
    });

    rootA.reconcile({ foo: { bar: { qux: 123, keep: "same" } } });

    await expectUpdates([
      [
        // Only the innermost "bar" object fires with { qux: update }
        objectUpdate({ qux: 123, keep: "same" }, { qux: { type: "update" } }),
      ],
    ]);
  });
});

describe("legacy_patchLiveObjectKey", () => {
  test("should set string", () => {
    const liveObject = new LiveObject();
    legacy_patchLiveObjectKey(liveObject, "key", undefined, "value");
    expect(liveObject.get("key")).toBe("value");
  });

  test("should set number", () => {
    const liveObject = new LiveObject();
    legacy_patchLiveObjectKey(liveObject, "key", undefined, 0);
    expect(liveObject.get("key")).toBe(0);
  });

  test("should set LiveObject if next is object", () => {
    const liveObject = new LiveObject<{ key: LiveObject<{ a: number }> }>();
    legacy_patchLiveObjectKey(liveObject, "key", undefined, { a: 0 });
    const value = liveObject.get("key");
    expect(value instanceof LiveObject).toBe(true);
    expect(value.toObject()).toEqual({ a: 0 });
  });

  test("should delete key if next is undefined", () => {
    const liveObject = new LiveObject({ key: "value" });
    legacy_patchLiveObjectKey(liveObject, "key", "value", undefined);
    expect(liveObject.toObject()).toEqual({});
  });
});

describe("2 ways tests with two clients", () => {
  describe("Object/LiveObject", () => {
    test("create object", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: number };
        }>({
          liveblocksType: "LiveObject",
          data: {},
        });

      expect(state).toEqual({});

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncObj = { a: 1 };
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      await expectStorageAndState({ syncObj: { a: 1 } }, 2);
    });

    test("update object", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: number };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      expect(state).toEqual({ syncObj: { a: 0 } });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncObj.a = 1;
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      await expectStorageAndState({ syncObj: { a: 1 } }, 2);
    });

    test("add nested object", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: any };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      expect(state).toEqual({ syncObj: { a: 0 } });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncObj.a = { subA: "ok" };
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      await expectStorageAndState({ syncObj: { a: { subA: "ok" } } }, 3);
    });

    test("create LiveList with one LiveRegister item in same batch", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      expect(state).toEqual({ doc: {} });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.doc = { sub: [0] };
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "doc",
        oldState["doc"],
        newState["doc"]
      );

      await expectStorageAndState({ doc: { sub: [0] } }, 4);
    });

    test("create nested LiveList with one LiveObject item in same batch", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      expect(state).toEqual({ doc: {} });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.doc = { sub: { subSub: [{ a: 1 }] } };
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "doc",
        oldState["doc"],
        newState["doc"]
      );

      await expectStorageAndState({ doc: { sub: { subSub: [{ a: 1 }] } } }, 5);
    });

    test("Add nested objects in same batch", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      expect(state).toEqual({ doc: {} });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.doc = { pos: { a: { b: 1 } } };
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "doc",
        oldState["doc"],
        newState["doc"]
      );

      await expectStorageAndState({ doc: { pos: { a: { b: 1 } } } }, 4);
    });

    test("delete object key", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a?: number };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      expect(state).toEqual({ syncObj: { a: 0 } });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        delete draft.syncObj.a;
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      await expectStorageAndState({ syncObj: {} }, 2);
    });
  });

  describe("Array/LiveList", () => {
    test("replace array of 3 elements to 1 element", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<number>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: [1, 1, 1] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList = [2];
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: [2] });
    });

    test("add item to array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: [] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList.push("a");
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("replace first item in array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          list: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            list: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.list[0] = "D";
      });

      legacy_patchLiveObject(storage.root, oldState, newState);

      await expectStorageAndState({ list: ["D", "B", "C"] }, 5);
    });

    test("replace last item in array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          list: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            list: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.list[2] = "D";
      });

      legacy_patchLiveObject(storage.root, oldState, newState);

      await expectStorageAndState({ list: ["A", "B", "D"] }, 5);
    });

    test("insert item at beginning of array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a"] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList.unshift("b");
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["b", "a"] }, 4);
    });

    test("swap items in array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: {
              liveblocksType: "LiveList",
              data: ["a", "b", "c", "d"],
            },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList = ["d", "b", "c", "a"];
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["d", "b", "c", "a"] }, 6);
    });

    test("array of objects", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<LiveObject<{ a: number }>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: {
              liveblocksType: "LiveList",
              data: [{ liveblocksType: "LiveObject", data: { a: 1 } }],
            },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList[0].a = 2;
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: [{ a: 2 }] }, 3);
    });

    test("remove first item from array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a", "b"] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList.shift();
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["b"] }, 3);
    });

    test("remove last item from array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a", "b"] },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList.pop();
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("remove all elements of array except first", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: {
              liveblocksType: "LiveList",
              data: ["a", "b", "c"],
            },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList = ["a"];
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("remove all elements of array except last", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: {
              liveblocksType: "LiveList",
              data: ["a", "b", "c"],
            },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList = ["c"];
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: ["c"] }, 3);
    });

    test("remove all elements of array", async () => {
      const { storage, state, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: {
              liveblocksType: "LiveList",
              data: ["a", "b", "c"],
            },
          },
        });

      const oldState = state;
      const newState = produce(oldState, (draft) => {
        draft.syncList = [];
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncList",
        oldState["syncList"],
        newState["syncList"]
      );

      await expectStorageAndState({ syncList: [] }, 2);
    });
  });

  describe("unsupported types", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleErrorSpy: MockInstance;

    beforeAll(() => {
      originalEnv = process.env;
      consoleErrorSpy = vi.spyOn(console, "error");
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleErrorSpy.mockRestore();
    });

    test("new state contains a function", async () => {
      const { storage, state, expectStorage } =
        await prepareStorageImmutableTest<{ syncObj: { a: any } }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      expect(state).toEqual({ syncObj: { a: 0 } });

      const oldState = state;
      const newState = produce(oldState, (draft: any) => {
        draft.syncObj.a = () => {};
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      await expectStorage({ syncObj: { a: 0 } });
    });

    test("Production env - new state contains a function", async () => {
      const { storage, state } = await prepareStorageImmutableTest<{
        syncObj: { a: any };
      }>({
        liveblocksType: "LiveObject",
        data: {
          syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
        },
      });

      expect(state).toEqual({ syncObj: { a: 0 } });

      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
      };

      const oldState = state;
      const newState = produce(oldState, (draft: any) => {
        draft.syncObj.a = () => {};
      });

      legacy_patchLiveObjectKey(
        storage.root,
        "syncObj",
        oldState["syncObj"],
        newState["syncObj"]
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    });
  });
});

describe("legacy_patchImmutableObject", () => {
  test("update one sub object", () => {
    const state = { subA: { subsubA: { a: 1 } }, subB: { b: 1 } };

    const root = new LiveObject();
    root.set("subA", new LiveObject({ subsubA: new LiveObject({ a: 1 }) }));
    root.set("subB", new LiveObject({ b: 2 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root,
        updates: { subB: { type: "update" } },
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeFalsy();
    expect(newState.subA === state.subA).toBeTruthy();
    expect(newState).toEqual({ subA: { subsubA: { a: 1 } }, subB: { b: 2 } });
  });

  test("update one sub object of sub object", () => {
    const state = {
      subA: { subsubA: { a: 1 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    };

    const root = new LiveObject<{
      subA: LiveObject<{
        subsubA: LiveObject<{ a: number }>;
        subsubB: LiveObject<{ b: number }>;
      }>;
      subB: LiveObject<{ b: number }>;
    }>();
    root.set(
      "subA",
      new LiveObject({
        subsubA: new LiveObject({ a: 2 }),
        subsubB: new LiveObject({ b: 1 }),
      })
    );
    root.set("subB", new LiveObject({ b: 1 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubA: { type: "update" } },
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeTruthy();
    expect(newState.subA === state.subA).toBeFalsy();
    expect(newState.subA.subsubB === state.subA.subsubB).toBeTruthy();
    expect(newState.subA.subsubA === state.subA.subsubA).toBeFalsy();
    expect(newState).toEqual({
      subA: { subsubA: { a: 2 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    });
  });

  test("multiple updates", () => {
    const state = {
      subA: { subsubA: { a: 1 }, subsubB: { b: 1 } },
      subB: { b: 1 },
    };

    const root = new LiveObject<{
      subA: LiveObject<{
        subsubA: LiveObject<{ a: number }>;
        subsubB?: LiveObject<{ b: number }>;
      }>;
      subB: LiveObject<{ b: number }>;
    }>();
    root.set(
      "subA",
      new LiveObject({
        subsubA: new LiveObject({ a: 2 }),
      })
    );
    root.set("subB", new LiveObject({ b: 2 }));

    const updates: StorageUpdate[] = [
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubA: { type: "update" } },
      },
      {
        type: "LiveObject",
        node: root.get("subA"),
        updates: { subsubB: { type: "delete", deletedItem: "<dummy>" } },
      },
      {
        type: "LiveObject",
        node: root.get("subB"),
        updates: { b: { type: "update" } },
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.subB === state.subB).toBeFalsy();
    expect(newState.subA === state.subA).toBeFalsy();
    expect(newState.subA.subsubA === state.subA.subsubA).toBeFalsy();
    expect(newState).toEqual({
      subA: { subsubA: { a: 2 } },
      subB: { b: 2 },
    });
  });

  test("add element to Map/LiveMap", () => {
    const state = {
      map: { el1: { a: 1 } },
    };

    const root = new LiveObject<{ map: typeof liveMap }>();
    const liveMap = new LiveMap<string, LiveObject<{ a: number }>>();
    liveMap.set("el1", new LiveObject({ a: 1 }));
    liveMap.set("el2", new LiveObject({ a: 2 }));

    root.set("map", liveMap);

    const updates: StorageUpdate[] = [
      {
        type: "LiveMap",
        node: root.get("map"),
        updates: { el2: { type: "update" } },
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.map.el1 === state.map.el1).toBeTruthy();

    expect(newState).toEqual({
      map: { el1: { a: 1 }, el2: { a: 2 } },
    });
  });

  test("remove element from Map/LiveMap", () => {
    const state = {
      map: { el1: { a: 1 }, el2: { a: 2 } },
    };

    const root = new LiveObject<{ map: typeof liveMap }>();
    const liveMap = new LiveMap();
    liveMap.set("el1", new LiveObject({ a: 1 }));

    root.set("map", liveMap);

    const updates: StorageUpdate[] = [
      {
        type: "LiveMap",
        node: root.get("map"),
        updates: { el2: { type: "delete", deletedItem: "<dummy>" } },
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.map.el1 === state.map.el1).toBeTruthy();

    expect(newState).toEqual({
      map: { el1: { a: 1 } },
    });
  });

  test("replace an element in Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    };

    const root = new LiveObject<{
      list: typeof liveList;
    }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.push(new LiveObject({ a: 3 }));
    const obj1 = new LiveObject({ a: 4 });
    liveList.set(1, obj1);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 1, item: obj1, type: "set" }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();
    expect(newState.list[1] === state.list[1]).toBeFalsy();
    expect(newState.list[2] === state.list[2]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 4 }, { a: 3 }],
    });
  });

  test("insert element at the end of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{
      list: typeof liveList;
    }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    const obj1 = new LiveObject({ a: 3 });
    liveList.push(obj1);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 2, item: obj1, type: "insert" }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();
    expect(newState.list[1] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    });
  });

  test("insert element at the beginning of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject<{
      list: typeof liveList;
    }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    const newObj = new LiveObject({ a: 0 });
    liveList.push(newObj);
    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 0, item: newObj, type: "insert" }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeFalsy();
    expect(newState.list[1] === state.list[1]).toBeFalsy();

    expect(newState).toEqual({
      list: [{ a: 0 }, { a: 1 }],
    });
  });

  test("insert 2 elements at the beginning of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    const newObj1 = new LiveObject({ a: 2 });
    const newObj2 = new LiveObject({ a: 3 });

    liveList.push(newObj2);
    liveList.push(newObj1);

    liveList.push(new LiveObject({ a: 1 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 0, item: newObj1, type: "insert" },
          { index: 0, item: newObj2, type: "insert" },
        ],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[2] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 3 }, { a: 2 }, { a: 1 }],
    });
  });

  test("insert 2 elements at the end of and Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    const newObj1 = new LiveObject({ a: 2 });
    const newObj2 = new LiveObject({ a: 3 });

    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(newObj1);
    liveList.push(newObj2);

    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 1, item: newObj1, type: "insert" },
          { index: 2, item: newObj2, type: "insert" },
        ],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    });
  });

  test("insert element in the middle of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    const newObj = new LiveObject({ a: 15 });
    liveList.push(newObj);
    liveList.push(new LiveObject({ a: 2 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 1, item: newObj, type: "insert" }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();
    expect(newState.list[2] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }, { a: 15 }, { a: 2 }],
    });
  });

  test("delete element from the end of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 1, type: "delete", deletedItem: liveList.get(1)! }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[0]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 1 }],
    });
  });

  test("delete element from the beginning of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.delete(0);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [{ index: 0, type: "delete", deletedItem: liveList.get(0)! }],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[1]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 2 }],
    });
  });

  test("delete 2 elements from the beginning of Array/LiveList", () => {
    const state = {
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
    };

    const root = new LiveObject<{ list: typeof liveList }>();
    const liveList = new LiveList<LiveObject<{ a: number }>>([]);
    liveList.push(new LiveObject({ a: 1 }));
    liveList.push(new LiveObject({ a: 2 }));
    liveList.push(new LiveObject({ a: 3 }));
    const x = liveList.get(0)!;
    liveList.delete(0);
    const y = liveList.get(0)!;
    liveList.delete(0);
    root.set("list", liveList);

    const updates: StorageUpdate[] = [
      {
        type: "LiveList",
        node: root.get("list"),
        updates: [
          { index: 0, type: "delete", deletedItem: x },
          { index: 0, type: "delete", deletedItem: y },
        ],
      },
    ];

    const newState = legacy_patchImmutableObject(state, updates);

    expect(newState.list[0] === state.list[2]).toBeTruthy();

    expect(newState).toEqual({
      list: [{ a: 3 }],
    });
  });

  describe("move items in array/LiveList", () => {
    test("move index 2 to 0", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      const movedObj = new LiveObject({ i: "c" });
      liveList.push(movedObj);
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "b" }));
      liveList.push(new LiveObject({ i: "d" }));

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 0, previousIndex: 2, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[1] === state.list[0]).toBeTruthy();
      expect(newState.list[2] === state.list[1]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "c" }, { i: "a" }, { i: "b" }, { i: "d" }],
      });
    });

    test("move index 0 to 3", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      liveList.push(new LiveObject({ i: "b" }));
      liveList.push(new LiveObject({ i: "c" }));
      liveList.push(new LiveObject({ i: "d" }));
      const movedObj = new LiveObject({ i: "a" });
      liveList.push(movedObj);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 3, previousIndex: 0, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[1]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "b" }, { i: "c" }, { i: "d" }, { i: "a" }],
      });
    });

    test("move index 1 to 3", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "c" }));
      liveList.push(new LiveObject({ i: "d" }));
      const movedObj = new LiveObject({ i: "b" });
      liveList.push(movedObj);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 3, previousIndex: 1, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[0]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "a" }, { i: "c" }, { i: "d" }, { i: "b" }],
      });
    });

    test("move index 1 to 2", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      liveList.push(new LiveObject({ i: "a" }));
      liveList.push(new LiveObject({ i: "c" }));
      const movedObj = new LiveObject({ i: "b" });
      liveList.push(movedObj);
      liveList.push(new LiveObject({ i: "d" }));

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 2, previousIndex: 1, item: movedObj, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[0]).toBeTruthy();
      expect(newState.list[1] === state.list[2]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "a" }, { i: "c" }, { i: "b" }, { i: "d" }],
      });
    });

    test("2 moves different places", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      const objA = new LiveObject({ i: "a" });
      const objB = new LiveObject({ i: "b" });
      const objC = new LiveObject({ i: "c" });
      const objD = new LiveObject({ i: "d" });

      liveList.push(objB);
      liveList.push(objA);
      liveList.push(objD);
      liveList.push(objC);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 1, previousIndex: 0, item: objA, type: "move" },
            { index: 3, previousIndex: 2, item: objC, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[0] === state.list[1]).toBeTruthy();
      expect(newState.list[2] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "b" }, { i: "a" }, { i: "d" }, { i: "c" }],
      });
    });

    test("2 moves same place ([a b c d] => [b a c d] => [c b a d])", () => {
      const state = {
        list: [{ i: "a" }, { i: "b" }, { i: "c" }, { i: "d" }],
      };

      const root = new LiveObject<{ list: typeof liveList }>();
      const liveList = new LiveList<LiveObject<{ i: string }>>([]);
      const objA = new LiveObject({ i: "a" });
      const objB = new LiveObject({ i: "b" });
      const objC = new LiveObject({ i: "c" });
      const objD = new LiveObject({ i: "d" });

      liveList.push(objC);
      liveList.push(objB);
      liveList.push(objA);
      liveList.push(objD);

      root.set("list", liveList);

      const updates: StorageUpdate[] = [
        {
          type: "LiveList",
          node: root.get("list"),
          updates: [
            { index: 0, previousIndex: 1, item: objB, type: "move" },
            { index: 0, previousIndex: 2, item: objC, type: "move" },
          ],
        },
      ];

      const newState = legacy_patchImmutableObject(state, updates);

      expect(newState.list[2] === state.list[0]).toBeTruthy();
      expect(newState.list[3] === state.list[3]).toBeTruthy();

      expect(newState).toEqual({
        list: [{ i: "c" }, { i: "b" }, { i: "a" }, { i: "d" }],
      });
    });
  });
});
