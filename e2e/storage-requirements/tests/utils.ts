import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
  Lson,
  LsonObject,
} from "@liveblocks/client";
import fetch from "node-fetch";
import WebSocket from "ws";
import { ClientRequestArgs } from "http";
import { URL } from "url";

export async function prepareTest() {
  const client1 = createTestClient();
  const client2 = createTestClient();

  const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

  const client1Room = client1.enter(roomName);
  await waitFor(() => client1Room.getConnectionState() === "open");
  const client2Room = client2.enter(roomName);
  await waitFor(() => client2Room.getConnectionState() === "open");

  const storageRoot1: any = await client1Room.getStorage();
  const storageRoot2: any = await client2Room.getStorage();

  async function assert(data: any) {
    await assertClient1(data);
    await assertClient2(data);
  }

  async function assertClient1(data: any) {
    await waitFor(() => {
      const client1Json = objectToJson(storageRoot1.root);

      return JSON.stringify(client1Json) === JSON.stringify(data);
    });
  }

  async function assertClient2(data: any) {
    await waitFor(() => {
      const client2Json = objectToJson(storageRoot2.root);
      return JSON.stringify(client2Json) === JSON.stringify(data);
    });
  }

  return {
    root1: storageRoot1.root,
    root2: storageRoot2.root,
    socket1: sockets[0],
    socket2: sockets[1],
    assert,
    assertClient1,
    assertClient2,
  };
}

class MockWebSocket extends WebSocket {
  sendBuffer: any[] = [];
  _isSendPaused = false;

  constructor(
    address: string | URL,
    protocols: WebSocket.ClientOptions | ClientRequestArgs | undefined
  ) {
    super(address, protocols);

    sockets.push(this);
  }

  pauseSend() {
    this._isSendPaused = true;
  }

  resumeSend() {
    this._isSendPaused = false;
    for (const item of this.sendBuffer) {
      super.send(item);
    }
    this.sendBuffer = [];
  }

  send(data: any) {
    if (this._isSendPaused) {
      this.sendBuffer.push(data);
    } else {
      super.send(data);
    }
  }
}

const sockets: MockWebSocket[] = [];

import "dotenv/config";

function createTestClient() {
  return createClient({
    publicApiKey: process.env.PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
    fetchPolyfill: fetch,
    WebSocketPolyfill: MockWebSocket,
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => {}, delay: number = 2000) {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < delay) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw "TIMEOUT waiting for predicate";
}

function objectToJson(record: LiveObject<LsonObject>) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson<T extends Lson>(list: LiveList<T>): Array<T> {
  return list.toArray().map(toJson);
}

function mapToJson<TKey extends string, TValue extends Lson>(
  map: LiveMap<TKey, TValue>
): Array<[string, TValue]> {
  return Array.from(map.entries())
    .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
    .map((entry) => [entry[0], toJson(entry[1])]);
}

function toJson(value: unknown) {
  if (value instanceof LiveObject) {
    return objectToJson(value);
  } else if (value instanceof LiveList) {
    return listToJson(value);
  } else if (value instanceof LiveMap) {
    return mapToJson(value);
  }

  return value;
}
