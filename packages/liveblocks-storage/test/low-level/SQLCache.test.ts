import { expect, test } from "vitest";

import { SQLCache } from "~/SQLCache.js";

import { fmt, size } from "../utils.js";

test("empty", () => {
  const cache = new SQLCache();
  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});
  expect(cache.get("foo")).toEqual(undefined);
  expect(cache.has("foo")).toEqual(false);
});

test("setting keys (simple values)", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.set("b", "hi");
  cache.set("c", null);
  cache.set("d", [1, true, [{ x: false }, {}]]);
  expect(size(cache)).toEqual(4);
  expect(fmt(cache)).toEqual({
    a: 1,
    b: "hi",
    c: null,
    d: [1, true, [{ x: false }, {}]],
  });
});

test("setting keys (nested JSON values)", () => {
  const cache = new SQLCache();
  cache.set("a", [1, true, [{ x: false }, {}]]);
  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({
    a: [1, true, [{ x: false }, {}]],
  });
});

test("deleting keys", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.set("b", "hi");
  cache.delete("x");
  cache.delete("b");

  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({
    a: 1,
  });
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.set("b", "hi");
  // @ts-expect-error `undefined` isn't JSON
  cache.set("d", undefined);
  // @ts-expect-error `undefined` isn't JSON
  cache.set("a", undefined);

  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({
    b: "hi",
  });
});

test("has", () => {
  const cache = new SQLCache();
  expect(cache.has("k")).toEqual(false);

  cache.set("k", "v");
  expect(cache.has("k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.has("k")).toEqual(false);

  cache.delete("foo");
  expect(cache.has("foo")).toEqual(false);
  cache.set("foo", false);
  expect(cache.has("foo")).toEqual(true);
  cache.delete("foo");
  expect(cache.has("foo")).toEqual(false);
});

test("get (simple values)", () => {
  const cache = new SQLCache();
  expect(cache.get("k")).toEqual(undefined);

  cache.set("k", "v");
  expect(cache.get("k")).toEqual("v");

  cache.set("k", 123);
  expect(cache.get("k")).toEqual(123);

  cache.set("k", null);
  expect(cache.get("k")).toEqual(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.get("k")).toEqual(undefined);
});

test("get (nested JSON values)", () => {
  const cache = new SQLCache();
  expect(cache.get("k")).toEqual(undefined);

  cache.set("k", [1, true, [{ x: false }, {}]]);
  expect(cache.get("k")).toEqual([1, true, [{ x: false }, {}]]);
});

test("keys", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.keys())).toEqual(["a", "b"]);
});

// VALUES is not a useful abstraction in practice!
// test("values", () => {
//   const cache = new SQLCache();
//   cache.set("a", 1);
//   cache.delete("a");
//   cache.set("a", 42);
//   cache.set("b", 2);
//   expect(Array.from(cache.values())).toEqual([42, 2]);
// });

test("entries", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.entries())).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("has (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.startTransaction();
  expect(cache.has("k")).toEqual(false);

  cache.set("k", "v");
  expect(cache.has("k")).toEqual(true);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.has("k")).toEqual(false);

  cache.delete("foo");
  expect(cache.has("foo")).toEqual(false);
  cache.set("foo", false);
  expect(cache.has("foo")).toEqual(true);
  cache.delete("foo");
  expect(cache.has("foo")).toEqual(false);
});

test("get (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.startTransaction();
  expect(cache.get("fuuu")).toEqual(undefined);

  cache.set("k", "v");
  expect(cache.get("k")).toEqual("v");

  cache.set("k", 123);
  expect(cache.get("k")).toEqual(123);

  cache.set("k", null);
  expect(cache.get("k")).toEqual(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.get("k")).toEqual(undefined);
});

test("keys (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.startTransaction();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.keys())).toEqual(["a", "b"]);
});

// VALUES is not a useful abstraction in practice!
// test("values (inside a transaction)", () => {
//   const cache = new SQLCache();
//   cache.startTransaction();
//   cache.set("a", 1);
//   cache.delete("a");
//   cache.set("a", 42);
//   cache.set("b", 2);
//   expect(Array.from(cache.values())).toEqual([42, 2]);
// });

test("entries (inside a transaction)", () => {
  const cache = new SQLCache();
  cache.startTransaction();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.entries())).toEqual([
    ["a", 42],
    ["b", 2],
  ]);
});

test("get", () => {
  const cache = new SQLCache();
  cache.set("k", "a");
  cache.set("k", "v");
  cache.set("abc", 123);
  cache.set("def", 123);
  cache.set("foo", null);
  cache.delete("def");
  cache.delete("bla");

  expect(size(cache)).toEqual(3);
  expect(fmt(cache)).toEqual({ k: "v", abc: 123, foo: null });
  expect(cache.get("k")).toEqual("v");
  expect(cache.get("abc")).toEqual(123);
  expect(cache.get("foo")).toEqual(null);
  expect(cache.get("def")).toEqual(undefined);
  expect(cache.get("bla")).toEqual(undefined);
  expect(cache.get("xyz")).toEqual(undefined);
});

test("it supports iteration", () => {
  const cache = new SQLCache();
  cache.set("a", "a");
  cache.set("b", "b");
  cache.set("c", "c");
  cache.delete("b");
  cache.delete("d");

  const obj = Object.fromEntries(cache);
  expect(obj).toEqual({ a: "a", c: "c" });
});

test("committing before snapshotting fails", () => {
  const cache = new SQLCache();
  expect(() => cache.commit()).toThrow(
    "cannot commit - no transaction is active"
  );
});

test("rolling back before snapshotting fails", () => {
  const cache = new SQLCache();
  expect(() => cache.rollback()).toThrow(
    "cannot rollback - no transaction is active"
  );
});

