import "dotenv/config";

import fetch from "node-fetch";
import type { URL } from "url";
import { expect, onTestFinished } from "vitest";
import WebSocket from "ws";

import type { BaseMetadata, NoInfr } from "../src";
import { nanoid } from "../src";
import { createClient } from "../src/client";
import type { Status } from "../src/connection";
import type { LiveObject } from "../src/crdts/LiveObject";
import type { LsonObject } from "../src/crdts/Lson";
import type { ToImmutable } from "../src/crdts/utils";
import type { Json, JsonObject } from "../src/lib/Json";
import { wait, withTimeout } from "../src/lib/utils";
import type { BaseUserMeta } from "../src/protocol/BaseUserMeta";
import type { Room, RoomEventMessage } from "../src/room";
import { controlledPromise } from "../src/lib/controlledPromise";

async function initializeRoomForTest<
  P extends JsonObject = JsonObject,
  S extends LsonObject = LsonObject,
  U extends BaseUserMeta = BaseUserMeta,
  E extends Json = Json,
  M extends BaseMetadata = BaseMetadata,
>(roomId: string, initialPresence: NoInfr<P>, initialStorage: NoInfr<S>) {
  const publicApiKey = process.env.LIVEBLOCKS_PUBLIC_KEY;

  if (!publicApiKey) {
    throw new Error('Environment variable "LIVEBLOCKS_PUBLIC_KEY" is missing.');
  }

  let ws: PausableWebSocket | null = null;

  class PausableWebSocket extends WebSocket {
    sendBuffer: string[] = [];
    _isSendPaused = false;

    constructor(address: string | URL) {
      super(address);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      ws = this;
    }

    /**
     * Stops sending messages through to the server. Effectively starts
     * buffering messages in-memory until .resume() is called.
     */
    pause() {
      this._isSendPaused = true;
    }

    /**
     * Immediately sends all buffered messages to the server and stops
     * buffering any new messages.
     */
    resume() {
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

  const client = createClient<U>({
    __DANGEROUSLY_disableThrottling: true,
    publicApiKey,
    polyfills: {
      // @ts-expect-error fetch from Node isn't compatible?
      fetch,
      WebSocket: PausableWebSocket,
    },
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const { room, leave } = client.enterRoom<P, S, E, M>(roomId, {
    initialPresence,
    initialStorage,
  } as any);
  await waitUntilStatus(room, "connected");

  return {
    room,
    leave,
    get ws() {
      if (ws === null) {
        throw new Error("Websocket should be initialized at this point");
      }
      return ws;
    },
  };
}

/**
 * Client A and B join the same room and with given initial storage. Message
 * passing is explicitly timed in these tests, to control behavior exactly.
 *
 * Client A and B are set up not to use any throttling to make timing these
 * tests exactly is easier.
 *
 * Available utilities:
 * - wsUtils.flushSocket1Messages()  Sends network messages from Client A -> B,
 *                                   and waits for B to have processed them
 * - wsUtils.flushSocket2Messages()  Sends network messages from Client B -> A,
 *                                   and waits for B to have processed them
 *
 * To send messages from Client A -> Client B and wait for Client B to have received/processed them, use
 */
export function prepareTestsConflicts<S extends LsonObject>(
  initialStorage: S,
  callback: (args: {
    root1: LiveObject<S>;
    root2: LiveObject<S>;
    room2: Room<JsonObject, S>;
    room1: Room<JsonObject, S>;

    /**
     * Assert that room1 and room2 storage are equal to the provided immutable
     * value. If the second parameter is omitted, we're assuming that both
     * rooms' storages are expected to be equal. It also ensures that immutable
     * states updated with the updates generated from conflicts are equal.
     */
    assert: (immRoot1: ToImmutable<S>, immRoot2?: ToImmutable<S>) => void;
    wsUtils: {
      flushSocket1Messages: () => Promise<void>;
      flushSocket2Messages: () => Promise<void>;
    };
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + nanoid();

    const actor1 = await initializeRoomForTest<JsonObject, S>(
      roomName,
      {},
      initialStorage
    );
    const actor2 = await initializeRoomForTest<JsonObject, S>(
      roomName,
      {},
      {} as S
    );

    const { root: root1 } = await actor1.room.getStorage();
    const { root: root2 } = await actor2.room.getStorage();

    // We use a beacon system to ensure that all messages have been processed
    // by the other client. Each time we want to ensures that all messages have
    // been processed, we broadcast a beacon message, and wait until the other
    // client has received it. Because all operations are processed in order,
    // once the beacon is received, we know that all previous messages have
    // been processed as well.
    const beacons = new Map<string, () => void>();
    //                       /          \
    //                   beaconId    resolve callback

    function watchForBeacons({
      event,
    }: RoomEventMessage<JsonObject, BaseUserMeta, Json>) {
      if (
        event !== null &&
        typeof event === "object" &&
        "beacon" in event &&
        typeof event.beacon === "string"
      ) {
        // Find the beacon in the administration and settle it
        const resolve = beacons.get(event.beacon);
        if (resolve) {
          // HACK Still needed :(
          // Despite us using beacons for explicit synchronization, even though
          // at this point the messages have been _delivered_ to client B, it
          // does not necessarily mean the storage updates for those messages
          // have already been processed, because this could happen async.
          // Unfortunately there is no public API to know this has happened. It
          // typically happens within ~5 ms, so we'll wait a multitude of that
          // here, just to be sure.
          setTimeout(resolve, 30);
        }
        beacons.delete(event.beacon);
      }
    }

    onTestFinished(actor1.room.events.customEvent.subscribe(watchForBeacons));
    onTestFinished(actor2.room.events.customEvent.subscribe(watchForBeacons));

    function registerBeacon(beaconId: string) {
      const [p$, resolve] = controlledPromise<void>();
      beacons.set(beaconId, () => resolve());
      return p$;
    }

    const wsUtils = {
      flushSocket1Messages: async () => {
        const beaconId = nanoid();
        const beacon$ = registerBeacon(beaconId);
        actor1.room.broadcastEvent({ beacon: beaconId });

        // Now emit all buffered messages and immediately close the gates
        // again. The emitted messages will include our beacon message at the
        // end of the queue, ensuring that once actor2 receives the beacon, all
        // previous messages have been processed as well.
        actor1.ws.resume();
        actor1.ws.pause();

        await withTimeout(
          beacon$,
          2000,
          "Client B did not receive beacon from Client A within 2s"
        );
      },
      flushSocket2Messages: async () => {
        const beaconId = nanoid();
        const beacon$ = registerBeacon(beaconId);
        actor2.room.broadcastEvent({ beacon: beaconId });

        // Now emit all buffered messages and immediately close the gates
        // again. The emitted messages will include our beacon message at the
        // end of the queue, ensuring that once actor2 receives the beacon, all
        // previous messages have been processed as well.
        actor2.ws.resume();
        actor2.ws.pause();

        await withTimeout(
          beacon$,
          2000,
          "Client A did not receive beacon from Client B within 2s"
        );
      },
    };

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(600);

    actor1.ws.pause();
    actor2.ws.pause();

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
      immRoot1: ToImmutable<S>,
      immRoot2: ToImmutable<S> = immRoot1
    ) {
      try {
        expect(root1.toImmutable()).toEqual(immRoot1);
        expect(immutableStorage1).toEqual(immRoot1);
        expect(root2.toImmutable()).toEqual(immRoot2);

        expect(immutableStorage2).toEqual(immRoot2);
      } catch (error) {
        // Better stack trace (point to where assert is called instead)
        Error.captureStackTrace(error as Error, assert);
        throw error;
      }
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
      actor1.leave();
      actor2.leave();
    } catch (er) {
      actor1.leave();
      actor2.leave();
      throw er;
    }
  };
}

/**
 * Join a room and stop sending socket messages when the storage is initialized
 */
export function prepareSingleClientTest<S extends LsonObject>(
  initialStorage: S,
  callback: (args: {
    root: LiveObject<S>;
    room: Room<never, S, never, never, never>;
    flushSocketMessages: () => Promise<void>;
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const roomName = "storage-requirements-e2e-tests-" + nanoid();

    const actor = await initializeRoomForTest<never, S, never, never, never>(
      roomName,
      {} as never,
      initialStorage
    );

    const { root } = await actor.room.getStorage();

    // Waiting until every messages are received by all clients.
    // We don't have a public way to know if everything has been received so we have to rely on time
    await wait(600);

    actor.ws.pause();

    actor.ws.addEventListener("message", (_message) => {
      // console.log(message.data);
    });

    try {
      await callback({
        room: actor.room,
        root,
        flushSocketMessages: async () => {
          actor.ws.resume();
          // Waiting until every messages are received by all clients.
          // We don't have a public way to know if everything has been received so we have to rely on time
          await wait(600);
        },
      });
      actor.leave();
    } catch (er) {
      actor.leave();
      throw er;
    }
  };
}

/**
 * Handy helper that allows to pause test execution until the room has
 * asynchronously reached a particular status. Status must be reached within
 * a limited time window, or else this will fail, to avoid hanging.
 */
async function waitUntilStatus(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json, BaseMetadata>,
  targetStatus: Status
): Promise<void> {
  if (room.getStatus() === targetStatus) {
    return;
  }

  await withTimeout(
    room.events.status.waitUntil((status) => status === targetStatus),
    5000,
    `Room did not reach connection status "${targetStatus}" within 5s`
  );
}
