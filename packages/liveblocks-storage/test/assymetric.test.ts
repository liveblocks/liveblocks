/**
 * Assymmetric storage is when client and server has different implementations
 * for the same mutations.
 */

import { expect, test } from "vitest";

import { fail, inc, put, putAndInc } from "./mutations.config.js";
import { oneClientSetup, twoClientsSetup } from "./utils.js";

test("assymmetric mutators (different behavior will sync)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { assymetricPut: put }, // Client will only set
    { assymetricPut: putAndInc } // Server implementation will also increment
  );

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  client.mutate.assymetricPut("a", 1);

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({});

  await sync(client);

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 2 });

  await sync(server);

  expect(client.data).toEqual({ a: 2 });
  expect(server.data).toEqual({ a: 2 });
});

test("assymmetric mutators (rollback)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { put, assymmetricInc: inc }, // Client will not fail
    { put, assymmetricInc: fail } // Inc fails on the server
  );

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  client.mutate.put("a", 2);

  expect(client.data).toEqual({ a: 2 });
  expect(server.data).toEqual({});

  client.mutate.assymmetricInc("a"); // Will fail on the server

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({});

  client.mutate.put("b", 1);

  expect(client.data).toEqual({ a: 3, b: 1 });
  expect(server.data).toEqual({});

  await sync(client);

  expect(client.data).toEqual({ a: 3, b: 1 });
  expect(server.data).toEqual({ a: 2, b: 1 });

  await sync(server);

  // Server will fail, and thus revert the mutation
  expect(client.data).toEqual({ a: 2, b: 1 });
  expect(server.data).toEqual({ a: 2, b: 1 });
});

test("assymmetric mutators (rollback) (2 clients)", async () => {
  const { client1, client2, server, sync } = await twoClientsSetup(
    { put, assymmetricInc: inc }, // Client will not fail
    { put, assymmetricInc: fail } // Inc fails on the server
  );

  expect(client1.data).toEqual({});
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.put("a", 2);

  expect(client1.data).toEqual({ a: 2 });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.assymmetricInc("a"); // Will fail on the server

  expect(client1.data).toEqual({ a: 3 });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.put("b", 1);

  expect(client1.data).toEqual({ a: 3, b: 1 });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  await sync(client1);

  expect(client1.data).toEqual({ a: 3, b: 1 });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({ a: 2, b: 1 });

  await sync(server);

  // Server will fail, and thus revert the mutation
  expect(client1.data).toEqual({ a: 2, b: 1 });
  expect(client2.data).toEqual({ a: 2, b: 1 });
  expect(server.data).toEqual({ a: 2, b: 1 });
});
