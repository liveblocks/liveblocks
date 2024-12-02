import { expect, test } from "vitest";

import { LayeredCache } from "~/LayeredCache.js";

test("empty", () => {
  const cache = new LayeredCache();
  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});
});

test("setting keys", () => {
  const cache = new LayeredCache();
  expect(cache.count).toEqual(0);
  cache.setChild("root", "a", 1);
  expect(cache.count).toEqual(1);

  cache.setChild("root", "b", "hello");
  cache.setChild("root", "b", "hi");
  cache.setChild("root", "c", null);
  expect(cache.count).toEqual(3);
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
  cache.setChild("root", "a", 1);
  cache.setChild("root", "b", "hi");
  // @ts-expect-error `undefined` isn't JSON
  cache.setChild("root", "d", undefined);
  // @ts-expect-error `undefined` isn't JSON
  cache.setChild("root", "a", undefined);

  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({
    root: {
      b: "hi",
    },
  });
  expect(Array.from(cache.keys("root"))).toEqual(["b"]);
});

test("has", () => {
  const cache = new LayeredCache();
  expect(cache.hasChild("r", "k")).toEqual(false);

  cache.setChild("r", "k", "v");
  expect(cache.hasChild("r", "k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.setChild("r", "k", undefined);
  expect(cache.hasChild("r", "k")).toEqual(false);

  cache.deleteChild("r", "foo");
  expect(cache.hasChild("r", "foo")).toEqual(false);
  cache.setChild("r", "foo", false);
  expect(cache.hasChild("r", "foo")).toEqual(true);
  cache.deleteChild("r", "foo");
  expect(cache.hasChild("r", "foo")).toEqual(false);
});

test("get", () => {
  const cache = new LayeredCache();
  expect(cache.getChild("root", "k")).toBe(undefined);

  cache.setChild("root", "k", "v");
  expect(cache.getChild("root", "k")).toBe("v");

  cache.setChild("root", "k", 123);
  expect(cache.getChild("root", "k")).toBe(123);

  cache.setChild("root", "k", null);
  expect(cache.getChild("root", "k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.setChild("root", "k", undefined);
  expect(cache.getChild("root", "k")).toBe(undefined);
});

test("keys", () => {
  const cache = new LayeredCache();
  cache.setChild("root", "a", 1);
  cache.deleteChild("root", "a");
  cache.setChild("root", "a", 42);
  cache.setChild("root", "b", 2);
  expect(Array.from(cache.keys("root"))).toEqual(["a", "b"]);
});

test("entries", () => {
  const cache = new LayeredCache();
  cache.setChild("r1", "a", 1);
  cache.deleteChild("r1", "a");
  cache.setChild("r1", "a", 42);
  cache.setChild("r1", "b", 2);

  cache.setChild("r2", "a", 0);
  cache.deleteChild("r2", "a");
  cache.setChild("r2", "b", 9);
  expect(Array.from(cache.entries("r1"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
  expect(Array.from(cache.entries("r2"))).toEqual([["b", 9]]);
});

test("has (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  expect(cache.hasChild("r", "k")).toEqual(false);

  cache.setChild("r", "k", "v");
  expect(cache.hasChild("r", "k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.setChild("r", "k", undefined);
  expect(cache.hasChild("r", "k")).toEqual(false);

  cache.deleteChild("r", "foo");
  expect(cache.hasChild("r", "foo")).toEqual(false);
  cache.setChild("r", "foo", false);
  expect(cache.hasChild("r", "foo")).toEqual(true);
  cache.deleteChild("r", "foo");
  expect(cache.hasChild("r", "foo")).toEqual(false);
});

test("get (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  expect(cache.getChild("r", "fuuu")).toBe(undefined);

  cache.setChild("r", "k", "v");
  expect(cache.getChild("r", "k")).toBe("v");

  cache.setChild("r", "k", 123);
  expect(cache.getChild("r", "k")).toBe(123);

  cache.setChild("r", "k", null);
  expect(cache.getChild("r", "k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.setChild("r", "k", undefined);
  expect(cache.getChild("r", "k")).toBe(undefined);
});

test("keys (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.setChild("r", "a", 1);
  cache.deleteChild("r", "a");
  cache.setChild("r", "a", 42);
  cache.setChild("r", "b", 2);
  expect(Array.from(cache.keys("r"))).toEqual(["a", "b"]);
});

test("entries (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.setChild("r", "a", 1);
  cache.deleteChild("r", "a");
  cache.setChild("r", "a", 42);
  cache.setChild("r", "b", 2);
  expect(Array.from(cache.entries("r"))).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "k", "a");
  cache.setChild("r", "k", "v");
  cache.setChild("r", "abc", 123);
  cache.setChild("r", "def", 123);
  cache.setChild("r", "foo", null);
  cache.deleteChild("r", "def");
  cache.deleteChild("r", "bla");

  expect(cache.count).toEqual(3);
  expect(cache.data).toEqual({ r: { k: "v", abc: 123, foo: null } });
  expect(cache.getChild("r", "k")).toEqual("v");
  expect(cache.getChild("r", "abc")).toEqual(123);
  expect(cache.getChild("r", "foo")).toEqual(null);
  expect(cache.getChild("r", "def")).toEqual(undefined);
  expect(cache.getChild("r", "bla")).toEqual(undefined);
  expect(cache.getChild("r", "xyz")).toEqual(undefined);
});

test("it supports iteration", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", "a");
  cache.setChild("r", "b", "b");
  cache.setChild("r", "c", "c");
  cache.deleteChild("r", "b");
  cache.deleteChild("r", "d");

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
  cache.setChild("r", "a", 1);

  cache.startTransaction();
  expect(cache.data).toEqual({ r: { a: 1 } });
  cache.setChild("r", "b", 2);
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });
  cache.setChild("r", "c", 3);
  expect(cache.data).toEqual({ r: { a: 1, b: 2, c: 3 } });
  cache.commit();

  expect(cache.data).toEqual({ r: { a: 1, b: 2, c: 3 } });
});

test("deleting keys happens atomically", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);
  cache.setChild("r", "b", 2);

  cache.startTransaction();
  cache.deleteChild("r", "a");
  cache.deleteChild("r", "b");
  expect(cache.data).toEqual({});
  cache.rollback();
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });

  cache.startTransaction();
  cache.deleteChild("r", "a");
  cache.deleteChild("r", "b");
  expect(cache.data).toEqual({});
  cache.commit();
  expect(cache.data).toEqual({});
});

