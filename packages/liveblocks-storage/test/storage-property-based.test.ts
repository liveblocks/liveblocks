/**
 * This module does not use example based testing. Instead, it will generate
 * random mutations that are run on three clients randomly, and randomly
 * synchronized.
 *
 * The main assertion is not about _what_ values storage lands on, but the main
 * property to assert is that whatever the value is, after synchronization, it
 * will be the same in all clients and on the server.
 */

import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { dec, inc } from "./mutations.config.js";
import * as mutations from "./mutations.config.js";
import { manyClientsSetup, oneClientSetup } from "./utils.js";

const key = () =>
  fc.oneof(
    fc.constant("a"),
    fc.constant("b"),
    fc.constant("c"),
    fc.constant("foo"),
    fc.constant("toString")
  );

const clientIdx = () => fc.nat().map((n) => (n % 3) as 0 | 1 | 2);

const randomMutation = () =>
  fc.oneof(
    fc.tuple(clientIdx(), fc.constant("put"), fc.tuple(key(), fc.jsonValue())),
    fc.tuple(clientIdx(), fc.constant("putAndFail"), fc.tuple(key(), fc.jsonValue())), // prettier-ignore
    fc.tuple(clientIdx(), fc.constant("inc"), fc.tuple(key())),
    fc.tuple(clientIdx(), fc.constant("dec"), fc.tuple(key())),
    fc.tuple(clientIdx(), fc.constant("del"), fc.tuple(key())),

    fc.tuple(fc.constant(-1), fc.constant("sync")),
    fc.tuple(clientIdx(), fc.constant("sync")),
    fc.tuple(clientIdx(), fc.constant("reconnect"))

    // TODO Figure out how to test disconnections here nicely. The tricky part
    // here is that we cannot "just" inject this here, because:
    // 1. When followed by a "sync", it would cause a broken pipe error.
    // 2. Before the end of the test, we should synchronize everything, which
    //    cannot happen when disconnected.
    //
    // Testing disconnections should still be extremely important though! It's
    // just that it MUST be followed up with at least one "reconnect" somewhere
    // further down the sequence.
    //
    // fc.tuple(clientIdx(), fc.constant("disconnect"))
  );

test("no matter what happens, storage always synchronizes to be the same", () =>
  fc.assert(
    fc.asyncProperty(
      fc.array(randomMutation(), { minLength: 1, maxLength: 30 }),

      async (sequence) => {
        const { server, clients, sync, disconnect, reconnect } =
          await manyClientsSetup(3, mutations);

        for (const [idx, name, args] of sequence) {
          if (name === "disconnect") {
            disconnect(clients[idx]!.client);
            continue;
          }

          if (name === "reconnect") {
            await reconnect(clients[idx]!.client);
            continue;
          }

          // Special command for randomizing syncs
          if (name === "sync") {
            if (idx === -1) {
              await sync(server);
            } else {
              await sync(clients[idx]!.client);
            }
            continue;
          }

          // A normal, synchronous, mutation in one of the clients
          const client = clients[idx]!.client;

          try {
            // @ts-expect-error too dynamic
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            client.mutate[name](...args);
          } catch {
            // Ignore
          }
        }

        // Allow at least two round-trips of synchronizations
        await sync();

        const client1 = clients[0]!.client;
        const client2 = clients[1]!.client;
        const client3 = clients[2]!.client;

        const expected = server.data;
        expect(server.data).toEqual(expected);
        expect(client1.data).toEqual(expected);
        expect(client2.data).toEqual(expected);
        expect(client3.data).toEqual(expected);
      }
    ),
    { numRuns: 70 }
  ));

describe("regression historically found by counter-examples", () => {
  test("dec, inc bug", async () => {
    const { client, server, sync } = await oneClientSetup(mutations);

    expect(client.data).toEqual({});
    expect(server.data).toEqual({});

    expect(() => client.mutate.dec("a")).toThrow(); // ⚡
    client.mutate.inc("a"); // 1

    expect(client.data).toEqual({ a: 1 });
    expect(server.data).toEqual({});

    await sync(client);

    expect(client.data).toEqual({ a: 1 });
    expect(server.data).toEqual({ a: 1 });

    await sync(server);

    expect(client.data).toEqual({ a: 1 });
    expect(server.data).toEqual({ a: 1 });
  });

  test("inc, dec, dec bug", async () => {
    const { client, server, sync } = await oneClientSetup({ inc, dec });

    expect(client.data).toEqual({});
    expect(server.data).toEqual({});

    client.mutate.inc("a"); // 1
    client.mutate.dec("a"); // 0
    expect(() => client.mutate.dec("a")).toThrow(); // ⚡

    expect(client.data).toEqual({ a: 0 });
    expect(server.data).toEqual({});

    await sync(client);

    expect(client.data).toEqual({ a: 0 });
    expect(server.data).toEqual({ a: 0 });

    await sync(server);

    expect(client.data).toEqual({ a: 0 });
    expect(server.data).toEqual({ a: 0 });
  });
});
