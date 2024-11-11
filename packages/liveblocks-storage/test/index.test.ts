import { describe, expect, test } from "vitest";
import { Client, Server } from "~/index.js";
import { fmt } from "./utils.js";
import * as mutations from "./_mutations.js";

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

  test.skip("basic random test (re-executing pending mutation should lead to new random key every time!)", () => {
    const client1 = new Client(mutations);
    const server = new Server(mutations);

    // Client A:
    // - Main cache: {}
    // - Pending cache: { "a": 0.1223232 }
    // - Pending ops: [ ["putRandom", "a"] ]

    // Server:
    // - Cache: { "b": 1 }

    // Client A:
    // - Main cache: {}
    // - Pending cache: { "a": 0.1223232 }
    // - Pending ops: [ ["putRandom", "a"] ]

    // Server:
    // - Cache: { "a": 0.12897239 }

    // Client A:
    // - Main cache: { "a": 0.12897239 }
    // - Pending cache: { }
    // - Pending ops: [ ]

    client1.mutate.putRandom("a");

    expect(fmt(client1)).toEqual({ a: 1 });
    expect(fmt(server)).toEqual({});

    // Simulate client A op reaching server first
    const delta1 = server.applyOp(["put", ["a", 1]]);

    // Apply the delta on both clients
    client1.applyDelta(delta1);

    expect(fmt(client1)).toEqual({ a: 1 });
    expect(fmt(server)).toEqual({ a: 1 });
  });

  test("most basic end to end test", () => {
    const client1 = new Client(mutations);
    const client2 = new Client(mutations);
    const server = new Server(mutations);

    client1.mutate.put("a", 1);
    client2.mutate.put("a", 2);

    expect(fmt(client1)).toEqual({ a: 1 });
    expect(fmt(client2)).toEqual({ a: 2 });
    expect(fmt(server)).toEqual({});

    // Simulate client A op reaching server first
    const delta1 = server.applyOp(["put", ["a", 1]]);

    // Apply the delta on both clients
    client1.applyDelta(delta1);
    client2.applyDelta(delta1);

    expect(fmt(client1)).toEqual({ a: 1 });
    expect(fmt(client2)).toEqual({ a: 2 });
    expect(fmt(server)).toEqual({ a: 1 });

    // Simulate client B op reaching server next
    const delta2 = server.applyOp(["put", ["a", 2]]);

    // Apply the delta on both clients
    client1.applyDelta(delta2);
    client2.applyDelta(delta2);

    expect(fmt(client1)).toEqual({ a: 2 });
    expect(fmt(client2)).toEqual({ a: 2 });
    expect(fmt(server)).toEqual({ a: 2 });
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
