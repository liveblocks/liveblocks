import { describe, expect, test } from "vitest";

import { Client } from "~/Client.js";
import { Server } from "~/Server.js";

import * as mutations from "./mutations.config.js";
import { clientServerSetup } from "./utils.js";

describe("Single Client/Server sync test", () => {
  test("most basic end to end test", async () => {
    const { client, server, sync } = clientServerSetup(mutations);

    expect(client.asObject()).toEqual({});
    expect(server.asObject()).toEqual({});

    client.mutate.inc("a");

    expect(client.asObject()).toEqual({ a: 1 });
    expect(server.asObject()).toEqual({});

    await sync();

    expect(client.asObject()).toEqual({ a: 1 });
    expect(server.asObject()).toEqual({ a: 1 });
  });
});

describe("Multi-client storage synchronization tests", () => {
  test("most basic end to end test", async () => {
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
    const client1 = new Client(mutations);
    const client2 = new Client(mutations);
    const server = new Server(mutations);

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
