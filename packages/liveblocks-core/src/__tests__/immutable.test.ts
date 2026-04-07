import * as fc from "fast-check";
import { describe, expect, test, vi } from "vitest";

import { jsonObject, liveStructure } from "../crdts/__tests__/_arbitraries";
import { LiveList } from "../crdts/LiveList";
import { LiveMap } from "../crdts/LiveMap";
import { LiveObject } from "../crdts/LiveObject";
import type { LsonObject, ToJson } from "../crdts/Lson";
import { kInternal } from "../internal";
import type { JsonObject } from "../lib/Json";
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
 */
async function prepareStorageImmutableTest<S extends LsonObject>(
  initialStorage: PlainLsonObject
) {
  const roomId = await initRoom(initialStorage);

  const [clientA, clientB] = await Promise.all([
    enterConnectAndGetStorage<S>(roomId),
    enterConnectAndGetStorage<S>(roomId),
  ]);

  const storageA = clientA.storage;
  const storageB = clientB.storage;

  await vi.waitFor(() => {
    expect(storageA.root.toJSON()).toEqual(storageB.root.toJSON());
  });

  async function expectStorageAndState(
    data: ToJson<S>,
    expectedNodeCount?: number
  ) {
    expect(storageA.root.toJSON()).toEqual(data);

    await vi.waitFor(() => {
      expect(storageB.root.toJSON()).toEqual(data);
    });

    if (expectedNodeCount !== undefined) {
      expect(clientA.room[kInternal].nodeCount).toBe(expectedNodeCount);
    }
  }

  async function expectStorage(data: ToJson<S>) {
    expect(storageA.root.toJSON()).toEqual(data);
    await vi.waitFor(() => {
      expect(storageB.root.toJSON()).toEqual(data);
    });
  }

  return {
    storage: storageA,
    refStorage: storageB,
    expectStorageAndState,
    expectStorage,
  };
}

describe("hasCache", () => {
  test("returns true when cached immutable matches the provided value", () => {
    const liveObj = new LiveObject({ a: 1 });
    const snapshot = liveObj.toJSON();
    expect(liveObj.hasCache(snapshot)).toBe(true);
  });

  test("returns false when toJSON was never called", () => {
    const liveObj = new LiveObject({ a: 1 });
    expect(liveObj.hasCache({ a: 1 })).toBe(false);
  });

  test("returns false after invalidation", () => {
    const liveObj = new LiveObject({ a: 1 });
    const snapshot = liveObj.toJSON();
    liveObj.set("a", 2);
    expect(liveObj.hasCache(snapshot)).toBe(false);
  });

  test("returns false when value does not match", () => {
    const liveObj = new LiveObject({ a: 1 });
    liveObj.toJSON();
    expect(liveObj.hasCache({ a: 999 })).toBe(false);
  });
});

