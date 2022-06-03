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
import type { LsonObject, ToJson } from "../src/types";
import {
  type JsonStorageUpdate,
  serializeUpdateToJson,
} from "../test/updatesUtils";

/**
 * Join the same room with 2 different clients and stop sending socket messages when the storage is initialized
 */
export function prepareTestsConflicts<T extends LsonObject>(
  initialStorage: T,
  callback: (args: {
    root1: LiveObject<T>;
    root2: LiveObject<T>;
    room2: Room;
    room1: Room;
    updates1: JsonStorageUpdate[][];
    updates2: JsonStorageUpdate[][];
    /**
     * Assert that room1 and room2 storage are equals to the provided value (serialized to json)
     * If second parameter is ommited, we're assuming that both rooms' storage are equals
     * It also ensure that immutable states updated with the updates generated from conflicts are equals
     */
    assert: (jsonRoot1: ToJson<T>, jsonRoot2?: ToJson<T>) => void;
    wsUtils: {
      flushSocket1Messages: () => Promise<void>;
      flushSocket2Messages: () => Promise<void>;
    };
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const sockets: MockWebSocket[] = [];

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

    function createTestClient() {
      const publicApiKey = process.env.LIVEBLOCKS_PUBLIC_KEY;

      if (publicApiKey == null) {
        throw new Error(
          'Environment variable "LIVEBLOCKS_PUBLIC_KEY" is missing.'
        );
      }

      return createClient({
        publicApiKey,
        fetchPolyfill: fetch,
        WebSocketPolyfill: MockWebSocket,
        liveblocksServer: process.env.LIVEBLOCKS_SERVER,
      } as any);
    }

    const client1 = createTestClient();
    const client2 = createTestClient();

    const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

    const room1 = client1.enter(roomName, {
      initialStorage,
    });
    await waitFor(() => room1.getConnectionState() === "open");
    const room2 = client2.enter(roomName);
    await waitFor(() => room2.getConnectionState() === "open");

    const { root: root1 } = await room1.getStorage<T>();
    const { root: root2 } = await room2.getStorage<T>();

    function assert(jsonRoot1: ToJson<T>, jsonRoot2?: ToJson<T>) {
      if (jsonRoot2 == null) {
        jsonRoot2 = jsonRoot1;
      }

      expect(lsonToJson(root1)).toEqual(jsonRoot1);
      expect(immutableStorage1).toEqual(jsonRoot1);
      expect(lsonToJson(root2)).toEqual(jsonRoot2);
      expect(immutableStorage2).toEqual(jsonRoot2);
    }

    const socketUtils = {
      pauseAllSockets: () => {
        sockets[0].pauseSend();
        sockets[1].pauseSend();
      },
      flushSocket1Messages: async () => {
        sockets[0].resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
      flushSocket2Messages: async () => {
        sockets[1].resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
    };

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(1000);

    socketUtils.pauseAllSockets();

    let immutableStorage1 = liveObjectToJson(root1);
    let immutableStorage2 = liveObjectToJson(root2);

    const room1Updates: JsonStorageUpdate[][] = [];
    const room2Updates: JsonStorageUpdate[][] = [];

    room1.subscribe(
      root1,
      (updates) => {
        immutableStorage1 = patchImmutableObject(immutableStorage1, updates);
        room1Updates.push(updates.map(serializeUpdateToJson));
      },
      {
        isDeep: true,
      }
    );
    room2.subscribe(
      root2,
      (updates) => {
        immutableStorage2 = patchImmutableObject(immutableStorage2, updates);
        room2Updates.push(updates.map(serializeUpdateToJson));
      },
      { isDeep: true }
    );

    try {
      await callback({
        room1,
        room2,
        root1,
        root2,
        updates1: room1Updates,
        updates2: room2Updates,
        wsUtils: socketUtils,
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
