import { describe, expect, test } from "vitest";

import * as mutations from "./mutations.config.js";
import { oneClientSetup, twoClientsSetup } from "./utils.js";

describe("Single Client/Server sync test", () => {
  test("basic client and server sync", async () => {
    const { client, server, sync } = await oneClientSetup(mutations);

    expect(client.data).toEqual({});
    expect(server.data).toEqual({});

    client.mutate.inc("a");

    expect(client.data).toEqual({ root: { a: 1 } });
    expect(server.data).toEqual({});

    await sync(client);
    await sync(server);

    expect(client.data).toEqual({ root: { a: 1 } });
    expect(server.data).toEqual({ root: { a: 1 } });
  });
});

describe("Multi-client storage synchronization tests", () => {
  test("basic sync", async () => {
    const { client1, client2, server, sync } = await twoClientsSetup(mutations);

    expect(client1.data).toEqual({});
    expect(client2.data).toEqual({});
    expect(server.data).toEqual({});

    client1.mutate.put("a", 1);
    client2.mutate.put("a", 2);

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { a: 2 } });
    expect(server.data).toEqual({});

    await sync(client1);

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { a: 2 } });
    expect(server.data).toEqual({ root: { a: 1 } });

    await sync(client2);

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { a: 2 } });
    expect(server.data).toEqual({ root: { a: 2 } });

    await sync();

    expect(client1.data).toEqual({ root: { a: 2 } });
    expect(client2.data).toEqual({ root: { a: 2 } });
    expect(server.data).toEqual({ root: { a: 2 } });
  });

  test("basic end to end test with randomization in mutation", async () => {
    const { client1, client2, server, sync } = await twoClientsSetup(mutations);

    client1.mutate.put("a", 1);
    client2.mutate.putRandom("b");

    const b1 = client2.data["root"]!["b"]; // First random number (from first optimistic update)

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { b: b1 } });
    expect(server.data).toEqual({});

    await sync(client1);
    await sync(server);

    const b2 = client2.data["root"]!["b"]; // Second random number (after applying first op)

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { a: 1, b: b2 } });
    expect(server.data).toEqual({ root: { a: 1 } });

    await sync(client2);

    expect(client1.data).toEqual({ root: { a: 1 } });
    expect(client2.data).toEqual({ root: { a: 1, b: b2 } });
    const b3 = server.data["root"]!["b"]; // Third random number (authoritative from server)
    expect(server.data).toEqual({ root: { a: 1, b: b3 } });

    await sync(server);

    expect(client1.data).toEqual({ root: { a: 1, b: b3 } });
    expect(client2.data).toEqual({ root: { a: 1, b: b3 } });
    expect(server.data).toEqual({ root: { a: 1, b: b3 } });

    // The random numbers are (most likely) not equal
    // There is a tiny change this test does not pass
    // expect(new Set([b1, b2, b3]).size).toEqual(3);
    expect(new Set([b1, b2, b3]).size).toBeGreaterThan(1);
  });
});
