import { expect, test } from "vitest";

import { LayeredCache } from "~/LayeredCache.js";

import { size } from "../utils.js";

test("empty", () => {
  const cache = new LayeredCache();
  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});
});

test("setting keys", () => {
  const cache = new LayeredCache();
  cache.set("root", "a", 1);
  cache.set("root", "b", "hi");
  cache.set("root", "c", null);
  expect(size(cache)).toEqual(3);
  expect(cache.data).toEqual({
    root: {
      a: 1,
      b: "hi",
      c: null,
    },
  });
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new LayeredCache();
  cache.set("root", "a", 1);
  cache.set("root", "b", "hi");
  // @ts-expect-error `undefined` isn't JSON
  cache.set("root", "d", undefined);
  // @ts-expect-error `undefined` isn't JSON
  cache.set("root", "a", undefined);

  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({
    root: {
      b: "hi",
    },
  });
  expect(Array.from(cache.keys())).toEqual([["root", "b"]]);
});

test("has", () => {
  const cache = new LayeredCache();
  expect(cache.has("r", "k")).toEqual(false);

  cache.set("r", "k", "v");
  expect(cache.has("r", "k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.set("r", "k", undefined);
  expect(cache.has("r", "k")).toEqual(false);

  cache.delete("r", "foo");
  expect(cache.has("r", "foo")).toEqual(false);
  cache.set("r", "foo", false);
  expect(cache.has("r", "foo")).toEqual(true);
  cache.delete("r", "foo");
  expect(cache.has("r", "foo")).toEqual(false);
});

test("get", () => {
  const cache = new LayeredCache();
  expect(cache.get("root", "k")).toBe(undefined);

  cache.set("root", "k", "v");
  expect(cache.get("root", "k")).toBe("v");

  cache.set("root", "k", 123);
  expect(cache.get("root", "k")).toBe(123);

  cache.set("root", "k", null);
  expect(cache.get("root", "k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("root", "k", undefined);
  expect(cache.get("root", "k")).toBe(undefined);
});

test("keys", () => {
  const cache = new LayeredCache();
  cache.set("root", "a", 1);
  cache.delete("root", "a");
  cache.set("root", "a", 42);
  cache.set("root", "b", 2);
  expect(Array.from(cache.keys())).toEqual([
    ["root", "a"],
    ["root", "b"],
  ]);
});

test("entries", () => {
  const cache = new LayeredCache();
  cache.set("r1", "a", 1);
  cache.delete("r1", "a");
  cache.set("r1", "a", 42);
  cache.set("r1", "b", 2);

  cache.set("r2", "a", 0);
  cache.delete("r2", "a");
  cache.set("r2", "b", 9);
  expect(Array.from(cache.entries())).toEqual([
    ["r1", "a", 42],
    ["r1", "b", 2],
    ["r2", "b", 9],
  ]);
});

test("has (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  expect(cache.has("r", "k")).toEqual(false);

  cache.set("r", "k", "v");
  expect(cache.has("r", "k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.set("r", "k", undefined);
  expect(cache.has("r", "k")).toEqual(false);

  cache.delete("r", "foo");
  expect(cache.has("r", "foo")).toEqual(false);
  cache.set("r", "foo", false);
  expect(cache.has("r", "foo")).toEqual(true);
  cache.delete("r", "foo");
  expect(cache.has("r", "foo")).toEqual(false);
});

test("get (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  expect(cache.get("r", "fuuu")).toBe(undefined);

  cache.set("r", "k", "v");
  expect(cache.get("r", "k")).toBe("v");

  cache.set("r", "k", 123);
  expect(cache.get("r", "k")).toBe(123);

  cache.set("r", "k", null);
  expect(cache.get("r", "k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("r", "k", undefined);
  expect(cache.get("r", "k")).toBe(undefined);
});

test("keys (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.set("r", "a", 1);
  cache.delete("r", "a");
  cache.set("r", "a", 42);
  cache.set("r", "b", 2);
  expect(Array.from(cache.keys())).toEqual([
    ["r", "a"],
    ["r", "b"],
  ]);
});

test("entries (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.set("r", "a", 1);
  cache.delete("r", "a");
  cache.set("r", "a", 42);
  cache.set("r", "b", 2);
  expect(Array.from(cache.entries())).toEqual([
    ["r", "a", 42],
    ["r", "b", 2],
  ]);
});

test("get", () => {
  const cache = new LayeredCache();
  cache.set("r", "k", "a");
  cache.set("r", "k", "v");
  cache.set("r", "abc", 123);
  cache.set("r", "def", 123);
  cache.set("r", "foo", null);
  cache.delete("r", "def");
  cache.delete("r", "bla");

  expect(size(cache)).toEqual(3);
  expect(cache.data).toEqual({ r: { k: "v", abc: 123, foo: null } });
  expect(cache.get("r", "k")).toEqual("v");
  expect(cache.get("r", "abc")).toEqual(123);
  expect(cache.get("r", "foo")).toEqual(null);
  expect(cache.get("r", "def")).toEqual(undefined);
  expect(cache.get("r", "bla")).toEqual(undefined);
  expect(cache.get("r", "xyz")).toEqual(undefined);
});

test("it supports iteration", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", "a");
  cache.set("r", "b", "b");
  cache.set("r", "c", "c");
  cache.delete("r", "b");
  cache.delete("r", "d");

  expect(Array.from(cache)).toEqual([
    ["r", "a", "a"],
    ["r", "c", "c"],
  ]);
});

test("committing before snapshotting fails", () => {
  const cache = new LayeredCache();
  expect(() => cache.commit()).toThrow("No transaction to commit");
});

test("rolling back before snapshotting fails", () => {
  const cache = new LayeredCache();
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});

test("adding new keys in a transaction are committed atomically", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);

  cache.startTransaction();
  expect(cache.data).toEqual({ r: { a: 1 } });
  cache.set("r", "b", 2);
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });
  cache.set("r", "c", 3);
  expect(cache.data).toEqual({ r: { a: 1, b: 2, c: 3 } });
  cache.commit();

  expect(cache.data).toEqual({ r: { a: 1, b: 2, c: 3 } });
});

