import { expect, onTestFinished } from "vitest";
import WebSocket from "ws";

import type { BaseMetadata, NoInfr } from "../src";
import { nanoid } from "../src";
import { createClient } from "../src/client";
import type { Status } from "../src/connection";
import { isLiveStructure } from "../src/crdts/liveblocks-helpers";
import type { LiveObject } from "../src/crdts/LiveObject";
import type { LsonObject, ToJson } from "../src/crdts/Lson";
import { controlledPromise } from "../src/lib/controlledPromise";
import type { Json, JsonObject } from "../src/lib/Json";
import { mapValues, wait, withTimeout } from "../src/lib/utils";
import type { BaseUserMeta } from "../src/protocol/BaseUserMeta";
import type { Room, RoomEventMessage } from "../src/room";

const BASE_URL = `http://localhost:${process.env.LIVEBLOCKS_DEV_SERVER_PORT ?? 1154}`;

async function initializeRoomForTest<
  P extends JsonObject = JsonObject,
  S extends LsonObject = LsonObject,
  U extends BaseUserMeta = BaseUserMeta,
  E extends Json = Json,
  TM extends BaseMetadata = BaseMetadata,
  CM extends BaseMetadata = BaseMetadata,
>(roomId: string, initialPresence: NoInfr<P>, initialStorage: NoInfr<S>) {
  let ws: ControlledWebSocket | null = null;

  /**
   * A WebSocket whose two directions can each be stalled, like a real
   * network pipe. A stalled direction buffers frames FIFO; un-stalling
   * delivers them in their original order, so the stream order can never be
   * changed by these controls, only delayed.
   *
   * All state is per-socket. A reconnect creates a fresh, unstalled socket,
   * and whatever was still buffered on the old socket is simply never
   * delivered: those frames were in flight when the connection died.
   */
  class ControlledWebSocket extends WebSocket {
    // When non-null, the direction is stalled and the array buffers its
    // frames, in order. When null, frames flow through.
    sendBuffer: string[] | null = null;
    recvBuffer: unknown[][] | null = null;

    constructor(address: string | URL) {
      super(address);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      ws = this;
    }

    /**
     * Stalls the uplink: outgoing messages are buffered in-memory instead of
     * sent, until .resume() is called. Models a slow upload or backpressure.
     */
    pause() {
      this.sendBuffer ??= [];
    }

    /**
     * Stalls the downlink: messages the server sends are buffered instead of
     * delivered, until .resumeIncoming() is called. Models slow delivery.
     *
     * Stalling the downlink and then reconnecting simulates "the server
     * received and processed our op, but its ack/echo never reached us": the
     * buffered ack dies with the socket, and the op stays pending
     * (unacknowledged) on this client across the reconnect.
     */
    pauseIncoming() {
      this.recvBuffer ??= [];
    }

    /**
     * Immediately sends all buffered messages to the server, in order, and
     * stops buffering any new messages.
     */
    resume() {
      const sendBuffer = this.sendBuffer;
      this.sendBuffer = null;
      for (const item of sendBuffer ?? []) {
        super.send(item);
      }
    }

    /**
     * Immediately delivers all buffered incoming messages, in order, and
     * stops buffering any new ones.
     */
    resumeIncoming() {
      const recvBuffer = this.recvBuffer;
      this.recvBuffer = null;
      for (const args of recvBuffer ?? []) {
        super.emit("message", ...args);
      }
    }

    send(data: string) {
      if (this.sendBuffer !== null) {
        this.sendBuffer.push(data);
      } else {
        super.send(data);
      }
    }

    // `ws` delivers incoming frames by emitting a "message" event (both
    // addEventListener and .on() listeners run through this). Buffer those
    // emissions while the downlink is stalled, leaving every other event
    // untouched.
    emit(eventName: string | symbol, ...args: any[]): boolean {
      if (this.recvBuffer !== null && eventName === "message") {
        this.recvBuffer.push(args);
        return false;
      }
      return super.emit(eventName, ...args);
    }
  }

  const client = createClient<U>({
    __DANGEROUSLY_disableThrottling: true,
    publicApiKey: "pk_localdev",
    polyfills: {
      WebSocket: ControlledWebSocket,
    },
    baseUrl: BASE_URL,
  });

  const { room, leave } = client.enterRoom<P, S, E, TM, CM>(roomId, {
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
    assert: (immRoot1: ToJson<S>, immRoot2?: ToJson<S>) => void;
    /** Test utilities to exactly control message passing */
    control: {
      /**
       * Flushes all messages from Client A and waits until Client B has
       * received them.
       * Note that this will hang if client B's downlink has been stalled, as
       * it's unable to receive any messages until resumed.
       */
      // TODO: Rename to flushAtoB() later
      flushA: () => Promise<void>;
      /**
       * Flushes all messages from Client B and waits until Client A has
       * received them.
       * Note that this will hang if client A's downlink has been stalled, as
       * it's unable to receive any messages until resumed.
       */
      // TODO: Rename to flushBtoA() later
      flushB: () => Promise<void>;
      /**
       * Flushes Client A's buffered sends to the server (unlike flushA,
       * without waiting for any confirmation).
       */
      // TODO: Rename to flushToServerA() later
      flushSyncA: () => void;
      /**
       * Flushes Client B's buffered sends to the server (unlike flushB,
       * without waiting for any confirmation).
       */
      // TODO: Rename to flushToServerB() later
      flushSyncB: () => void;
      /**
       * Stalls client A's uplink: outgoing messages buffer in order instead
       * of being sent, until the next flush. Note that this stalls the
       * *current* socket; a socket freshly created by a reconnect starts
       * unstalled.
       */
      pauseA: () => void;
      /** Same as pauseA, for client B. */
      pauseB: () => void;
      /**
       * Stalls client A's downlink: messages from the server buffer in order
       * instead of being delivered, until resumeIncomingA(). Stalled messages
       * die with the socket, so following this up with a reconnect simulates
       * "the server processed our op, but its ack never reached us".
       */
      pauseIncomingA: () => void;
      /** Same as pauseIncomingA, for client B. */
      pauseIncomingB: () => void;
      /** Delivers client A's stalled incoming messages, and stops stalling. */
      resumeIncomingA: () => void;
      /** Delivers client B's stalled incoming messages, and stops stalling. */
      resumeIncomingB: () => void;
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
          setTimeout(resolve, 50);
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

    const control = {
      flushA: async () => {
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
          8000,
          "Client B did not receive beacon from Client A within 8s"
        );
      },

      flushB: async () => {
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
          8000,
          "Client A did not receive beacon from Client B within 8s"
        );
      },

      flushSyncA: () => {
        actor1.ws.resume();
        actor1.ws.pause();
      },

      flushSyncB: () => {
        actor2.ws.resume();
        actor2.ws.pause();
      },

      pauseA: () => actor1.ws.pause(),
      pauseB: () => actor2.ws.pause(),
      pauseIncomingA: () => actor1.ws.pauseIncoming(),
      pauseIncomingB: () => actor2.ws.pauseIncoming(),
      resumeIncomingA: () => actor1.ws.resumeIncoming(),
      resumeIncomingB: () => actor2.ws.resumeIncoming(),
    };

    // TODO Maybe make this the default behavior of the ControlledWebSocket
    // class, and clearly document this. _Send_ is paused by default, but
    // _recv_ is not. I think that'd be a nice default?
    // TODO Not super sure though how it related to the one-time sync below.
    actor1.ws.pause();
    actor2.ws.pause();

    // Ensure both clients have synchronized initial storage before starting the test
    await Promise.all([control.flushA(), control.flushB()]);

    const expectedStorage = mapValues(initialStorage, (value) =>
      isLiveStructure(value) ? value.toJSON() : value
    );
    let immutableStorage1 = root1.toJSON();
    let immutableStorage2 = root2.toJSON();

    // Initial storage should be equal at the start of the test
    expect(immutableStorage1).toEqual(expectedStorage);
    expect(immutableStorage2).toEqual(immutableStorage1);

    actor1.room.subscribe(
      root1,
      () => {
        immutableStorage1 = root1.toJSON();
      },
      { isDeep: true }
    );
    actor2.room.subscribe(
      root2,
      () => {
        immutableStorage2 = root2.toJSON();
      },
      { isDeep: true }
    );

    function assert(immRoot1: ToJson<S>, immRoot2: ToJson<S> = immRoot1) {
      try {
        expect({ root1: root1.toJSON() }).toEqual({ root1: immRoot1 });
        expect(immutableStorage1).toEqual(immRoot1);
        expect({ root2: root2.toJSON() }).toEqual({ root2: immRoot2 });
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
        control,
        assert,
      });
      actor1.leave();
      actor2.leave();
    } catch (er) {
      // Surface the full storage pool of both clients (every node, its parent,
      // its position key, and its value) so convergence failures are debuggable
      // from the test output alone.
      console.error(
        `\n=== Storage pool dump on failure ===\n${actor1.room._dump()}\n\n${actor2.room._dump()}\n`
      );
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
    await wait(200);

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
          await wait(200);
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
export async function waitUntilStatus(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json, BaseMetadata>,
  targetStatus: Status
): Promise<void> {
  if (room.getStatus() === targetStatus) {
    return;
  }

  await withTimeout(
    room.events.status.waitUntil((status) => status === targetStatus),
    20000,
    `Room did not reach connection status "${targetStatus}" within 20s`
  );
}
