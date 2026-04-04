import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { json, jsonObject, key } from "../crdts/__tests__/_arbitraries";
import { isLiveList, isLiveObject } from "../crdts/liveblocks-helpers";
import { LiveObject } from "../crdts/LiveObject";
import type { SyncConfig } from "../immutable";

function assertThat<T>(
  value: unknown,
  guard: (v: unknown) => v is T
): asserts value is T {
  expect(guard(value)).toBe(true);
}

describe("LiveObject.from() with SyncConfig", () => {
  describe("false (local-only) keys", () => {
    test("sets scalar key marked false via setLocal", () => {
      const config: SyncConfig = { local: false };
      const result = LiveObject.from(
        { local: "local only", synced: "synced value" },
        config
      );

      expect(result.get("local")).toBe("local only");
      expect(result.get("synced")).toBe("synced value");
    });

    test("sets object-valued key marked false via setLocal", () => {
      const config: SyncConfig = { scratch: false };
      const result = LiveObject.from(
        { scratch: { deep: "nope" }, synced: "synced value" },
        config
      );

      expect(result.get("scratch")).toEqual({ deep: "nope" });
      expect(result.get("synced")).toBe("synced value");
    });
  });

  describe('"atomic" keys', () => {
    test("stores object value as plain Json (no LiveObject wrapping)", () => {
      const config: SyncConfig = { pos1: "atomic" };
      const result = LiveObject.from(
        { pos1: { x: 10, y: 20 }, pos2: { x: 50, y: 60 } },
        config
      );

      expect(isLiveObject(result.get("pos1"))).toBe(false);
      expect(result.get("pos1")).toEqual({ x: 10, y: 20 });

      const pos2 = result.get("pos2");
      assertThat(pos2, isLiveObject);
      expect(pos2.toJSON()).toEqual({ x: 50, y: 60 });
    });

    test("stores array value as plain Json (no LiveList wrapping)", () => {
      const config: SyncConfig = { handles: "atomic" };
      const result = LiveObject.from(
        { handles: [1, 2, 3], other: [4, 5] },
        config
      );

      expect(isLiveList(result.get("handles"))).toBe(false);
      expect(result.get("handles")).toEqual([1, 2, 3]);

      const other = result.get("other");
      assertThat(other, isLiveList);
      expect(other.toJSON()).toEqual([4, 5]);
    });
  });

  describe("true keys (explicit deep)", () => {
    test("true behaves identically to absent (deep liveify)", () => {
      const config: SyncConfig = { data: true };
      const result = LiveObject.from({ data: { nested: [1] } }, config);

      assertThat(result.get("data"), isLiveObject);
    });
  });

  describe("nested SyncConfig", () => {
    test("applies nested config to sub-objects", () => {
      const config: SyncConfig = {
        nested: { scratch: false, position: "atomic" },
      };
      const result = LiveObject.from(
        { nested: { scratch: "local", position: { x: 1 }, label: "hi" } },
        config
      );

      const nested = result.get("nested");
      assertThat(nested, isLiveObject);
      expect(nested.get("scratch")).toBe("local");
      expect(isLiveObject(nested.get("position"))).toBe(false);
      expect(nested.get("position")).toEqual({ x: 1 });
      expect(nested.get("label")).toBe("hi");
    });

    test("config passes through arrays to elements", () => {
      const config: SyncConfig = {
        items: { local: false },
      };
      const result = LiveObject.from(
        { items: [{ local: "local only", synced: "synced value" }] },
        config
      );

      const items = result.get("items");
      assertThat(items, isLiveList);

      const firstItem = items.get(0);
      assertThat(firstItem, isLiveObject);
      expect(firstItem.get("local")).toBe("local only");
      expect(firstItem.get("synced")).toBe("synced value");
    });
  });

  describe("config/value shape mismatch", () => {
    test("nested config targeting a scalar in from() does not throw", () => {
      const config: SyncConfig = {
        nested: { scratch: false, position: "atomic" },
      };
      // Config expects an object at "nested", but data has a scalar.
      // Should silently treat config as `true` (deep liveify).
      const result = LiveObject.from({ nested: 42 }, config);
      expect(result.get("nested")).toBe(42);
    });

    test("nested config targeting a string in from() does not throw", () => {
      const config: SyncConfig = {
        nested: { scratch: false },
      };
      const result = LiveObject.from({ nested: "hello" }, config);
      expect(result.get("nested")).toBe("hello");
    });

    test("nested config targeting null in from() does not throw", () => {
      const config: SyncConfig = {
        nested: { scratch: false },
      };
      const result = LiveObject.from({ nested: null }, config);
      expect(result.get("nested")).toBeNull();
    });

    test("nested config targeting a boolean in from() does not throw", () => {
      const config: SyncConfig = {
        nested: { scratch: false },
      };
      const result = LiveObject.from({ nested: true }, config);
      expect(result.get("nested")).toBe(true);
    });

    test("nested config targeting an array in from() passes config to elements", () => {
      const config: SyncConfig = {
        nested: { scratch: false, position: "atomic" },
      };
      // Config expects an object, but data has an array of objects.
      // Arrays "hop" the config path — config is applied to each element.
      const result = LiveObject.from(
        {
          nested: [
            { scratch: "local", position: { x: 1 }, label: "hi" },
            { scratch: "also local", position: { x: 2 }, label: "bye" },
          ],
        },
        config
      );

      const nested = result.get("nested");
      assertThat(nested, isLiveList);

      const first = nested.get(0);
      assertThat(first, isLiveObject);
      expect(first.get("scratch")).toBe("local");
      expect(isLiveObject(first.get("position"))).toBe(false);
      expect(first.get("position")).toEqual({ x: 1 });
      expect(first.get("label")).toBe("hi");

      const second = nested.get(1);
      assertThat(second, isLiveObject);
      expect(second.get("scratch")).toBe("also local");
      expect(isLiveObject(second.get("position"))).toBe(false);
      expect(second.get("position")).toEqual({ x: 2 });
      expect(second.get("label")).toBe("bye");
    });

    test("nested config targeting a scalar in reconcile() does not throw", () => {
      const config: SyncConfig = {
        nested: { scratch: false, position: "atomic" },
      };
      const liveObj = LiveObject.from(
        { nested: { scratch: 42, position: { x: 10, y: 0 } } },
        config
      );

      // Reconcile with a scalar where config expects an object — should not throw
      liveObj.reconcile({ nested: 42 }, config);
      expect(liveObj.get("nested")).toBe(42);
    });

    test("nested config targeting an array in reconcile() passes config to elements", () => {
      const config: SyncConfig = {
        nested: { scratch: false, position: "atomic" },
      };
      const liveObj = LiveObject.from(
        { nested: { scratch: "local", position: { x: 1 }, label: "hi" } },
        config
      );

      // Reconcile from object to array — config should pass through to elements
      liveObj.reconcile(
        {
          nested: [{ scratch: "new", position: { x: 5 }, label: "bye" }],
        },
        config
      );

      const nested = liveObj.get("nested");
      assertThat(nested, isLiveList);

      const first = nested.get(0);
      assertThat(first, isLiveObject);
      expect(first.get("scratch")).toBe("new");
      expect(isLiveObject(first.get("position"))).toBe(false);
      expect(first.get("position")).toEqual({ x: 5 });
      expect(first.get("label")).toBe("bye");
    });

    test("other synced keys still work when nested config mismatches", () => {
      const config: SyncConfig = {
        nested: { scratch: false },
        label: "atomic",
      };
      const result = LiveObject.from(
        { nested: 42, label: { x: 1 }, other: "hello" },
        config
      );

      // "nested" mismatches (scalar vs nested config) → treated as true
      expect(result.get("nested")).toBe(42);
      // "label" marked atomic → stored as plain JSON
      expect(isLiveObject(result.get("label"))).toBe(false);
      expect(result.get("label")).toEqual({ x: 1 });
      // "other" has no config → deep liveified as normal
      expect(result.get("other")).toBe("hello");
    });
  });

  describe("no config (backwards compat)", () => {
    test("without config, all keys are deep-liveified as before", () => {
      const result = LiveObject.from({ a: { b: 1 }, c: [2] });

      assertThat(result.get("a"), isLiveObject);
      assertThat(result.get("c"), isLiveList);
    });
  });
});