test("adding new keys in a transaction are committed atomically", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);

  cache.startTransaction();
  expect(cache.data).toEqual({ r: { a: 1 } });
  cache.deleteChild("r", "a");
  cache.deleteChild("r", "a");
  cache.deleteChild("r", "a");
  cache.deleteChild("r", "a");
  expect(cache.data).toEqual({});
  cache.setChild("r", "a", 42);
  expect(cache.data).toEqual({ r: { a: 42 } });
  cache.commit();

  expect(cache.data).toEqual({ r: { a: 42 } });
});

test("rolling back transaction", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);
  cache.setChild("r", "b", 2);
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });

  cache.startTransaction();
  cache.setChild("r", "a", 42);
  cache.setChild("r", "c", 3);
  cache.setChild("r", "d", 4);
  cache.deleteChild("r", "b");
  cache.deleteChild("r", "z");
  expect(cache.data).toEqual({ r: { a: 42, c: 3, d: 4 } });

  cache.rollback();
  expect(cache.data).toEqual({ r: { a: 1, b: 2 } });
});

test("getting delta without a transaction makes no sense and will error", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);
  expect(() => cache.delta()).toThrow("No transaction to get delta for");
});

test("delta in current transaction", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);

  cache.startTransaction();
  cache.setChild("r", "b", 2);
  cache.setChild("r", "c", 3);
  cache.deleteChild("r", "c");
  cache.deleteChild("r", "d");
  cache.setChild("r", "b", 4);
  cache.setChild("r", "y", 5);

  expect(Array.from(cache.delta())).toEqual([
    { r: ["c", "d"] },
    { r: { b: 4, y: 5 } },
  ]);

  cache.startTransaction();
  expect(Array.from(cache.delta())).toEqual([{}, {}]);
  cache.deleteChild("r", "x");
  cache.setChild("r", "b", 42);
  expect(Array.from(cache.delta())).toEqual([{ r: ["x"] }, { r: { b: 42 } }]);
  cache.commit();

  expect(Array.from(cache.delta())).toEqual([
    { r: ["c", "d", "x"] },
    { r: { b: 42, y: 5 } },
  ]);
});

test("nesting snapshots", () => {
  const cache = new LayeredCache();
  cache.setChild("r", "a", 1);

  cache.startTransaction();
  cache.deleteChild("r", "a");
  cache.setChild("r", "b", 2);
  expect(cache.data).toEqual({ r: { b: 2 } });

  cache.startTransaction();
  cache.setChild("r", "b", 3);
  cache.setChild("r", "z", 42);
  cache.commit();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });

  cache.startTransaction();
  cache.startTransaction();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });
  cache.rollback();
  cache.rollback();
  expect(cache.data).toEqual({ r: { b: 3, z: 42 } });

  cache.setChild("r", "b", 555);
  cache.rollback();

  expect(cache.data).toEqual({ r: { a: 1 } });
});

test("resetting", () => {
  const cache = new LayeredCache();
  cache.reset();

  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});
});

test("resetting (outside transaction)", () => {
  const cache = new LayeredCache();

  cache.setChild("r", "a", 1);
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.reset();
  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});
});

test("resetting (inside transaction)", () => {
  const cache = new LayeredCache();

  cache.setChild("r", "a", 1);
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.startTransaction();
  cache.setChild("r", "a", 1);

  cache.reset(); // Implicit rollback...
  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});

test("resetting (inside nested transactions)", () => {
  const cache = new LayeredCache();

  cache.setChild("r", "a", 1);
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 1 } });

  cache.startTransaction();
  cache.setChild("r", "a", 2);

  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 2 } });

  cache.startTransaction();
  cache.setChild("r", "a", 3);
  expect(cache.count).toEqual(1);
  expect(cache.data).toEqual({ r: { a: 3 } });

  cache.reset(); // Implicit rollback...
  expect(cache.count).toEqual(0);
  expect(cache.data).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});