test("deleting keys happens atomically", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);
  cache.set("r", "b", 2);

  cache.startTransaction();
  cache.delete("r", "a");
  cache.delete("r", "b");
  expect(cache.data).toEqual({});
  cache.rollback();
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });

  cache.startTransaction();
  cache.delete("r", "a");
  cache.delete("r", "b");
  expect(cache.data).toEqual({});
  cache.commit();
  expect(cache.data).toEqual({});
});

test("adding new keys in a transaction are committed atomically", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);

  cache.startTransaction();
  expect(cache.data).toEqual({ r: { a: 1 } });
  cache.delete("r", "a");
  cache.delete("r", "a");
  cache.delete("r", "a");
  cache.delete("r", "a");
  expect(cache.data).toEqual({});
  cache.set("r", "a", 42);
  expect(cache.data).toEqual({ r: { a: 42 } });
  cache.commit();

  expect(cache.data).toEqual({ r: { a: 42 } });
});

test("rolling back transaction", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);
  cache.set("r", "b", 2);
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });

  cache.startTransaction();
  cache.set("r", "a", 42);
  cache.set("r", "c", 3);
  cache.set("r", "d", 4);
  cache.delete("r", "b");
  cache.delete("r", "z");
  expect(cache.data).toEqual({ r: { a: 42, c: 3, d: 4 } });

  cache.rollback();
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });
});

test("getting delta without a transaction makes no sense and will error", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);
  expect(() => cache.delta()).toThrow("No transaction to get delta for");
});

test("delta in current transaction", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);

  cache.startTransaction();
  cache.set("r", "b", 2);
  cache.set("r", "c", 3);
  cache.delete("r", "c");
  cache.delete("r", "d");
  cache.set("r", "b", 4);
  cache.set("r", "y", 5);

  expect(Array.from(cache.delta())).toEqual([
    { r: ["c", "d"] },
    { r: { b: 4, y: 5 } },
  ]);

  cache.startTransaction();
  expect(Array.from(cache.delta())).toEqual([{}, {}]);
  cache.delete("r", "x");
  cache.set("r", "b", 42);
  expect(Array.from(cache.delta())).toEqual([{ r: ["x"] }, { r: { b: 42 } }]);
  cache.commit();

  expect(Array.from(cache.delta())).toEqual([
    { r: ["c", "d", "x"] },
    { r: { b: 42, y: 5 } },
  ]);
});

test("nesting snapshots", () => {
  const cache = new LayeredCache();
  cache.set("r", "a", 1);

  cache.startTransaction();
  cache.delete("r", "a");
  cache.set("r", "b", 2);
  expect(cache.data).toEqual({ r: { b: 2 } });

  cache.startTransaction();
  cache.set("r", "b", 3);
  cache.set("r", "z", 42);
  cache.commit();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });

  cache.startTransaction();
  cache.startTransaction();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });
  cache.rollback();
  cache.rollback();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });

  cache.set("r", "b", 555);
  cache.rollback();

  expect(cache.data).toEqual({ r: { a: 1 } });
});

test("resetting", () => {
  const cache = new LayeredCache();
  cache.reset();

  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});
});

test("resetting (outside transaction)", () => {
  const cache = new LayeredCache();

  cache.set("r", "a", 1);
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.reset();
  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});
});

test("resetting (inside transaction)", () => {
  const cache = new LayeredCache();

  cache.set("r", "a", 1);
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.startTransaction();
  cache.set("r", "a", 1);

  cache.reset(); // Implicit rollback...
  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});

test("resetting (inside nested transactions)", () => {
  const cache = new LayeredCache();

  cache.set("r", "a", 1);
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.startTransaction();
  cache.set("r", "a", 2);

  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 2 } });

  cache.startTransaction();
  cache.set("r", "a", 3);
  expect(size(cache)).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 3 } });

  cache.reset(); // Implicit rollback...
  expect(size(cache)).toEqual(0);
  expect(cache.data).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});

test("getNumber", () => {
  const cache = new LayeredCache();
  cache.set("r", "abc", 123);
  cache.set("r", "foo", "bar");

  expect(size(cache)).toEqual(2);
  expect(cache.get("r", "foo")).toEqual("bar");
  expect(cache.get("r", "abc")).toEqual(123);

  expect(cache.getNumber("r", "abc")).toEqual(123);
  expect(cache.getNumber("r", "foo")).toEqual(undefined);
});
