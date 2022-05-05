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
import isEqual from "lodash/isEqual";
import { diff } from "jest-diff";

import "dotenv/config";

export async function prepareTest<T extends LsonObject>(initialStorage = {}) {
  const sockets: MockWebSocket[] = [];

  function createTestClient() {
    const publicApiKey = process.env.LIVEBLOCKS_PUBLIC_KEY;

    if (publicApiKey == null) {
      throw new Error(
        `Environment variable "LIVEBLOCKS_PUBLIC_KEY" is missing.`
      );
    }

    return createClient({
      publicApiKey,
      fetchPolyfill: fetch,
      WebSocketPolyfill: MockWebSocket,
      liveblocksServer: process.env.LIVEBLOCKS_SERVER,
    } as any);
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

  const client1 = createTestClient();
  const client2 = createTestClient();

  const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

  const client1Room = client1.enter(roomName, {
    defaultStorageRoot: initialStorage,
  });
  await waitFor(() => client1Room.getConnectionState() === "open");
  const client2Room = client2.enter(roomName);
  await waitFor(() => client2Room.getConnectionState() === "open");

  const storageRoot1 = await client1Room.getStorage<T>();
  const storageRoot2 = await client2Room.getStorage<T>();

  async function assert(data: any, data2?: any) {
    const areEquals = await waitFor(() => {
      const client1Json = objectToJson(storageRoot1.root);
      const client2Json = objectToJson(storageRoot2.root);

      return isEqual(client1Json, data) && isEqual(client2Json, data2 || data);
    });

    if (!areEquals) {
      expect(objectToJson(storageRoot1.root)).toEqualWithMessage(
        data,
        "Client 1 storage is invalid"
      );
      expect(objectToJson(storageRoot2.root)).toEqualWithMessage(
        data2 || data,
        "Client 2 storage is invalid"
      );
    }
  }

  async function assertEach(data1: unknown, data2: unknown) {
    return assert(data1, data2);
  }

  const socketUtils = {
    pauseAllSockets: () => {
      sockets[0].pauseSend();
      sockets[1].pauseSend();
    },
    sendMessagesClient1: () => {
      sockets[0].resumeSend();
    },
    sendMessagesClient2: () => {
      sockets[1].resumeSend();
    },
  };

  async function run(testFunc: () => {}) {
    try {
      await testFunc();
    } finally {
      client1.leave(roomName);
      client2.leave(roomName);
    }
  }

  return {
    root1: storageRoot1.root,
    root2: storageRoot2.root,
    assert,
    assertEach,
    socketUtils,
    run,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => {}, delay: number = 2000) {
  const result = predicate();
  if (result) {
    return true;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < delay) {
    await wait(100);
    if (predicate()) {
      return true;
    }
  }

  return false;
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

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqualWithMessage(expected: unknown, message: string): void;
    }
  }
}

expect.extend({
  toEqualWithMessage(received, expected, message) {
    if (this.isNot) {
      throw new Error(
        "toEqualWithMessage custom matcher didnt implement jest `not`"
      );
    }

    const options = {
      comment: "Object.equal equality",
      isNot: false,
      promise: this.promise,
    };

    const areEquals = isEqual(received, expected);
    if (areEquals) {
      return {
        message: () => "",
        pass: true,
      };
    } else {
      return {
        pass: false,
        message: () => {
          const diffString = diff(expected, received, {
            expand: this.expand,
          });

          return (
            this.utils.RECEIVED_COLOR(message) +
            "\n\n" +
            this.utils.matcherHint("toEqual", undefined, undefined, options) +
            "\n\n" +
            (diffString && diffString.includes("- Expect")
              ? `Difference:\n\n${diffString}`
              : `Expected: ${this.utils.printExpected(expected)}\n` +
                `Received: ${this.utils.printReceived(received)}`)
          );
        },
      };
    }
  },
});
