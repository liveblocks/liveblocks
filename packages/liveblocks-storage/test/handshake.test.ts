import { expect, test } from "vitest";

import { inc, put } from "./mutations.config.js";
import { oneClientSetup } from "./utils.js";

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

test("client catches up with server after every (re)connect", async () => {
  const { client, server, sync, disconnect, reconnect } = await oneClientSetup({
    inc,
    put,
  });

  client.mutate.put("a", 1);
  await sync();

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });

  client.mutate.inc("a");

  expect(client.data).toEqual({ a: 2 });
  expect(server.data).toEqual({ a: 1 });

  // Force-disconnects the socket pipes, loosing any messages that were already
  // travelling on the wire
  disconnect();

  expect(client.data).toEqual({ a: 2 });
  expect(server.data).toEqual({ a: 1 });

  client.mutate.inc("a");

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 1 });

  // Client caught up with server + sends pending Op
  await reconnect();

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 1 });

  // Deliver pending op
  await sync();

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 3 });
});

test("mutations should never run more than once on the server", async () => {
  const { client, server, sync, disconnect, reconnect } = await oneClientSetup({
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
});
