import { describe, expect, test } from "vitest";
import { Client, Server, StoreStub } from "~/index.js";
import type { Json } from "~/Json.js";
import * as mutations from "./_mutations.js";

function fmt(
  base: Client<any> | Server<any> | StoreStub
): Record<string, Json> {
  const stub = "stub" in base ? base.stub : base;
  return Object.fromEntries(stub.entries());
}

function size(base: StoreStub): number {
  return Array.from(base.keys()).length;
}

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
    txn.set("pqr", 3);

    expect(size(stub)).toEqual(2);
    expect(size(txn)).toEqual(2);

    // Original stub is unaffected
    expect(fmt(stub)).toEqual({ abc: 1, xyz: 2 });
    expect(fmt(txn)).toEqual({ abc: 1, pqr: 3 });
    txn.commit();

    expect(fmt(stub)).toEqual({ abc: 1, pqr: 3 });
  });
});

describe("Client", () => {
  test("can be mutated locally", () => {
    const client = new Client(mutations);
    client.mutate.put("a", 1);
    client.mutate.put("b", 2);
    client.mutate.put("c", 3);
    client.mutate.inc("c");

    expect(Array.from(client.stub.keys())).toEqual(["a", "b", "c"]);
    expect(fmt(client)).toEqual({ a: 1, b: 2, c: 4 });
  });

  test("mutations can fail", () => {
    const client = new Client(mutations);
    expect(() => client.mutate.dec("a")).toThrow("Cannot decrement beyond 0");
    expect(fmt(client)).toEqual({});
  });

  test("all mutations should be atomic", () => {
    const client = new Client(mutations);
    client.mutate.put("a", 1);
    client.mutate.put("b", 3);
    try {
      // Fails, so should be rolled back
      client.mutate.putAndFail("a", 42);
    } catch {}
    client.mutate.dupe("a", "c");
    expect(fmt(client)).toEqual({ a: 1, b: 3, c: 1 });
  });
});

describe("Server", () => {
  test("can be mutated locally", () => {
    const server = new Server(mutations);
    server.mutate.put("a", 1);
    server.mutate.put("b", 2);
    server.mutate.put("c", 3);
    server.mutate.inc("c");

    expect(Array.from(server.stub.keys())).toEqual(["a", "b", "c"]);
    expect(fmt(server)).toEqual({
      a: 1,
      b: 2,
      c: 4,
    });
  });
});
