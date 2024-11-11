import { describe, expect, test } from "vitest";
import { StoreStub } from "~/StoreStub.js";
import { fmt, size } from "./utils.js";

describe("StoreStub", () => {
  test("empty", () => {
    const stub = new StoreStub();
    expect(size(stub)).toEqual(0);
  });

  test("it's basically a Map", () => {
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

  test("getNumber convenience accessor", () => {
    const stub = new StoreStub();
    stub.set("abc", 123);
    stub.set("foo", "bar");

    expect(size(stub)).toEqual(2);
    expect(stub.get("foo")).toEqual("bar");
    expect(stub.get("abc")).toEqual(123);

    expect(stub.getNumber("abc")).toEqual(123);
    expect(stub.getNumber("foo")).toEqual(undefined);
  });

  test("transactions", () => {
    const stub = new StoreStub();
    stub.set("abc", 1);
    stub.set("xyz", 2);
    stub.delete("foo");
    expect(size(stub)).toEqual(2);
    expect(fmt(stub)).toEqual({ abc: 1, xyz: 2 });

    const txn = stub.startTransaction();
    txn.delete("xyz");
    txn.delete("foo");
    txn.set("abc", 42);
    txn.set("pqr", 3);

    expect(size(stub)).toEqual(2);
    expect(size(txn)).toEqual(2);

    // Original stub is unaffected
    expect(fmt(stub)).toEqual({ abc: 1, xyz: 2 });
    expect(fmt(txn)).toEqual({ abc: 42, pqr: 3 });
    txn.commit();

    expect(fmt(stub)).toEqual({ abc: 42, pqr: 3 });
  });
});
