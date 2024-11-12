import { describe, expect, test } from "vitest";
import { Client, Server } from "~/index.js";
import { opId } from "~/utils.js";
import * as mutations from "./_mutations.js";

describe("Client", () => {
  test("can be mutated locally", () => {
    const client = new Client(mutations);
    client.mutate.put("a", 1);
    client.mutate.put("b", 2);
    client.mutate.put("c", 3);
    client.mutate.inc("c");

    expect(client.asObject()).toEqual({ a: 1, b: 2, c: 4 });
  });

  test("mutations can fail", () => {
    const client = new Client(mutations);
    expect(() => client.mutate.dec("a")).toThrow("Cannot decrement beyond 0");
    expect(client.asObject()).toEqual({});
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
    expect(client.asObject()).toEqual({ a: 1, b: 3, c: 1 });
  });

  test("most basic end to end test", () => {
    const client1 = new Client(mutations);
    const client2 = new Client(mutations);
    const server = new Server(mutations);

    const op1 = client1.mutate.put("a", 1);
    const op2 = client2.mutate.put("a", 2);

    expect(client1.asObject()).toEqual({ a: 1 });
    expect(client2.asObject()).toEqual({ a: 2 });
    expect(server.asObject()).toEqual({});

    // Simulate client A op reaching server first
    const delta1 = server.applyOp([op1, "put", ["a", 1]]);

    // Apply the delta on both clients
    client1.applyDelta(delta1);
    client2.applyDelta(delta1);

    expect(client1.asObject()).toEqual({ a: 1 });
    expect(client2.asObject()).toEqual({ a: 2 });
    expect(server.asObject()).toEqual({ a: 1 });

    // Simulate client B op reaching server next
    const delta2 = server.applyOp([op2, "put", ["a", 2]]);

    // Apply the delta on both clients
    client1.applyDelta(delta2);
    client2.applyDelta(delta2);

    expect(client1.asObject()).toEqual({ a: 2 });
    expect(client2.asObject()).toEqual({ a: 2 });
    expect(server.asObject()).toEqual({ a: 2 });
  });

  test("basic end to end test with randomization in mutation", () => {
    function connect(client: Client, server: Server) {
      //client.
    }

    function twoClientSetup() {
      const client1 = new Client(mutations);
      const client2 = new Client(mutations);
      const server = new Server(mutations);

      const pipe1 = connect(client1, server);
      const pipe2 = connect(client2, server);

      return { client1, client2, server, pause: () => {}, unpause: () => {} };
    }

    const { client1, client2, server, pause, unpause } = twoClientSetup();

    const op1 = client1.mutate.put("a", 1);
    const op2 = client2.mutate.putRandom("b");

    const b1 = client2.asObject()["b"]; // First random number (from first optimistic update)

    expect(client1.asObject()).toEqual({ a: 1 });
    expect(client2.asObject()).toEqual({ b: b1 });
    expect(server.asObject()).toEqual({});

    // Simulate client A op reaching server first
    const delta1 = server.applyOp([op1, "put", ["a", 1]]);

    // Apply the delta on both clients
    client1.applyDelta(delta1);
    client2.applyDelta(delta1);

    const b2 = client2.asObject()["b"]; // Second random number (after applying first op)

    expect(client1.asObject()).toEqual({ a: 1 });
    expect(client2.asObject()).toEqual({ a: 1, b: b2 });
    expect(server.asObject()).toEqual({ a: 1 });

    // Simulate client B op reaching server next
    const delta2 = server.applyOp([op2, "putRandom", ["b"]]);

    // Apply the delta on both clients
    client1.applyDelta(delta2);
    client2.applyDelta(delta2);

    const b3 = client2.asObject()["b"]; // Third random number (authoritative from server)

    expect(client1.asObject()).toEqual({ a: 1, b: b3 });
    expect(client2.asObject()).toEqual({ a: 1, b: b3 });
    expect(server.asObject()).toEqual({ a: 1, b: b3 });

    // The random numbers are (most likely) not equal
    // There is a tiny change this test does not pass
    // expect(new Set([b1, b2, b3]).size).toEqual(3);
    expect(new Set([b1, b2, b3]).size).toBeGreaterThan(1);
  });
});

describe("Server", () => {
  test("can be mutated locally (but only through Ops)", () => {
    const server = new Server(mutations);
    server.applyOp([opId(), "put", ["a", 1]]);
    server.applyOp([opId(), "put", ["b", 2]]);
    server.applyOp([opId(), "put", ["c", 3]]);
    const delta = server.applyOp([opId(), "inc", ["c"]]);

    expect(server.asObject()).toEqual({ a: 1, b: 2, c: 4 });
    expect(delta).toEqual([expect.any(String), [], [["c", 4]]]);
  });

  test.skip("server should validate incoming ops before executing them", () => {
    const server = new Server(mutations);
    server.applyOp([
      opId(),
      "put",
      [], // not enough params
    ]);
    server.applyOp([opId(), "inc", ["a", 999]]); // too many params (inc only has one arg)
    server.applyOp([opId(), "inc", [999]]); // key not passed as a string

    expect(server.asObject()).toEqual({});
  });
});
