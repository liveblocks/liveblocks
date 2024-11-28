/**
 * Asymmetric storage is when client and server has different implementations
 * for the same mutations.
 */

import { expect, test } from "vitest";

import {
  fail,
  inc,
  put,
  putAndInc,
  putLiveObject,
} from "./mutations.config.js";
import { oneClientSetup, twoClientsSetup } from "./utils.js";

test("asymmetric mutators (different behavior will sync)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { asymetricPut: put }, // Client will only set
    { asymetricPut: putAndInc } // Server implementation will also increment
  );

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  client.mutate.asymetricPut("a", 1);

  expect(client.data).toEqual({ root: { a: 1 } });
  expect(server.data).toEqual({});

  await sync(client);

  expect(client.data).toEqual({ root: { a: 1 } });
  expect(server.data).toEqual({ root: { a: 2 } });

  await sync(server);

  expect(client.data).toEqual({ root: { a: 2 } });
  expect(server.data).toEqual({ root: { a: 2 } });
});

test("asymmetric mutators (rollback)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { put, asymmetricInc: inc }, // Client will not fail
    { put, asymmetricInc: fail } // Inc fails on the server
  );

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  client.mutate.put("a", 2);

  expect(client.data).toEqual({ root: { a: 2 } });
  expect(server.data).toEqual({});

  client.mutate.asymmetricInc("a"); // Will fail on the server

  expect(client.data).toEqual({ root: { a: 3 } });
  expect(server.data).toEqual({});

  client.mutate.put("b", 1);

  expect(client.data).toEqual({ root: { a: 3, b: 1 } });
  expect(server.data).toEqual({});

  await sync(client);

  expect(client.data).toEqual({ root: { a: 3, b: 1 } });
  expect(server.data).toEqual({ root: { a: 2, b: 1 } });

  await sync(server);

  // Server will fail, and thus revert the mutation
  expect(client.data).toEqual({ root: { a: 2, b: 1 } });
  expect(server.data).toEqual({ root: { a: 2, b: 1 } });
});

test("asymmetric mutators (rollback) (2 clients)", async () => {
  const { client1, client2, server, sync } = await twoClientsSetup(
    { put, asymmetricInc: inc }, // Client will not fail
    { put, asymmetricInc: fail } // Inc fails on the server
  );

  expect(client1.data).toEqual({});
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.put("a", 2);

  expect(client1.data).toEqual({ root: { a: 2 } });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.asymmetricInc("a"); // Will fail on the server

  expect(client1.data).toEqual({ root: { a: 3 } });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  client1.mutate.put("b", 1);

  expect(client1.data).toEqual({ root: { a: 3, b: 1 } });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({});

  await sync(client1);

  expect(client1.data).toEqual({ root: { a: 3, b: 1 } });
  expect(client2.data).toEqual({});
  expect(server.data).toEqual({ root: { a: 2, b: 1 } });

  await sync(server);

  // Server will fail, and thus revert the mutation
  expect(client1.data).toEqual({ root: { a: 2, b: 1 } });
  expect(client2.data).toEqual({ root: { a: 2, b: 1 } });
  expect(server.data).toEqual({ root: { a: 2, b: 1 } });
});

test.only("asymmetric mutators (client adds JSON object, server as LiveObject)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { asym: put }, // Client mutations
    { asym: putLiveObject } // Server mutations (different!)
  );

  client.mutate.asym("a", 1);
  await sync(client);

  expect(client.data).toEqual({ root: { a: 1 } });
  expect(server.data).toEqual({
    root: { a: { $ref: "1:1" } },
    "1:1": { a: 1 },
  });

  await sync(server);

  client.mutate.asym("b", 2);
  await sync(client);

  expect(client.data).toEqual({
    root: { a: { $ref: "1:1" }, b: 2 },
    "1:1": { a: 1 },
  });
  expect(server.data).toEqual({
    root: { a: { $ref: "1:1" }, b: { $ref: "2:1" } },
    "1:1": { a: 1 },
    "2:1": { b: 2 },
  });

  await sync();

  expect(client.data).toEqual({
    root: { a: { $ref: "1:1" }, b: { $ref: "2:1" } },
    "1:1": { a: 1 },
    "2:1": { b: 2 },
  });
  expect(server.data).toEqual({
    root: { a: { $ref: "1:1" }, b: { $ref: "2:1" } },
    "1:1": { a: 1 },
    "2:1": { b: 2 },
  });
});

test("asymmetric mutators (client adds LiveObject, server as JSON object)", async () => {
  const { client, server, sync } = await oneClientSetup(
    { asym: putLiveObject },
    { asym: put }
  );

  client.mutate.asym("a", 1);
  await sync(client);

  expect(client.data).toEqual({
    root: { a: { $ref: "0:1" } },
    "0:1": { a: 1 },
  });
  expect(server.data).toEqual({ root: { a: 1 } });

  client.mutate.asym("b", 2);
  await sync(client);

  expect(client.data).toEqual({
    root: { a: { $ref: "0:1" }, b: { $ref: "1:2" } },
    "0:1": { a: 1 },
    "1:2": { b: 2 },
  });
  expect(server.data).toEqual({ root: { a: 1, b: 2 } });

  await sync();

  expect(client.data).toEqual({ root: { a: 1, b: 2 } });
  expect(server.data).toEqual({ root: { a: 1, b: 2 } });
});