test("adding new keys in a transaction are committed atomically", () => {
  const cache = new SQLCache();
  cache.set("a", 1);

  cache.startTransaction();
  expect(fmt(cache)).toEqual({ a: 1 });
  cache.set("b", 2);
  expect(fmt(cache)).toEqual({ a: 1, b: 2 });
  cache.set("c", 3);
  expect(fmt(cache)).toEqual({ a: 1, b: 2, c: 3 });
  cache.commit();

  expect(fmt(cache)).toEqual({ a: 1, b: 2, c: 3 });
});

test("deleting keys happens atomically", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.set("b", 2);

  cache.startTransaction();
  cache.delete("a");
  cache.delete("b");
  expect(fmt(cache)).toEqual({});
  cache.rollback();
  expect(fmt(cache)).toEqual({ a: 1, b: 2 });

  cache.startTransaction();
  cache.delete("a");
  cache.delete("b");
  expect(fmt(cache)).toEqual({});
  cache.commit();
  expect(fmt(cache)).toEqual({});
});

test("adding new keys in a transaction are committed atomically", () => {
  const cache = new SQLCache();
  cache.set("a", 1);

  cache.startTransaction();
  expect(fmt(cache)).toEqual({ a: 1 });
  cache.delete("a");
  cache.delete("a");
  cache.delete("a");
  cache.delete("a");
  expect(fmt(cache)).toEqual({});
  cache.set("a", 42);
  expect(fmt(cache)).toEqual({ a: 42 });
  cache.commit();

  expect(fmt(cache)).toEqual({ a: 42 });
});

test("rolling back transaction", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  cache.set("b", 2);
  expect(fmt(cache)).toEqual({ a: 1, b: 2 });

  cache.startTransaction();
  cache.set("a", 42);
  cache.set("c", 3);
  cache.set("d", 4);
  cache.delete("b");
  cache.delete("z");
  expect(fmt(cache)).toEqual({ a: 42, c: 3, d: 4 });

  cache.rollback();
  expect(fmt(cache)).toEqual({ a: 1, b: 2 });
});

test.skip("getting delta without a transaction makes no sense and will error", () => {
  const cache = new SQLCache();
  cache.set("a", 1);
  expect(() => cache.delta()).toThrow("No transaction to get delta for");
});

test.skip("delta in current transaction", () => {
  const cache = new SQLCache();
  cache.set("a", 1);

  cache.startTransaction();
  cache.set("b", 2);
  cache.set("c", 3);
  cache.delete("c");
  cache.delete("d");
  cache.set("b", 4);
  cache.set("y", 5);

  expect(Array.from(cache.delta())).toEqual([
    { root: ["c", "d"] },
    { root: { b: 4, y: 5 } },
  ]);

  cache.startTransaction();
  expect(Array.from(cache.delta())).toEqual([{}, {}]);
  cache.delete("x");
  cache.set("b", 42);
  expect(Array.from(cache.delta())).toEqual([
    { root: ["x"] },
    { root: { b: 42 } },
  ]);
  cache.commit();

  expect(Array.from(cache.delta())).toEqual([
    { root: ["c", "d", "x"] },
    { root: { b: 42, y: 5 } },
  ]);
});

// XXX Not really sure if we need this complexity - YAGNI unless we do
test.skip("nesting transactions", () => {
  const cache = new SQLCache();
  cache.set("a", 1);

  cache.startTransaction();
  cache.delete("a");
  cache.set("b", 2);
  expect(fmt(cache)).toEqual({ b: 2 });

  cache.startTransaction();
  cache.set("b", 3);
  cache.set("z", 42);
  cache.commit();
  expect(fmt(cache)).toEqual({ b: 3, z: 42 });

  cache.startTransaction();
  cache.startTransaction();
  expect(fmt(cache)).toEqual({ b: 3, z: 42 });
  cache.rollback();
  cache.rollback();
  expect(fmt(cache)).toEqual({ b: 3, z: 42 });

  cache.set("b", 555);
  cache.rollback();

  expect(fmt(cache)).toEqual({ a: 1 });
});

test("resetting", () => {
  const cache = new SQLCache();
  cache.reset();

  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});
});

test("resetting (outside transaction)", () => {
  const cache = new SQLCache();

  cache.set("a", 1);
  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({ a: 1 });

  cache.reset();
  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});
});

test("resetting (inside transaction)", () => {
  const cache = new SQLCache();

  cache.set("a", 1);
  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({ a: 1 });

  cache.startTransaction();
  cache.set("a", 1);

  cache.reset(); // Implicit rollback...
  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow(
    "cannot rollback - no transaction is active"
  );
});

test.skip("resetting (inside nested transactions)", () => {
  const cache = new SQLCache();

  cache.set("a", 1);
  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({ a: 1 });

  cache.startTransaction();
  cache.set("a", 2);

  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({ a: 2 });

  cache.startTransaction();
  cache.set("a", 3);
  expect(size(cache)).toEqual(1);
  expect(fmt(cache)).toEqual({ a: 3 });

  cache.reset(); // Implicit rollback...
  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});

  // ...means doing another rollback here would fail
  expect(() => cache.rollback()).toThrow("No transaction to roll back");
});

test("getNumber", () => {
  const cache = new SQLCache();
  cache.set("abc", 123);
  cache.set("foo", "bar");

  expect(size(cache)).toEqual(2);
  expect(cache.get("foo")).toEqual("bar");
  expect(cache.get("abc")).toEqual(123);

  expect(cache.getNumber("abc")).toEqual(123);
  expect(cache.getNumber("foo")).toEqual(undefined);
});
