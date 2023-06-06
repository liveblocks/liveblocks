import "dotenv/config";

import fetch from "node-fetch";
import type { URL } from "url";
import WebSocket from "ws";

import type { Room } from "../src/room";
import type { LegacyConnectionStatus } from "../src/connection";
import type { BaseUserMeta } from "../src/protocol/BaseUserMeta";
import { withTimeout } from "../src/lib/utils";
import type { Json, JsonObject } from "../src/lib/Json";
import type { LiveObject } from "../src/crdts/LiveObject";
import type { LsonObject } from "../src/crdts/Lson";
import type { ToImmutable } from "../src/crdts/utils";
import { createClient } from "../src/client";

async function initializeRoomForTest<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(roomId: string, initialPresence: TPresence, initialStorage?: TStorage) {
  const publicApiKey = process.env.LIVEBLOCKS_PUBLIC_KEY;

  if (publicApiKey == null) {
    throw new Error('Environment variable "LIVEBLOCKS_PUBLIC_KEY" is missing.');
  }

  let ws: PausableWebSocket | null = null;

  class PausableWebSocket extends WebSocket {
    sendBuffer: string[] = [];
    _isSendPaused = false;

    constructor(address: string | URL) {
      super(address);
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

    send(data: string) {
      if (this._isSendPaused) {
        this.sendBuffer.push(data);
      } else {
        super.send(data);
      }
    }
  }

  const client = createClient({
    publicApiKey,
    polyfills: {
      // @ts-ignore-error
      fetch,
      WebSocket: PausableWebSocket,
    },
    liveblocksServer: process.env.LIVEBLOCKS_SERVER,
  });

  const room = client.enter<TPresence, TStorage, TUserMeta, TRoomEvent>(
    roomId,
    { initialPresence, initialStorage }
  );
  await waitUntilStatus(room, "open");

  return {
    client,
    room,
    get ws() {
      if (ws == null) {
        throw new Error("Websocket should be initialized at this point");
      }
      return ws;
    },
  };
}

/**
 * Join the same room with 2 different clients and stop sending socket messages when the storage is initialized
 */
export function prepareTestsConflicts<TStorage extends LsonObject>(
  initialStorage: TStorage,
  callback: (args: {
    root1: LiveObject<TStorage>;
    root2: LiveObject<TStorage>;
    room2: Room<never, TStorage, never, never>;
    room1: Room<never, TStorage, never, never>;

    /**
     * Assert that room1 and room2 storage are equal to the provided immutable
     * value. If the second parameter is omitted, we're assuming that both
     * rooms' storages are expected to be equal. It also ensures that immutable
     * states updated with the updates generated from conflicts are equal.
     */
    assert: (
      immRoot1: ToImmutable<TStorage>,
      immRoot2?: ToImmutable<TStorage>
    ) => void;
    wsUtils: {
      flushSocket1Messages: () => Promise<void>;
      flushSocket2Messages: () => Promise<void>;
    };
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

    const actor1 = await initializeRoomForTest<never, TStorage, never, never>(
      roomName,
      {} as never,
      initialStorage
    );
    const actor2 = await initializeRoomForTest<never, TStorage, never, never>(
      roomName,
      {} as never
    );

    const { root: root1 } = await actor1.room.getStorage();
    const { root: root2 } = await actor2.room.getStorage();

    const wsUtils = {
      flushSocket1Messages: async () => {
        actor1.ws.resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
      flushSocket2Messages: async () => {
        actor2.ws.resumeSend();
        // Waiting until every messages are received by all clients.
        // We don't have a public way to know if everything has been received so we have to rely on time
        await wait(1000);
      },
    };

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(1000);

    actor1.ws.pauseSend();
    actor2.ws.pauseSend();

    let immutableStorage1 = root1.toImmutable();
    let immutableStorage2 = root2.toImmutable();

    actor1.room.subscribe(
      root1,
      () => {
        immutableStorage1 = root1.toImmutable();
      },
      { isDeep: true }
    );
    actor2.room.subscribe(
      root2,
      () => {
        immutableStorage2 = root2.toImmutable();
      },
      { isDeep: true }
    );

    function assert(
      immRoot1: ToImmutable<TStorage>,
      immRoot2?: ToImmutable<TStorage>
    ) {
      if (immRoot2 == null) {
        immRoot2 = immRoot1;
      }

      expect(root1.toImmutable()).toEqual(immRoot1);
      expect(immutableStorage1).toEqual(immRoot1);
      expect(root2.toImmutable()).toEqual(immRoot2);
      expect(immutableStorage2).toEqual(immRoot2);
    }

    try {
      await callback({
        room1: actor1.room,
        room2: actor2.room,
        root1,
        root2,
        wsUtils,
        assert,
      });
      actor1.client.leave(roomName);
      actor2.client.leave(roomName);
    } catch (er) {
      actor1.client.leave(roomName);
      actor2.client.leave(roomName);
      throw er;
    }
  };
}

/**
 * Join a room and stop sending socket messages when the storage is initialized
 */
export function prepareSingleClientTest<TStorage extends LsonObject>(
  initialStorage: TStorage,
  callback: (args: {
    root: LiveObject<TStorage>;
    room: Room<never, TStorage, never, never>;
    flushSocketMessages: () => Promise<void>;
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + new Date().getTime();

    const actor = await initializeRoomForTest<never, TStorage, never, never>(
      roomName,
      {} as never,
      initialStorage
    );

    const { root } = await actor.room.getStorage();

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(1000);

    actor.ws.pauseSend();

    actor.ws.addEventListener("message", (message) => {
      console.log(message.data);
    });

    try {
      await callback({
        room: actor.room,
        root,
        flushSocketMessages: async () => {
          actor.ws.resumeSend();
          // Waiting until every messages are received by all clients.
          // We don't have a public way to know if everything has been received so we have to rely on time
          await wait(1000);
        },
      });
      actor.client.leave(roomName);
    } catch (er) {
      actor.client.leave(roomName);
      throw er;
    }
  };
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handy helper that allows to pause test execution until the room has
 * asynchronously reached a particular status. Status must be reached within
 * a limited time window, or else this will fail, to avoid hanging.
 */
async function waitUntilStatus(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  targetStatus: LegacyConnectionStatus
): Promise<void> {
  if (room.getConnectionState() === targetStatus) {
    return;
  }

  await withTimeout(
    room.events.connection.waitUntil((status) => status === targetStatus),
    5000,
    `Room did not reach connection status "${targetStatus}" within 5s`
  );
}