describe("LiveObject.reconcile with SyncConfig", () => {
  describe("false (local-only) keys", () => {
    test("updates local-only keys via setLocal during reconcile", () => {
      const config: SyncConfig = { selected: false };
      const lo = LiveObject.from(
        { id: "1", selected: true, label: "old" },
        config
      );

      lo.reconcile({ id: "1", selected: false, label: "new" }, config);
      expect(lo.get("selected")).toBe(false);
      expect(lo.get("label")).toBe("new");
    });

    test("deletes local-only keys when absent from jsonObj", () => {
      const config: SyncConfig = { local: false };
      const lo = LiveObject.from({ id: "1", local: "initial" }, config);

      lo.reconcile({ id: "2" }, config);
      expect(lo.get("local")).toBeUndefined();
      expect(lo.get("id")).toBe("2");
    });
  });

  describe('"atomic" keys', () => {
    test("replaces atomic key value wholesale", () => {
      const config: SyncConfig = { position: "atomic" };
      const lo = LiveObject.from({ position: { x: 0, y: 0 } }, config);

      lo.reconcile({ position: { x: 10, y2: 20 } }, config);

      // Should be replaced as plain Json, not a LiveObject
      const pos = lo.get("position");
      expect(isLiveObject(pos)).toBe(false);
      expect(pos).toEqual({ x: 10, y2: 20 });
    });

    test("does not reconcile sub-keys of atomic values", () => {
      const config: SyncConfig = { position: "atomic" };
      const lo = LiveObject.from(
        { position: { x: 0, y: 0 }, label: "hi" },
        config
      );

      // Even though position is already a plain object, reconcile should
      // replace it entirely rather than trying to diff sub-keys
      lo.reconcile({ position: { x: 5, y: 5 }, label: "hi" }, config);
      expect(lo.get("position")).toEqual({ x: 5, y: 5 });
    });
  });

  describe("nested SyncConfig", () => {
    test("applies nested config during reconcile", () => {
      const config: SyncConfig = {
        data: { scratch: false, pos: "atomic" },
      };
      const lo = LiveObject.from(
        { data: { scratch: "local", pos: { x: 0 }, label: "old" } },
        config
      );

      lo.reconcile(
        { data: { scratch: "changed", pos: { x: 99 }, label: "new" } },
        config
      );

      const data = lo.get("data");
      assertThat(data, isLiveObject);
      expect(data.get("scratch")).toBe("changed");
      expect(data.get("pos")).toEqual({ x: 99 });
      expect(isLiveObject(data.get("pos"))).toBe(false);
      expect(data.get("label")).toBe("new");
    });

    test("nested config does not leak parent config into children", () => {
      // Parent config marks "x" as false (local-only).
      // Inside "data", "x" should be deep (default), NOT false.
      // If parent config leaked, "x" inside "data" would be wrongly local.
      const config: SyncConfig = {
        x: false,
        data: { local: false },
      };
      const lo = LiveObject.from(
        { x: "parent-local", data: { local: "a", x: { nested: true } } },
        config
      );

      lo.reconcile(
        { x: "parent-local", data: { local: "b", x: { nested: false } } },
        config
      );

      const data = lo.get("data");
      assertThat(data, isLiveObject);
      // "local" is false in the sub-config → setLocal
      expect(data.get("local")).toBe("b");
      // "x" inside "data" should be deep-liveified (NOT treated as false from parent)
      const inner = data.get("x");
      assertThat(inner, isLiveObject);
      expect(inner.get("nested")).toBe(false);
    });
  });

  describe("config passes through arrays during reconcile", () => {
    test("reconciles list elements with config", () => {
      const config: SyncConfig = {
        items: { local: false },
      };
      const lo = LiveObject.from(
        { items: [{ local: "a", synced: "old" }] },
        config
      );

      lo.reconcile({ items: [{ local: "b", synced: "new" }] }, config);

      const items = lo.get("items");
      assertThat(items, isLiveList);
      const first = items.get(0);
      assertThat(first, isLiveObject);
      expect(first.get("local")).toBe("b");
      expect(first.get("synced")).toBe("new");
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

/** Arbitrary for a LiveObject created from a random JsonObject, with some random local-only keys. */
const liveObject = fc
  .tuple(jsonObject, fc.array(fc.tuple(key, json), { maxLength: 5 }))
  .map(([obj, localEntries]) => {
    const lo = LiveObject.from(obj);
    for (const [key, value] of localEntries) {
      // @ts-expect-error OptionalJsonKeys resolves to `never` for index-signature types
      lo.setLocal(key, value);
    }
    return lo;
  });

/**
 * Generates a SyncConfig that references a random subset of the given keys,
 * assigning each a random SyncMode (false, "atomic", true, or undefined).
 */
function syncConfigFor(keys: string[]): fc.Arbitrary<SyncConfig> {
  if (keys.length === 0) return fc.constant({});
  return fc
    .tuple(
      fc.subarray(keys),
      fc.array(
        fc.oneof(fc.constant(false), fc.constant("atomic"), fc.constant(true)),
        { minLength: keys.length, maxLength: keys.length }
      )
    )
    .map(([subset, modes]) => {
      const config: SyncConfig = {};
      for (let i = 0; i < subset.length; i++) {
        config[subset[i]] = modes[i];
      }
      return config;
    });
}

describe("reconcilePartially", () => {
  test("leaves keys not in the partial object untouched", () => {
    const lo = LiveObject.from({ a: 1, b: 2, c: 3 });
    lo.reconcilePartially({ a: 10 });
    expect(lo.toJSON()).toEqual({ a: 10, b: 2, c: 3 });
  });

  test("adds new keys that don't exist yet", () => {
    const lo = LiveObject.from({ a: 1 });
    lo.reconcilePartially({ b: 2 });
    expect(lo.toJSON()).toEqual({ a: 1, b: 2 });
  });

  test("updates nested structures recursively", () => {
    const lo = LiveObject.from({ obj: { x: 1, y: 2 }, other: 99 });
    lo.reconcilePartially({ obj: { x: 10 } });
    // Nested reconciliation is full — y is deleted because it's absent from the nested object
    expect(lo.toJSON()).toEqual({ obj: { x: 10 }, other: 99 });
  });

  test("reconcile (full) deletes key when value is undefined", () => {
    const lo = LiveObject.from({ a: 1, b: 2 });
    lo.reconcile({ a: undefined, b: 2 });
    expect(lo.toJSON()).toEqual({ b: 2 });
  });

  test("ignores explicitly-undefined keys (does not delete them)", () => {
    const lo = LiveObject.from({ a: 1, b: 2 });
    lo.reconcilePartially({ a: undefined });
    expect(lo.toJSON()).toEqual({ a: 1, b: 2 });
  });
});

describe("property tests", () => {
  test("LiveObject.from(obj, config).toJSON() === obj for any config", () => {
    fc.assert(
      fc.property(
        jsonObject.chain((obj) =>
          syncConfigFor(Object.keys(obj)).map(
            (config) => [obj, config] as const
          )
        ),
        ([obj, config]) => {
          const liveObj = LiveObject.from(obj, config);
          expect(liveObj.toJSON()).toEqual(obj);
        }
      )
    );
  });

  test("lo.reconcile(obj, config).toJSON() === obj for any config", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(liveObject, jsonObject)
          .chain(([lo, target]) =>
            syncConfigFor([
              ...new Set([...lo.keys(), ...Object.keys(target)]),
            ]).map((config) => [lo, target, config] as const)
          ),
        ([lo, target, config]) => {
          lo.reconcile(target, config);
          expect(lo.toJSON()).toEqual(target);
        }
      )
    );
  });
});
