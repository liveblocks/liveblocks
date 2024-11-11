import { describe, expect, test } from "vitest";
import { StoreStub } from "~/StoreStub.js";
import { fmt, size } from "./utils.js";

describe("StoreStub basics", () => {
  test("empty", () => {
    const stub = new StoreStub();
    expect(size(stub)).toEqual(0);
    expect(fmt(stub)).toEqual({});
  });

  test("setting keys", () => {
    const stub = new StoreStub();
    stub.set("a", 1);
    stub.set("b", "hi");
    stub.set("c", null);
    expect(size(stub)).toEqual(3);
    expect(fmt(stub)).toEqual({
      a: 1,
      b: "hi",
      c: null,
    });
  });

  test("setting to undefined is the same as removing a key", () => {
    const stub = new StoreStub();
    stub.set("a", 1);
    stub.set("b", "hi");
    // @ts-expect-error `undefined` isn't JSON
    stub.set("d", undefined);
    // @ts-expect-error `undefined` isn't JSON
    stub.set("a", undefined);

    expect(size(stub)).toEqual(1);
    expect(fmt(stub)).toEqual({
      b: "hi",
    });
    expect(Array.from(stub.keys())).toEqual(["b"]);
  });

  test("has", () => {
    const stub = new StoreStub();
    expect(stub.has("k")).toEqual(false);

    stub.set("k", "v");
    expect(stub.has("k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    stub.set("k", undefined);
    expect(stub.has("k")).toEqual(false);

    stub.delete("foo");
    expect(stub.has("foo")).toEqual(false);
    stub.set("foo", false);
    expect(stub.has("foo")).toEqual(true);
    stub.delete("foo");
    expect(stub.has("foo")).toEqual(false);
  });

  test("get", () => {
    const stub = new StoreStub();
    expect(stub.get("k")).toBe(undefined);

    stub.set("k", "v");
    expect(stub.get("k")).toBe("v");

    stub.set("k", 123);
    expect(stub.get("k")).toBe(123);

    stub.set("k", null);
    expect(stub.get("k")).toBe(null);

    // @ts-expect-error - undefined isn't JSON
    stub.set("k", undefined);
    expect(stub.get("k")).toBe(undefined);
  });

  test("has (after snapshot)", () => {
    const stub = new StoreStub();
    stub.snapshot();
    expect(stub.has("k")).toEqual(false);

    stub.set("k", "v");
    expect(stub.has("k")).toEqual(true);

    // @ts-expect-error - undefined isn't JSON
    stub.set("k", undefined);
    expect(stub.has("k")).toEqual(false);

    stub.delete("foo");
    expect(stub.has("foo")).toEqual(false);
    stub.set("foo", false);
    expect(stub.has("foo")).toEqual(true);
    stub.delete("foo");
    expect(stub.has("foo")).toEqual(false);
  });

  test("get (after snapshot)", () => {
    const stub = new StoreStub();
    stub.snapshot();
    expect(stub.get("fuuu")).toBe(undefined);

    stub.set("k", "v");
    expect(stub.get("k")).toBe("v");

    stub.set("k", 123);
    expect(stub.get("k")).toBe(123);

    stub.set("k", null);
    expect(stub.get("k")).toBe(null);

    // @ts-expect-error - undefined isn't JSON
    stub.set("k", undefined);
    expect(stub.get("k")).toBe(undefined);
  });

  test("get", () => {
    const stub = new StoreStub();
    stub.set("k", "a");
    stub.set("k", "v");
    stub.set("abc", 123);
    stub.set("def", 123);
    stub.set("foo", null);
    stub.delete("def");
    stub.delete("bla");

    expect(size(stub)).toEqual(3);
    expect(fmt(stub)).toEqual({ k: "v", abc: 123, foo: null });
    expect(stub.get("k")).toEqual("v");
    expect(stub.get("abc")).toEqual(123);
    expect(stub.get("foo")).toEqual(null);
    expect(stub.get("def")).toEqual(undefined);
    expect(stub.get("bla")).toEqual(undefined);
    expect(stub.get("xyz")).toEqual(undefined);
  });

  test("it supports iteration", () => {
    const stub = new StoreStub();
    stub.set("a", "a");
    stub.set("b", "b");
    stub.set("c", "c");
    stub.delete("b");
    stub.delete("d");

    const obj = Object.fromEntries(stub);
    expect(obj).toEqual({ a: "a", c: "c" });
  });
});

describe("snapshotting & rolling back", () => {
  test("committing before snapshotting fails", () => {
    const stub = new StoreStub();
    expect(() => stub.commit()).toThrow("No snapshot to commit");
  });

  test("rolling back before snapshotting fails", () => {
    const stub = new StoreStub();
    expect(() => stub.rollback()).toThrow("No snapshot to roll back");
  });

  test("adding new keys", () => {
    const stub = new StoreStub();
    stub.set("a", 1);

    stub.snapshot();
    expect(fmt(stub)).toEqual({ a: 1 });
    stub.set("b", 2);
    expect(fmt(stub)).toEqual({ a: 1, b: 2 });
    stub.set("c", 3);
    expect(fmt(stub)).toEqual({ a: 1, b: 2, c: 3 });
    stub.commit();

    expect(fmt(stub)).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("transactions: rolling back to last snapshot", () => {
    const stub = new StoreStub();
    stub.set("a", 1);
    stub.set("b", 2);
    expect(fmt(stub)).toEqual({ a: 1, b: 2 });

    stub.snapshot();
    stub.set("a", 42);
    stub.set("c", 3);
    stub.set("d", 4);
    stub.delete("b");
    stub.delete("z");
    expect(fmt(stub)).toEqual({ a: 42, c: 3, d: 4 });
    stub.rollback();

    expect(fmt(stub)).toEqual({ a: 1, b: 2 });
  });
});

describe("convenience accessors", () => {
  test("getNumber", () => {
    const stub = new StoreStub();
    stub.set("abc", 123);
    stub.set("foo", "bar");

    expect(size(stub)).toEqual(2);
    expect(stub.get("foo")).toEqual("bar");
    expect(stub.get("abc")).toEqual(123);

    expect(stub.getNumber("abc")).toEqual(123);
    expect(stub.getNumber("foo")).toEqual(undefined);
  });
});
