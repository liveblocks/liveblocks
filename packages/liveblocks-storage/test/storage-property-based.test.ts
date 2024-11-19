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
import { expect, test } from "vitest";

import { del, inc, put, putAndFail } from "./mutations.config.js";
import { manyClientsSetup } from "./utils.js";

const key = () =>
  // fc.string()
  fc.oneof(
    fc.constant("a"),
    fc.constant("b"),
    fc.constant("c"),
    fc.constant("foo")
  );

const clientIndex = () => fc.nat().map((n) => (n % 3) as 0 | 1 | 2);

const randomMutation = () =>
  fc.oneof(
    fc.record({
      client: clientIndex(),
      name: fc.constant("put"),
      args: fc.tuple(key(), fc.jsonValue()),
    }),
    fc.record({
      client: clientIndex(),
      name: fc.constant("putAndFail"),
      args: fc.tuple(key(), fc.jsonValue()),
    }),
    fc.record({
      client: clientIndex(),
      name: fc.constant("inc"),
      args: fc.tuple(key()),
    }),
    fc.record({
      client: clientIndex(),
      name: fc.constant("del"),
      args: fc.tuple(key()),
    }),

    fc.record({ client: clientIndex(), name: fc.constant("sync") }),
    fc.record({ client: fc.constant(-1), name: fc.constant("sync") })
  );

test("no matter what happens, storage always synchronizes to be the same", () =>
  fc.assert(
    fc.asyncProperty(
      fc.array(randomMutation()),

      async (sequence) => {
        const { server, clients, sync } = await manyClientsSetup(3, {
          put,
          putAndFail,
          inc,
          del,
        });

        for (const cmd of sequence) {
          // Special command for randomizing syncs
          if (cmd.name === "sync") {
            if (cmd.client === -1) {
              await sync(server);
            } else {
              await sync(clients[cmd.client]!.client);
            }
          } else {
            // A normal, synchronous, mutation in one of the clients
            const client = clients[cmd.client]!.client;

            // @ts-expect-error too dynamic
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            try {
              client.mutate[cmd.name](...cmd.args);
            } catch {}
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
    )
  ));
