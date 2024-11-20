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

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });
});

test("offline mutations are synced with server after reconnect (extra sync should not make a difference)", async () => {
  const { client, server, sync, disconnect, reconnect } = await oneClientSetup({
    inc,
  });

  disconnect();
  client.mutate.inc("a");

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({});

  await reconnect();
  await sync(); // Same as previous test, but now also do an extra sync step here

  expect(client.data).toEqual({ a: 1 });
  expect(server.data).toEqual({ a: 1 });
});

test.only("client catches up with server after every (re)connect", async () => {
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

  await reconnect();

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 1 });

  await sync();

  expect(client.data).toEqual({ a: 3 });
  expect(server.data).toEqual({ a: 3 });
});
