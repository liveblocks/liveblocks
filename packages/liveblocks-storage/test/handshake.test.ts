import { expect, test } from "vitest";

import { fail, inc, put } from "./mutations.config.js";
import { oneClientSetup, twoClientsSetup } from "./utils.js";

test("server state increases with every change", async () => {
  const { client, server, sync } = await oneClientSetup({
    inc,
  });

  client.mutate.inc("a");
  expect(server.clock).toEqual(0);

  await sync(client);
  expect(server.clock).toEqual(1);
});

test("server state won’t increase when mutation fails", async () => {
  const { client, server, sync } = await oneClientSetup(
    { inc, notOnServer: inc, failOnServer: inc },
    { inc, failOnServer: fail }
  );

  expect(server.clock).toEqual(0);
  client.mutate.inc("a");
  try {
    client.mutate.notOnServer("a");
  } catch {}
  try {
    client.mutate.failOnServer("a");
  } catch {}
  client.mutate.inc("a");

  await sync(client);
  expect(server.clock).toEqual(2);
});

test("only reconnecting will not increase the server clock", async () => {
  const { server, reconnect } = await oneClientSetup({
    inc,
  });

  expect(server.clock).toEqual(0);

  await reconnect();
  expect(server.clock).toEqual(0);

  await reconnect();
  expect(server.clock).toEqual(0);
});

test("basic reconnect without data", async () => {
  const { client, server, disconnect, reconnect } = await oneClientSetup({});

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  await reconnect();

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  disconnect();

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});

  await reconnect();

  expect(client.data).toEqual({});
  expect(server.data).toEqual({});
});

test("client catches up with server after every (re)connect", async () => {
  const { client, server, sync, disconnect, reconnect } = await oneClientSetup({
    inc,
    put,
  });

  client.mutate.put("a", 1);
  await sync();

  expect(server.clock).toEqual(1);
  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });

  client.mutate.inc("a");

  expect(client.data).toEqual({ a: 2 });
  expect(server.data).toEqual({ a: 1 });

  // Force-disconnects the socket pipes, loosing any messages that were already
  // travelling on the wire
  disconnect();

  client.mutate.inc("a");
  expect(server.clock).toEqual(1);
  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 1 });

  client.debug();
  server.debug();

  // Client reconnects, handshakes, and catches up with server
  await reconnect();

  expect(server.clock).toEqual(1);
  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 1 });

  // Deliver the client's pending ops
  await sync();

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 3 });
});

test("client catches up with server after every (re)connect with initial server state", async () => {
  const { client1, client2, server, sync, reconnect, disconnect } =
    await twoClientsSetup({ inc, put });

  // Set initial state
  disconnect(client1);
  client2.mutate.put("a", 2);
  await sync();

  expect(server.clock).toEqual(1);
  expect(server.data).toEqual({ a: 2 });
  expect(client1.data).toEqual({});
  expect(client2.data).toEqual({ a: 2 });

  // Let client1 reconnect
  client1.mutate.put("a", 1);
  await reconnect(client1); // Handshake only, not yet sending the Ops

  expect(server.clock).toEqual(1);
  expect(server.data).toEqual({ a: 2 });
  expect(client1.data).toEqual({ a: 1 });
  expect(client2.data).toEqual({ a: 2 });

  await sync(client1); // Send pending Ops

  expect(server.clock).toEqual(2);
  expect(server.data).toEqual({ a: 1 });
  expect(client1.data).toEqual({ a: 1 });
  expect(client2.data).toEqual({ a: 2 });

  await sync();

  expect(server.clock).toEqual(2);
  expect(server.data).toEqual({ a: 1 });
  expect(client1.data).toEqual({ a: 1 });
  expect(client2.data).toEqual({ a: 1 });
});

test("reconnect after sync is a no-op", async () => {
  const { client, server, sync, reconnect } = await oneClientSetup({
    inc,
  });

  client.mutate.inc("a");
  await sync();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });

  await reconnect();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });
});

test("disconnect after sync is a no-op", async () => {
  const { client, server, sync, disconnect } = await oneClientSetup({
    inc,
  });

  client.mutate.inc("a");
  await sync();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });

  disconnect();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });
});

test.fails(
  "trying to sync after disconnect should fail with a broken pipe (= meta test of testing utility)",
  async () => {
    const { client, sync, disconnect } = await oneClientSetup({
      inc,
    });

    disconnect();
    await expect(() => sync(client)).rejects.toThrow(
      "Can't send to broken pipe"
    );
  }
);

test("offline mutations are synced with server after reconnect", async () => {
  const { client, server, sync, disconnect, reconnect } = await oneClientSetup({
    inc,
  });

  disconnect();
  client.mutate.inc("a");

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({});

  await reconnect();

  // Client caught up with server + schedules pending Op
  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({});

  // Exchange pending op
  await sync();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });
});

// XXX Look into why this fails!
test.fails(
  "mutations should never run more than once on the server",
  async () => {
    const { client, server, sync, disconnect, reconnect } =
      await oneClientSetup({
        inc,
      });
    expect(client.actor).toEqual(1);

    client.mutate.inc("a"); // Op1
    await sync(client); // Deliver Op1 to server, but do NOT send its ack back to client yet

    disconnect();
    client.mutate.inc("a"); // Op2

    expect(client.data).toEqual({ a: 2 }); // Client still thinks Op1 and Op2 are pending
    expect(server.data).toEqual({ a: 1 }); // Even though server has already acked Op1

    await reconnect(); // Reconnected as actor 2 now + caught up with server
    expect(client.actor).toEqual(2);

    // Client caught up with server count of 1, plus momentarily applies Op1 and
    // Op2 locally on top of that causing a brief flash of 3
    expect(client.data).toEqual({ a: 3 });
    expect(server.data).toEqual({ a: 1 });

    await sync(client); // Client now resends Op1 + Op2 to server

    expect(client.data).toEqual({ a: 3 });
    expect(server.data).toEqual({ a: 2 }); // Server should ignore Op1 (already confirmed), and only apply Op2

    await sync(server); // Delivers ack of Op1 + Op2 to client
    expect(client.data).toEqual({ a: 2 });
    expect(server.data).toEqual({ a: 2 });
  }
);
