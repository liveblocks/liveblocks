import { expect, test } from "vitest";

import { LayeredCache } from "~/LayeredCache.js";
import { opId } from "~/utils.js";

import { fmt, size } from "../utils.js";

test("empty", () => {
  const cache = new LayeredCache();
  expect(size(cache)).toEqual(0);
  expect(fmt(cache)).toEqual({});
});

test("setting keys", () => {
  const cache = new LayeredCache();
  cache.set("a", 1);
  cache.set("b", "hi");
  cache.set("c", null);
  expect(size(cache)).toEqual(3);
  expect(fmt(cache)).toEqual({
    a: 1,
    b: "hi",
    c: null,
  });
});

test("setting to undefined is the same as removing a key", () => {
  const cache = new LayeredCache();
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
  expect(Array.from(cache.keys())).toEqual(["b"]);
});

test("has", () => {
  const cache = new LayeredCache();
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

test("get", () => {
  const cache = new LayeredCache();
  expect(cache.get("k")).toBe(undefined);

  cache.set("k", "v");
  expect(cache.get("k")).toBe("v");

  cache.set("k", 123);
  expect(cache.get("k")).toBe(123);

  cache.set("k", null);
  expect(cache.get("k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.get("k")).toBe(undefined);
});

test("keys", () => {
  const cache = new LayeredCache();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.keys())).toEqual(["a", "b"]);
});

test("values", () => {
  const cache = new LayeredCache();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.values())).toEqual([42, 2]);
});

test("entries", () => {
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
  cache.startTransaction();
  expect(cache.get("fuuu")).toBe(undefined);

  cache.set("k", "v");
  expect(cache.get("k")).toBe("v");

  cache.set("k", 123);
  expect(cache.get("k")).toBe(123);

  cache.set("k", null);
  expect(cache.get("k")).toBe(null);

  // @ts-expect-error - undefined isn't JSON
  cache.set("k", undefined);
  expect(cache.get("k")).toBe(undefined);
});

test("keys (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.keys())).toEqual(["a", "b"]);
});

test("values (inside a transaction)", () => {
  const cache = new LayeredCache();
  cache.startTransaction();
  cache.set("a", 1);
  cache.delete("a");
  cache.set("a", 42);
  cache.set("b", 2);
  expect(Array.from(cache.values())).toEqual([42, 2]);
});

test("entries (inside a transaction)", () => {
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
  cache.set("a", "a");
  cache.set("b", "b");
  cache.set("c", "c");
  cache.delete("b");
  cache.delete("d");

  const obj = Object.fromEntries(cache);
  expect(obj).toEqual({ a: "a", c: "c" });
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
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
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
  const cache = new LayeredCache();
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

test("getting delta without a transaction makes no sense and will error", () => {
  const cache = new LayeredCache();
  cache.set("a", 1);
  const id = opId();
  expect(() => cache.delta(id)).toThrow("No transaction to get delta for");
});

test("delta in current transaction", () => {
  const id = opId();

  const cache = new LayeredCache();
  cache.set("a", 1);

  cache.startTransaction();
  cache.set("b", 2);
  cache.set("c", 3);
  cache.delete("c");
  cache.delete("d");
  cache.set("b", 4);
  cache.set("y", 5);

  expect(Array.from(cache.delta(id))).toEqual([
    id,
    ["c", "d"],
    ["b", 4, "y", 5],
  ]);

  cache.startTransaction();
  expect(Array.from(cache.delta(id))).toEqual([id, [], []]);
  cache.delete("x");
  cache.set("b", 42);
  expect(Array.from(cache.delta(id))).toEqual([id, ["x"], ["b", 42]]);
  cache.commit();

  expect(Array.from(cache.delta(id))).toEqual([
    id,
    ["c", "d", "x"],
    ["b", 42, "y", 5],
  ]);
});

test("nesting snapshots", () => {
  const cache = new LayeredCache();
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

test("getNumber", () => {
  const cache = new LayeredCache();
  cache.set("abc", 123);
  cache.set("foo", "bar");

  expect(size(cache)).toEqual(2);
  expect(cache.get("foo")).toEqual("bar");
  expect(cache.get("abc")).toEqual(123);

  expect(cache.getNumber("abc")).toEqual(123);
  expect(cache.getNumber("foo")).toEqual(undefined);
});