describe("toJSON", () => {
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
    expect(liveObj.toJSON()).toEqual({ a: 1, b: 3 });
  });

  test("adds a new key", () => {
    const liveObj = new LiveObject({ a: 1 });
    liveObj.reconcile({ a: 1, b: "hello" });
    expect(liveObj.toJSON()).toEqual({ a: 1, b: "hello" });
  });

  test("deletes a removed key", () => {
    const liveObj = new LiveObject({ a: 1, b: 2 });
    liveObj.reconcile({ a: 1 });
    expect(liveObj.toJSON()).toEqual({ a: 1 });
  });

  test("leaves unchanged scalars untouched", () => {
    const liveObj = new LiveObject({ a: 1, b: 2 });
    const before = liveObj.toJSON();

    liveObj.reconcile({ a: 1, b: 2 });
    expect(liveObj.toJSON()).toEqual({ a: 1, b: 2 });

    // Referentially identical when a no-op
    expect(liveObj.toJSON()).toBe(before);
  });

  test("deep-liveifies a new nested object", () => {
    const liveObj = new LiveObject<{ a: number; nested?: { x: number } }>({
      a: 1,
    });
    liveObj.reconcile({ a: 1, nested: { x: 10 } });
    expect(liveObj.toJSON()).toEqual({ a: 1, nested: { x: 10 } });
    expect(liveObj.get("nested")).toBeInstanceOf(LiveObject);
  });

  test("recursively reconciles a nested LiveObject", () => {
    const liveObj = new LiveObject({
      nested: new LiveObject({ x: 1, y: 2 }),
    });
    const nestedBefore = liveObj.get("nested");
    liveObj.reconcile({ nested: { x: 1, y: 99 } });
    expect(liveObj.toJSON()).toEqual({ nested: { x: 1, y: 99 } });
    // Same LiveObject instance — reconciled in place, not replaced
    expect(liveObj.get("nested")).toBe(nestedBefore);
  });

  test("replaces LiveObject with scalar when type changes", () => {
    const liveObj = new LiveObject({
      val: new LiveObject({ x: 1 }),
    });
    liveObj.reconcile({ val: 42 });
    expect(liveObj.toJSON()).toEqual({ val: 42 });
  });

  test("deep-liveifies a new array as LiveList", () => {
    const liveObj = new LiveObject<{ a: number; items?: number[] }>({ a: 1 });
    liveObj.reconcile({ a: 1, items: [1, 2, 3] });
    expect(liveObj.toJSON()).toEqual({ a: 1, items: [1, 2, 3] });
    expect(liveObj.get("items")).toBeInstanceOf(LiveList);
  });

  test("reconciles a nested LiveList", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2, 3]),
    });
    const listBefore = liveObj.get("items");
    liveObj.reconcile({ items: [1, 2, 4] });
    expect(liveObj.toJSON()).toEqual({ items: [1, 2, 4] });
    // Same LiveList instance
    expect(liveObj.get("items")).toBe(listBefore);
  });

  test("skips subtree when cached immutable matches", () => {
    const nested = new LiveObject({ x: 1, y: 2 });
    const liveObj = new LiveObject({ nested });
    const snapshot = nested.toJSON();
    liveObj.reconcile({ nested: snapshot });
    expect(liveObj.toJSON()).toEqual({ nested: { x: 1, y: 2 } });
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
    expect(liveObj.toJSON()).toEqual({
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
    expect(liveObj.toJSON()).toEqual({ items: [42] });
  });

  test("appends elements when new array is longer", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2]),
    });
    liveObj.reconcile({ items: [1, 2, 3, 4] });
    expect(liveObj.toJSON()).toEqual({ items: [1, 2, 3, 4] });
  });

  test("removes elements when new array is shorter", () => {
    const liveObj = new LiveObject({
      items: new LiveList([1, 2, 3, 4]),
    });
    liveObj.reconcile({ items: [1, 2] });
    expect(liveObj.toJSON()).toEqual({ items: [1, 2] });
  });

  test("replaces LiveList with scalar when type changes", () => {
    const liveObj = new LiveObject({
      val: new LiveList([1, 2]),
    });
    liveObj.reconcile({ val: "hello" });
    expect(liveObj.toJSON()).toEqual({ val: "hello" });
  });

  test("replaces scalar with LiveObject when type changes", () => {
    const liveObj = new LiveObject({ val: 42 });
    liveObj.reconcile({ val: { a: 1 } });
    expect(liveObj.toJSON()).toEqual({ val: { a: 1 } });
    expect(liveObj.get("val")).toBeInstanceOf(LiveObject);
  });

  test("replaces scalar with LiveList when type changes", () => {
    const liveObj = new LiveObject({ val: 42 });
    liveObj.reconcile({ val: [1, 2] });
    expect(liveObj.toJSON()).toEqual({ val: [1, 2] });
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
        expect(liveObj.toJSON()).toEqual(initial);

        liveObj.reconcile(target);
        expect(liveObj.toJSON()).toEqual(target);
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

describe("2 ways tests with two clients", () => {
  describe("Object/LiveObject", () => {
    test("create object", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: number };
        }>({
          liveblocksType: "LiveObject",
          data: {},
        });

      storage.root.reconcilePartially({ syncObj: { a: 1 } } as JsonObject);
      await expectStorageAndState({ syncObj: { a: 1 } }, 2);
    });

    test("update object", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: number };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      storage.root.reconcilePartially({ syncObj: { a: 1 } } as JsonObject);
      await expectStorageAndState({ syncObj: { a: 1 } }, 2);
    });

    test("add nested object", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a: any };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      storage.root.reconcilePartially({
        syncObj: { a: { subA: "ok" } },
      } as JsonObject);
      await expectStorageAndState({ syncObj: { a: { subA: "ok" } } }, 3);
    });

    test("create LiveList with one LiveRegister item in same batch", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      storage.root.reconcilePartially({ doc: { sub: [0] } } as JsonObject);
      await expectStorageAndState({ doc: { sub: [0] } }, 4);
    });

    test("create nested LiveList with one LiveObject item in same batch", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      storage.root.reconcilePartially({
        doc: { sub: { subSub: [{ a: 1 }] } },
      } as JsonObject);
      await expectStorageAndState({ doc: { sub: { subSub: [{ a: 1 }] } } }, 5);
    });

    test("Add nested objects in same batch", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          doc: any;
        }>({
          liveblocksType: "LiveObject",
          data: {
            doc: { liveblocksType: "LiveObject", data: {} },
          },
        });

      storage.root.reconcilePartially({
        doc: { pos: { a: { b: 1 } } },
      } as JsonObject);
      await expectStorageAndState({ doc: { pos: { a: { b: 1 } } } }, 4);
    });

    test("delete object key", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncObj: { a?: number };
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncObj: { liveblocksType: "LiveObject", data: { a: 0 } },
          },
        });

      storage.root.reconcilePartially({ syncObj: {} } as JsonObject);
      await expectStorageAndState({ syncObj: {} }, 2);
    });
  });

  describe("Array/LiveList", () => {
    test("replace array of 3 elements to 1 element", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<number>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: [1, 1, 1] },
          },
        });

      storage.root.reconcilePartially({ syncList: [2] } as JsonObject);
      await expectStorageAndState({ syncList: [2] });
    });

    test("add item to array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: [] },
          },
        });

      storage.root.reconcilePartially({ syncList: ["a"] } as JsonObject);
      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("replace first item in array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          list: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            list: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      storage.root.reconcilePartially({
        list: ["D", "B", "C"],
      } as JsonObject);
      await expectStorageAndState({ list: ["D", "B", "C"] }, 5);
    });

    test("replace last item in array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          list: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            list: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      storage.root.reconcilePartially({
        list: ["A", "B", "D"],
      } as JsonObject);
      await expectStorageAndState({ list: ["A", "B", "D"] }, 5);
    });

    test("insert item at beginning of array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a"] },
          },
        });

      storage.root.reconcilePartially({
        syncList: ["b", "a"],
      } as JsonObject);
      await expectStorageAndState({ syncList: ["b", "a"] }, 4);
    });

    test("swap items in array", async () => {
      const { storage, expectStorageAndState } =
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

      storage.root.reconcilePartially({
        syncList: ["d", "b", "c", "a"],
      } as JsonObject);
      await expectStorageAndState({ syncList: ["d", "b", "c", "a"] }, 6);
    });

    test("array of objects", async () => {
      const { storage, expectStorageAndState } =
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

      storage.root.reconcilePartially({
        syncList: [{ a: 2 }],
      } as JsonObject);
      await expectStorageAndState({ syncList: [{ a: 2 }] }, 3);
    });

    test("remove first item from array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a", "b"] },
          },
        });

      storage.root.reconcilePartially({ syncList: ["b"] } as JsonObject);
      await expectStorageAndState({ syncList: ["b"] }, 3);
    });

    test("remove last item from array", async () => {
      const { storage, expectStorageAndState } =
        await prepareStorageImmutableTest<{
          syncList: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            syncList: { liveblocksType: "LiveList", data: ["a", "b"] },
          },
        });

      storage.root.reconcilePartially({ syncList: ["a"] } as JsonObject);
      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("remove all elements of array except first", async () => {
      const { storage, expectStorageAndState } =
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

      storage.root.reconcilePartially({ syncList: ["a"] } as JsonObject);
      await expectStorageAndState({ syncList: ["a"] }, 3);
    });

    test("remove all elements of array except last", async () => {
      const { storage, expectStorageAndState } =
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

      storage.root.reconcilePartially({ syncList: ["c"] } as JsonObject);
      await expectStorageAndState({ syncList: ["c"] }, 3);
    });

    test("remove all elements of array", async () => {
      const { storage, expectStorageAndState } =
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

      storage.root.reconcilePartially({ syncList: [] } as JsonObject);
      await expectStorageAndState({ syncList: [] }, 2);
    });
  });
});
