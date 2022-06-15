import "dotenv/config";

import type { ClientRequestArgs } from "http";
import fetch from "node-fetch";
import type { URL } from "url";
import WebSocket from "ws";

import type { Room } from "../src";
import { createClient } from "../src/client";
import {
  liveObjectToJson,
  lsonToJson,
  patchImmutableObject,
} from "../src/immutable";
import type { LiveObject } from "../src/LiveObject";
import type {
  Json,
  JsonObject,
  LsonObject,
  ToJson,
  UserMetadata,
} from "../src/types";

async function initializeRoomForTest<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends UserMetadata,
  TEvent extends Json
>(roomId: string, initialStorage?: TStorage) {
  const publicApiKey = process.env.LIVEBLOCKS_PUBLIC_KEY;

  if (publicApiKey == null) {
    throw new Error('Environment variable "LIVEBLOCKS_PUBLIC_KEY" is missing.');
  }

  let ws: MockWebSocket | null = null;

  class MockWebSocket extends WebSocket {
    sendBuffer: any[] = [];
    _isSendPaused = false;

    constructor(
      address: string | URL,
      protocols: WebSocket.ClientOptions | ClientRequestArgs | undefined
    ) {
      super(address, protocols);

      ws = this;
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

  const client = createClient({
    publicApiKey,
    fetchPolyfill: fetch,
    WebSocketPolyfill: MockWebSocket,
    liveblocksServer: process.env.LIVEBLOCKS_SERVER,
  } as any);

  const room = client.enter<TPresence, TStorage, TUserMeta, TEvent>(roomId, {
    initialStorage,
  });
  await waitFor(() => room.getConnectionState() === "open");

  if (ws == null) {
    throw new Error("Websocket should be initialized at this point");
  }

  return {
    client,
    room,
    ws: ws as MockWebSocket, // TODO: Find out why casting is necessary
  };
}

/**
 * Join the same room with 2 different clients and stop sending socket messages when the storage is initialized
 */
export function prepareTestsConflicts<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends UserMetadata = never,
  TEvent extends Json = never
>(
  initialStorage: TStorage,
  callback: (args: {
    root1: LiveObject<TStorage>;
    root2: LiveObject<TStorage>;
    room2: Room<TPresence, TStorage, TUserMeta, TEvent>;
    room1: Room<TPresence, TStorage, TUserMeta, TEvent>;

    /**
     * Assert that room1 and room2 storage are equals to the provided value (serialized to json)
     * If second parameter is ommited, we're assuming that both rooms' storage are equals
     * It also ensure that immutable states updated with the updates generated from conflicts are equals
     */
    assert: (jsonRoot1: ToJson<TStorage>, jsonRoot2?: ToJson<TStorage>) => void;
    wsUtils: {
      flushSocket1Messages: () => Promise<void>;
      flushSocket2Messages: () => Promise<void>;
    };
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

    const {
      client: client1,
      room: room1,
      ws: ws1,
    } = await initializeRoomForTest<TPresence, TStorage, TUserMeta, TEvent>(
      roomName,
      initialStorage
    );
    const {
      client: client2,
      room: room2,
      ws: ws2,
    } = await initializeRoomForTest<TPresence, TStorage, TUserMeta, TEvent>(
      roomName
    );

    const { root: root1 } = await room1.getStorage();
    const { root: root2 } = await room2.getStorage();

    function assert(jsonRoot1: ToJson<TStorage>, jsonRoot2?: ToJson<TStorage>) {
      if (jsonRoot2 == null) {
        jsonRoot2 = jsonRoot1;
      }

      expect(lsonToJson(root1)).toEqual(jsonRoot1);
      expect(immutableStorage1).toEqual(jsonRoot1);
      expect(lsonToJson(root2)).toEqual(jsonRoot2);
      expect(immutableStorage2).toEqual(jsonRoot2);
    }

    const wsUtils = {
      flushSocket1Messages: async () => {
        ws1.resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
      flushSocket2Messages: async () => {
        ws2.resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
    };

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(1000);

    ws1.pauseSend();
    ws2.pauseSend();

    let immutableStorage1 = liveObjectToJson(root1);
    let immutableStorage2 = liveObjectToJson(root2);

    room1.subscribe(
      root1,
      (updates) => {
        immutableStorage1 = patchImmutableObject(immutableStorage1, updates);
      },
      {
        isDeep: true,
      }
    );
    room2.subscribe(
      root2,
      (updates) => {
        immutableStorage2 = patchImmutableObject(immutableStorage2, updates);
      },
      { isDeep: true }
    );

    try {
      await callback({
        room1,
        room2,
        root1,
        root2,
        wsUtils,
        assert,
      });
      client1.leave(roomName);
      client2.leave(roomName);
    } catch (er) {
      client1.leave(roomName);
      client2.leave(roomName);
      throw er;
    }
  };
}

/**
 * Join a room and stop sending socket messages when the storage is initialized
 */
export function prepareSingleClientTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends UserMetadata = never,
  TEvent extends Json = never
>(
  initialStorage: TStorage,
  callback: (args: {
    root: LiveObject<TStorage>;
    room: Room<TPresence, TStorage, TUserMeta, TEvent>;
    /**
     * Assert that room storage is equal to the provided json
     */
    // assert: (jsonRoot: ToJson<TStorage>) => void;
    flushSocketMessages: () => Promise<void>;
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

    const { client, room, ws } = await initializeRoomForTest<
      TPresence,
      TStorage,
      TUserMeta,
      TEvent
    >(roomName, initialStorage);

    const { root } = await room.getStorage();

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(1000);

    ws.pauseSend();

    ws.addEventListener("message", (message) => {
      console.log(message.data);
    });

    try {
      await callback({
        room,
        root,
        flushSocketMessages: async () => {
          ws.resumeSend();
          // Waiting until every messages are received by all clients.
          // We don't have a public way to know if everything has been received so we have to rely on time
          await wait(1000);
        },
      });
      client.leave(roomName);
    } catch (er) {
      client.leave(roomName);
      throw er;
    }
  };
}

export function wait(ms: number) {
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
