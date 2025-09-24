import { assertEq, assertSame } from "tosti";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type MockInstance,
  onTestFinished,
  test,
  vi,
} from "vitest";

import { createApiClient } from "../api-client";
import { type AuthValue, createAuthManager } from "../auth-manager";
import { StopRetrying } from "../connection";
import { DEFAULT_BASE_URL } from "../constants";
import { LiveList } from "../crdts/LiveList";
import { LiveMap } from "../crdts/LiveMap";
import { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import type { StorageUpdate } from "../crdts/StorageUpdates";
import { legacy_patchImmutableObject, lsonToJson } from "../immutable";
import { kInternal } from "../internal";
import { nn } from "../lib/assert";
import { makeEventSource } from "../lib/EventSource";
import * as console from "../lib/fancy-console";
import type { Json, JsonObject } from "../lib/Json";
import { Signal } from "../lib/signals";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import { ClientMsgCode } from "../protocol/ClientMsg";
import type { BaseMetadata } from "../protocol/Comments";
import { OpCode } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import { ServerMsgCode } from "../protocol/ServerMsg";
import type { RoomConfig, RoomDelegates } from "../room";
import { createRoom } from "../room";
import { WebsocketCloseCodes } from "../types/IWebSocket";
import type { LiveblocksError } from "../types/LiveblocksError";
import type { User } from "../types/User";
import {
  AUTH_SUCCESS,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
  SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE,
  SOCKET_NO_BEHAVIOR,
  SOCKET_REFUSES,
  SOCKET_SEQUENCE,
  SOCKET_THROWS,
} from "./_behaviors";
import { listUpdate, listUpdateInsert, listUpdateSet } from "./_updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIRST_POSITION,
  makeSyncSource,
  prepareDisconnectedStorageUpdateTest,
  prepareIsolatedStorageTest,
  prepareRoomWithStorage_loadWithDelay,
  prepareStorageTest,
  prepareStorageUpdateTest,
  serverMessage,
} from "./_utils";
import {
  waitUntilCustomEvent,
  waitUntilOthersEvent,
  waitUntilStatus,
  waitUntilStorageUpdate,
} from "./_waitUtils";

const THROTTLE_DELAY = 100;

const mockedCreateSocketDelegate = (_authValue: AuthValue) => {
  return new WebSocket("");
};

function createDefaultRoomConfig<M extends BaseMetadata>(): RoomConfig<M> {
  return {
    enableDebugLogging: false,
    roomId: "room-id",
    throttleDelay: THROTTLE_DELAY,
    lostConnectionTimeout: 99999,
    baseUrl: DEFAULT_BASE_URL,
    errorEventSource: makeEventSource<LiveblocksError>(),
    delegates: {
      authenticate: () => {
        return Promise.resolve({ publicApiKey: "pk_123", type: "public" });
      },
      createSocket: mockedCreateSocketDelegate,
    },
    roomHttpClient: createApiClient({
      baseUrl: DEFAULT_BASE_URL,
      fetchPolyfill: globalThis.fetch?.bind(globalThis),
      authManager: createAuthManager({
        authEndpoint: "/api/auth",
      }),
      currentUserId: new Signal<string | undefined>(undefined),
    }),
    // Not used in unit tests (yet)
    createSyncSource: makeSyncSource,
  };
}

function makeRoomConfig<M extends BaseMetadata>(
  mockedDelegates: RoomDelegates,
  defaults?: Partial<RoomConfig<M>>
): RoomConfig<M> {
  return {
    ...createDefaultRoomConfig<M>(),
    ...defaults,
    delegates: mockedDelegates,
  };
}

/**
 * Sets up a Room instance that, when you call `.connect()` on it, will
 * successfully connect to the WebSocket server `wss`, which you can
 * control/observe.
 */
function createTestableRoom<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(
  initialPresence: P,
  authBehavior = AUTH_SUCCESS,
  socketBehavior = SOCKET_AUTOCONNECT_AND_ROOM_STATE(),
  config?: Partial<RoomConfig<M>>,
  initialStorage?: S
) {
  const { wss, delegates } = defineBehavior(authBehavior, socketBehavior);

  const roomConfig = makeRoomConfig(delegates, config);
  const room = createRoom<P, S, U, E, M>(
    { initialPresence, initialStorage: initialStorage ?? ({} as S) },
    roomConfig
  );

  return {
    room,
    delegates,
    /**
     * The fake WebSocket server backend that these unit tests connect to.
     */
    wss,
    errorEventSource: roomConfig.errorEventSource,
  };
}

describe("room / auth", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("when auth-manager throws StopRetrying error - should fail", async () => {
    const config = {
      ...makeRoomConfig({
        authenticate: () => {
          return new Promise((_resolve) => {
            throw new StopRetrying("Unauthorized: No access");
          });
        },
        createSocket: mockedCreateSocketDelegate,
      }),
    };
    const room = createRoom(
      {
        initialPresence: {},
        initialStorage: {},
      },
      config
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(config.errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "disconnected");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Unauthorized: No access");
    assertEq(err.message, "Unauthorized: No access");
    assertEq(err.context.code, -1); // Not a WebSocket close code
    room.destroy();
  });
});

describe("room", () => {
  test("connect should transition to authenticating if closed and execute authenticate", () => {
    const { room, delegates } = createTestableRoom({});
    assertEq(delegates.authenticate.mock.calls, []);
    room.connect();
    assertEq(room.getStatus(), "connecting");
    assertEq(delegates.authenticate.mock.calls, [[]]);
    assertEq(delegates.createSocket.mock.calls, []);
  });

  test("connect should stay authenticating if connect is called multiple times and call authenticate only once", () => {
    const { room, delegates } = createTestableRoom({});
    room.connect();
    assertEq(room.getStatus(), "connecting");
    room.connect();
    room.connect();
    room.connect();
    assertEq(room.getStatus(), "connecting");
    assertEq(delegates.authenticate.mock.calls, [[]]);
    assertEq(delegates.createSocket.mock.calls, []);
  });

  test("authentication success should transition to connecting", async () => {
    const { room } = createTestableRoom({});
    assertEq(room.getStatus(), "initial");

    room.connect();
    assertEq(room.getStatus(), "connecting");
    await waitUntilStatus(room, "connected");
    assertEq(room.getStatus(), "connected");
  });

  test("should fall back to get a new token if socket cannot connect (initially)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_THROWS("😈"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Repeats infinitely
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected");

    assertEq(delegates.authenticate.mock.calls.length, 2); // It re-authed!
    assertEq(delegates.createSocket.mock.calls.length, 2);
  });

  test("should fall back to get a new token if socket cannot connect (when reconnecting)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_AUTOCONNECT_AND_ROOM_STATE(),
        SOCKET_THROWS("😈"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Repeats infinitely
      )
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_ABNORMAL,
        wasClean: false,
      })
    );

    await waitUntilStatus(room, "reconnecting");
    await waitUntilStatus(room, "connected");

    // Because the socket cannot establish a connection (no network, or an
    // non-2xx HTTP response), we cannot know what the issue is. It could be
    // because the token is invalid or expired, aka a HTTP 403. But it could
    // also be something else. In the HTTP 403 case, we would _definitely_ need
    // to reauthorize. But since we don't know, we cannot optimize and must
    // assume we have to. Once the backend starts to refuse (aka
    // accept-then-immediately-close) WebSocket connections, then we would be
    // able to know.
    assertEq(delegates.authenticate.mock.calls.length, 2); // It re-authed!
    assertEq(delegates.createSocket.mock.calls.length, 3);
  });

  test("should not reauth when getting an unknown server response in the 42xx range (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        // @ts-expect-error We're testing unknown codes
        SOCKET_REFUSES(4242 /* Unknown code */, "An unknown error reason"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Repeated to infinity
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected", 4000);

    assertEq(delegates.authenticate.mock.calls.length, 1); // No reauth!
    assertEq(delegates.createSocket.mock.calls.length, 2);
  });

  test("should reauth when getting an unknown server response in the 43xx range (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        // @ts-expect-error We're testing unknown codes
        SOCKET_REFUSES(4342 /* Unknown code */, "An unknown error reason"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Repeated to infinity
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected", 4000);

    assertEq(delegates.authenticate.mock.calls.length, 2); // Reauth!
    assertEq(delegates.createSocket.mock.calls.length, 2);
  });

  test("should reconnect without getting a new auth token when told by server that room is full (as refusal)", async () => {
    const { room, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_REFUSES(
        WebsocketCloseCodes.MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM,
        "room full"
      )
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "disconnected");

    assertEq(delegates.authenticate.mock.calls.length, 1);
    assertEq(delegates.createSocket.mock.calls.length, 1);
    assertEq(err.message, "room full");
    expect(err.context.code).toEqual(
      4005 /* MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM */
    );
  });

  test("should reconnect without getting a new auth token when told by server that room is full (while connected)", async () => {
    const { room, wss, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_AND_ROOM_STATE()
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM,
        reason: "room full",
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "disconnected");

    assertEq(delegates.authenticate.mock.calls.length, 1);
    assertEq(delegates.createSocket.mock.calls.length, 1);
    assertEq(err.message, "room full");
    expect(err.context.code).toEqual(
      4005 /* MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM */
    );
  });

  test("should reauth immediately when told by server that token is expired (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_REFUSES(WebsocketCloseCodes.TOKEN_EXPIRED, "Token expired"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE() // Repeated to infinity
      )
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    // First connection attempt was rejected, but second worked
    assertEq(delegates.authenticate.mock.calls.length, 2);
    assertEq(delegates.createSocket.mock.calls.length, 2);
  });

  test("should reauth immediately when told by server that token is expired (while connected)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_AND_ROOM_STATE()
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    assertEq(delegates.authenticate.mock.calls.length, 1);
    assertEq(delegates.createSocket.mock.calls.length, 1);

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.TOKEN_EXPIRED,
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "reconnecting");
    await waitUntilStatus(room, "connected");

    assertEq(delegates.authenticate.mock.calls.length, 2);
    assertEq(delegates.createSocket.mock.calls.length, 2);
  });

  test("should stop trying and disconnect if unauthorized (as refusal)", async () => {
    const { room, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_REFUSES(WebsocketCloseCodes.NOT_ALLOWED, "whatever")
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "disconnected");

    assertEq(delegates.authenticate.mock.calls.length, 1); // Only once!
    assertEq(delegates.createSocket.mock.calls.length, 1);

    assertEq(err.message, "whatever");
    expect(err.context.code).toEqual(4001 /* NOT_ALLOWED */);
  });

  test("should stop trying and disconnect if unauthorized (while connected)", async () => {
    const { room, wss, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_AND_ROOM_STATE()
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.NOT_ALLOWED,
        reason: "whatever",
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "disconnected");

    assertEq(delegates.authenticate.mock.calls.length, 1); // Only once!
    assertEq(delegates.createSocket.mock.calls.length, 1);
    assertEq(err.message, "whatever");
    expect(err.context.code).toEqual(4001 /* NOT_ALLOWED */);
  });

  test("should disconnect if told by server to not try reconnecting again (as refusal)", async () => {
    const { room, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_REFUSES(WebsocketCloseCodes.CLOSE_WITHOUT_RETRY, "whaever"),
        SOCKET_AUTOCONNECT_AND_ROOM_STATE()
      )
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    // Will try to reconnect, then gets refused, then disconnects
    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "disconnected", 4000);

    assertEq(delegates.authenticate.mock.calls.length, 1); // Only once!
    assertEq(delegates.createSocket.mock.calls.length, 1);
    assertEq(err.message, "whaever");
    expect(err.context.code).toEqual(4999 /* CLOSE_WITHOUT_RETRY */);
  });

  test("should disconnect if told by server to not try reconnecting again (while connected)", async () => {
    const { room, wss, delegates, errorEventSource } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_AND_ROOM_STATE()
    );
    room.connect();

    let err = {} as LiveblocksError;
    onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_WITHOUT_RETRY,
        reason: "wha'er",
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "disconnected");

    assertEq(delegates.authenticate.mock.calls.length, 1); // It re-authed!
    assertEq(delegates.createSocket.mock.calls.length, 1);
    assertEq(err.message, "wha'er");
    expect(err.context.code).toEqual(4999 /* CLOSE_WITHOUT_RETRY */);
  });

  test("initial presence should be sent once the connection is open", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });

    room.connect();
    await waitUntilStatus(room, "connecting");
    assertEq(wss.receivedMessages, []);

    await waitUntilStatus(room, "connected");
    assertEq(wss.receivedMessages, [
      [
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { x: 0 },
        },
      ],
    ]);
  });

  test("if presence has been updated before the connection, it should be sent when the connection is ready", async () => {
    const { room, wss } = createTestableRoom({});
    room.updatePresence({ x: 0 });
    room.connect();

    await waitUntilStatus(room, "connected");
    assertEq(wss.receivedMessages, [
      [
        {
          type: ClientMsgCode.UPDATE_PRESENCE,
          targetActor: -1,
          data: { x: 0 },
        },
      ],
    ]);
  });

  test("if no presence has been set before the connection is open, an empty presence should be sent", async () => {
    const { room, wss } = createTestableRoom({} as never);
    room.connect();

    await waitUntilStatus(room, "connected");
    assertEq(wss.receivedMessages, [
      [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
    ]);
  });

  test("initial presence followed by updatePresence should delay sending the second presence event", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });
    room.connect();

    assertEq(wss.receivedMessages, []);
    await waitUntilStatus(room, "connected");

    assertSame(wss.receivedMessages.length, 1);
    assertEq(wss.receivedMessages[0], [
      { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: { x: 0 } },
    ]);

    vi.useFakeTimers();
    try {
      const now = Date.now();

      // Forward the system clock by 30 millis
      vi.setSystemTime(now + 30);
      room.updatePresence({ x: 1 });
      vi.setSystemTime(now + 35);
      room.updatePresence({ x: 2 }); // These calls should get batched and flushed later

      await vi.advanceTimersByTimeAsync(0);
      assertSame(wss.receivedMessages.length, 1); // Still no new data received
      assertEq(room[kInternal].presenceBuffer, { x: 2 });

      // Forwarding time by the flush threshold will trigger the future flush
      await vi.advanceTimersByTimeAsync(THROTTLE_DELAY);

      assertSame(wss.receivedMessages.length, 2);
      assertEq(wss.receivedMessages[1], [
        { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 2 } },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("should replace current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    assertEq(room.getPresence(), { x: 0 });
    assertEq(room[kInternal].presenceBuffer, { x: 0 });
  });

  test("should merge current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    assertEq(room.getPresence(), { x: 0 });
    assertEq(room[kInternal].presenceBuffer, { x: 0 });

    room.updatePresence({ y: 0 });
    assertEq(room.getPresence(), { x: 0, y: 0 });
    assertEq(room[kInternal].presenceBuffer, { x: 0, y: 0 });
  });

  test("others should be iterable", async () => {
    const { room, wss } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 2,
          nonce: "nonce-for-actor-2",
          scopes: ["room:write"],
          users: {
            "1": { scopes: ["room:write"] },
          },
        })
      );

      conn.server.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0, // Setting targetActor means this is a full presence update
        })
      );
    });

    await waitUntilOthersEvent(room);

    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
    ]);
  });

  test("others should be read-only when associated scopes are received", async () => {
    const { room, wss } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 2,
          nonce: "nonce-for-actor-2",
          scopes: ["room:write"],
          users: {
            "1": { scopes: ["room:read"] },
          },
        })
      );

      conn.server.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0, // Setting targetActor means this is a full presence update
        })
      );
    });

    await waitUntilOthersEvent(room);

    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: true,
        canWrite: false,
        canComment: false,
      },
    ]);
  });

  test("should clear users after the client is disconnected for a certain amount of time", async () => {
    const { room, wss } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE, SOCKET_THROWS()),
      { lostConnectionTimeout: 10 }
    );
    room.connect();

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 2,
          nonce: "nonce-for-actor-2",
          scopes: ["room:write"],
          users: {
            "1": { scopes: ["room:write"] },
          },
        })
      );

      conn.server.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0, // Setting targetActor means this is a full presence update
        })
      );
    });

    await waitUntilStatus(room, "connected");
    await waitUntilOthersEvent(room);
    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
    ]);

    // Closing this connection will trigger an endless retry loop, because the
    // server is configured with a SOCKET_CONNECT_ONLY_ONCE strategy.
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_ABNORMAL,
        wasClean: false,
      })
    );

    // Not immediately cleared
    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
    ]);

    // But it will clear eventually (after lostConnectionTimeout milliseconds)
    await waitUntilOthersEvent(room);
    assertEq(room.getOthers(), []);
  });

  test("should clear users not present in server message ROOM_STATE", async () => {
    /*
    Scenario:
    - Client A (room) and Client B (refRoom) are connected to the room.
    - Client A computer goes to sleep, it doesn't properly close. It still has client B in others.
    - Client B computer goes to sleep, it doesn't properly close.
    - After 2 minutes, the server clears client A and B from its list of users.
    - After some time, Client A computer awakes, it still has Client B in "others", client reconnects to the room.
    - The server returns the message ROOM_STATE with no user (as expected).
    - Client A should remove client B from others.
    */

    const { room, wss } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 3,
          nonce: "nonce-for-actor-3",
          scopes: ["room:write"],
          users: {
            "1": { scopes: ["room:write"] },
            "2": { scopes: ["room:write"] },
          },
        })
      );

      // Client B
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0,
        })
      );

      // Client C
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 2,
          targetActor: 0,
        })
      );
    });

    await waitUntilOthersEvent(room);
    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
      {
        connectionId: 2,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
    ]);

    // -----
    // Client C was inactive and was removed by the server.
    // -----

    // Client reconnects to the room, and receives a new ROOM_STATE msg from the server.
    assertSame(wss.connections.size, 1);
    wss.last.send(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        actor: 2,
        nonce: "nonce-for-actor-2",
        scopes: ["room:write"],
        users: {
          "1": { scopes: ["room:write"] },
        },
      })
    );

    // Only Client B is part of others.
    assertEq(room.getOthers(), [
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      },
    ]);
  });

  describe("broadcast", () => {
    test("should send event to other users", async () => {
      const { room, wss } = createTestableRoom({});
      room.connect();

      await waitUntilStatus(room, "connected");
      assertEq(wss.receivedMessages, [
        [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
      ]);

      const now = Date.now();
      vi.useFakeTimers();
      try {
        // Event payload can be any JSON value
        vi.setSystemTime(now + 1000);
        room.broadcastEvent({ type: "EVENT" });
        vi.setSystemTime(now + 2000);
        room.broadcastEvent([1, 2, 3]);
        vi.setSystemTime(now + 3000);
        room.broadcastEvent(42);
        vi.setSystemTime(now + 4000);
        room.broadcastEvent("hi");
      } finally {
        vi.useRealTimers();
      }

      assertEq(wss.receivedMessages[1], [
        { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
      ]);
      assertEq(wss.receivedMessages[2], [
        { type: ClientMsgCode.BROADCAST_EVENT, event: [1, 2, 3] },
      ]);
      assertEq(wss.receivedMessages[3], [
        { type: ClientMsgCode.BROADCAST_EVENT, event: 42 },
      ]);
      assertEq(wss.receivedMessages[4], [
        { type: ClientMsgCode.BROADCAST_EVENT, event: "hi" },
      ]);
    });

    test("should not send event to other users if not connected", async () => {
      const { room, wss } = createTestableRoom({});

      room.broadcastEvent({ type: "EVENT" });
      assertEq(wss.receivedMessages, []);

      room.connect();
      await waitUntilStatus(room, "connected");

      assertEq(wss.receivedMessages, [
        [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
      ]);
    });

    test("should queue event if socket is not ready and shouldQueueEventsIfNotReady is true", async () => {
      const { room, wss } = createTestableRoom({});

      room.broadcastEvent(
        { type: "EVENT" },
        { shouldQueueEventIfNotReady: true }
      );
      assertEq(wss.receivedMessages, []);

      room.connect();
      await waitUntilStatus(room, "connected");

      assertEq(wss.receivedMessages, [
        [
          { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
          { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
        ],
      ]);
    });
  });

  test("missing storage keys should be properly initialized using initialStorage", async () => {
    const initialPresence = {};
    const initialStorage = { foo: 1234 };
    const { room, wss } = createTestableRoom(
      initialPresence,
      undefined,
      undefined,
      undefined,
      initialStorage
    );

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: {} }]],
        })
      );
    });

    room.connect();
    const storage = await room.getStorage();
    assertEq(storage.root.toObject(), { foo: 1234 });
    //                                        ^^^ Added by the client, from initialStorage
    assertSame(room.history.canUndo(), false);
  });

  test("missing storage keys are properly initialized using initialStorage, even when they are already part of the storage tree", async () => {
    const initialPresence = {};
    const initialStorage = {
      list: new LiveList([13, 42]),
      map: new LiveMap([["a" as string, 1 as number]]),
      obj: new LiveObject({ x: 0 }),
    };

    // Create the same room instance twice (using the same, global,
    // initialStorage instance)
    for (let i = 0; i < 2; i++) {
      const { room, wss } = createTestableRoom(
        initialPresence,
        undefined,
        undefined,
        undefined,
        initialStorage
      );
      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.INITIAL_STORAGE_STATE,
            items: [["root", { type: CrdtType.OBJECT, data: {} }]],
            //                                              ^^
            //                                   NOTE: Storage is initially
            //                                   empty, so initialStorage keys
            //                                   will get added
          })
        );
      });
      room.connect();
      try {
        const { root } = await room.getStorage();
        // XXX Support Map in tosti
        expect(root.toImmutable()).toEqual({
          list: [13, 42],
          map: new Map([["a", 1]]),
          obj: { x: 0 },
        });

        // Now start mutating these Live structures (the point being that those
        // mutations should not be observable in the second loop)
        root.get("list").push(13);
        root.get("map").set("b", 2);
        root.get("obj").set("x", 42);
      } finally {
        room.destroy();
      }
    }
  });

  test("storage should be initialized properly", async () => {
    const { room, wss } = createTestableRoom({});

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );
    });

    room.connect();
    const storage = await room.getStorage();
    assertEq(storage.root.toObject(), { x: 0 });
  });

  test("undo redo with presence", async () => {
    const { room } = createTestableRoom({ x: -1 });
    room.connect();

    await waitUntilStatus(room, "connected");
    assertEq(room[kInternal].presenceBuffer, null); // Buffer was flushed
    room.updatePresence({ x: 0 }, { addToHistory: true });
    assertEq(room[kInternal].presenceBuffer, { x: 0 });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    assertEq(room[kInternal].presenceBuffer, { x: 1 });

    room.history.undo();

    assertEq(room[kInternal].presenceBuffer, { x: 0 });
    assertEq(room.getPresence(), { x: 0 });

    room.history.redo();

    assertEq(room[kInternal].presenceBuffer, { x: 1 });
    assertEq(room.getPresence(), { x: 1 });
  });

  test("pausing history twice is a no-op", async () => {
    const { room, root } = await prepareDisconnectedStorageUpdateTest<{
      items: LiveList<LiveObject<Record<string, number>>>;
    }>([
      createSerializedObject("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedObject("0:2", {}, "0:1", FIRST_POSITION),
    ]);

    const items = root.get("items");

    room.history.pause();
    nn(items.get(0)).set("a", 1);
    room.history.pause(); // Pausing again should be a no-op!
    nn(items.get(0)).set("b", 2);
    room.history.pause(); // Pausing again should be a no-op!
    room.history.resume();
    room.history.resume(); // Resuming again should also be a no-op!

    assertEq(items.toImmutable(), [{ a: 1, b: 2 }]);
    assertSame(room.history.canUndo(), true);
    assertSame(room.history.canRedo(), false);
    room.history.undo();

    assertEq(items.toImmutable(), [{}]);
    assertSame(room.history.canUndo(), false);
    assertSame(room.history.canRedo(), true);
    room.history.redo();

    assertEq(items.toImmutable(), [{ a: 1, b: 2 }]);
    assertSame(room.history.canUndo(), true);
    assertSame(room.history.canRedo(), false);
  });

  test("undo redo batch", async () => {
    const { room, root, expectUpdates } =
      await prepareDisconnectedStorageUpdateTest<{
        items: LiveList<LiveObject<Record<string, number>>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", {}, "0:1", FIRST_POSITION),
      ]);

    const items = root.get("items");
    room.batch(() => {
      nn(items.get(0)).set("a", 1);
      items.set(0, new LiveObject({ a: 2 }));
    });

    assertEq(items.toImmutable(), [{ a: 2 }]);
    room.history.undo();

    assertEq(items.toImmutable(), [{}]);
    room.history.redo();

    assertEq(items.toImmutable(), [{ a: 2 }]);
    expectUpdates([
      [listUpdate([{ a: 2 }], [listUpdateSet(0, { a: 2 })])],
      [listUpdate([{}], [listUpdateSet(0, {})])],
      [listUpdate([{ a: 2 }], [listUpdateSet(0, { a: 2 })])],
    ]);
  });

  test("if presence is not added to history during a batch, it should not impact the undo/stack", async () => {
    const { room, wss } = createTestableRoom({});

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );
    });

    room.connect();
    const storage = await room.getStorage();

    room.updatePresence({ x: 0 });

    room.batch(() => {
      room.updatePresence({ x: 1 });
      storage.root.set("x", 1);
    });

    room.history.undo();

    assertEq(room.getPresence(), { x: 1 });
    assertEq(storage.root.toObject(), { x: 0 });

    room.history.redo();
  });

  test("if nothing happened while the history was paused, the undo stack should not be impacted", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    assertEq(room[kInternal].presenceBuffer, { x: 1 });

    room.history.pause();
    room.history.resume();

    room.history.undo();

    assertEq(room[kInternal].presenceBuffer, { x: 0 });
    assertEq(room.getPresence(), { x: 0 });
  });

  test("undo redo with presence that do not impact presence", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.history.undo();

    assertEq(room.getPresence(), { x: 1 });
  });

  test("pause / resume history", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 }, { addToHistory: true });
    assertEq(room[kInternal].presenceBuffer, { x: 0 });

    room.history.pause();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
      assertEq(room[kInternal].presenceBuffer, { x: i });
    }

    assertEq(room.getPresence(), { x: 10 });
    assertEq(room[kInternal].presenceBuffer, { x: 10 });

    room.history.resume();

    room.history.undo();

    assertEq(room[kInternal].presenceBuffer, { x: 0 });
    assertEq(room.getPresence(), { x: 0 });

    room.history.redo();

    assertEq(room[kInternal].presenceBuffer, { x: 10 });
    assertEq(room.getPresence(), { x: 10 });
  });

  test("undo while history is paused", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.history.pause();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
    }

    room.history.undo();

    assertEq(room.getPresence(), { x: 0 });
    assertEq(room[kInternal].presenceBuffer, { x: 0 });
  });

  test("undo redo with presence + storage", async () => {
    const { room, wss } = createTestableRoom({});

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );
    });

    room.connect();

    const storage = await room.getStorage();

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.batch(() => {
      room.updatePresence({ x: 1 }, { addToHistory: true });
      storage.root.set("x", 1);
    });

    assertEq(room[kInternal].presenceBuffer, { x: 1 });

    room.history.undo();

    assertEq(room[kInternal].presenceBuffer, { x: 0 });
    assertEq(room.getPresence(), { x: 0 });
    assertEq(storage.root.toObject(), { x: 0 });

    room.history.redo();

    assertEq(room[kInternal].presenceBuffer, { x: 1 });
    assertEq(storage.root.toObject(), { x: 1 });
    assertEq(room.getPresence(), { x: 1 });
  });

  test("batch without changes should not erase redo stack", async () => {
    const { room, wss } = createTestableRoom({});

    wss.onConnection((conn) => {
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );
    });

    room.connect();
    const storage = await room.getStorage();

    storage.root.set("x", 1);
    room.history.undo();
    assertEq(storage.root.toObject(), { x: 0 });

    room.batch(() => {});
    room.history.redo();

    assertEq(storage.root.toObject(), { x: 1 });
  });

  test("canUndo / canRedo", async () => {
    const { room, storage } = await prepareStorageTest<{
      a: number;
    }>([createSerializedObject("0:0", { a: 1 })], 1);

    assertSame(room.history.canUndo(), false);
    assertSame(room.history.canRedo(), false);

    storage.root.set("a", 2);

    assertSame(room.history.canUndo(), true);

    room.history.undo();

    assertSame(room.history.canRedo(), true);
  });

  test("clearing undo/redo stack", async () => {
    const { room, storage } = await prepareStorageTest<{
      a: number;
    }>([createSerializedObject("0:0", { a: 1 })], 1);

    assertSame(room.history.canUndo(), false);
    assertSame(room.history.canRedo(), false);

    storage.root.set("a", 2);
    storage.root.set("a", 3);
    storage.root.set("a", 4);
    room.history.undo();

    assertSame(room.history.canUndo(), true);
    assertSame(room.history.canRedo(), true);

    room.history.clear();
    assertSame(room.history.canUndo(), false);
    assertSame(room.history.canRedo(), false);

    room.history.undo(); // won't do anything now

    assertEq(storage.root.toObject(), { a: 3 });
  });

  describe("subscription", () => {
    test("batch my-presence", () => {
      const { room } = createTestableRoom({});

      const callback = vi.fn();

      onTestFinished(room.events.myPresence.subscribe(callback));

      room.batch(() => {
        room.updatePresence({ x: 0 });
        room.updatePresence({ y: 1 });
      });

      assertEq(callback.mock.calls.length, 1);
      expect(callback).toHaveBeenCalledWith({ x: 0, y: 1 });
    });

    test("batch storage and presence", async () => {
      const { room, wss } = createTestableRoom({});

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.INITIAL_STORAGE_STATE,
            items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
          })
        );
      });

      room.connect();

      const storage = await room.getStorage();

      const presenceSubscriber = vi.fn();
      const storageRootSubscriber = vi.fn();
      onTestFinished(room.subscribe("my-presence", presenceSubscriber));
      onTestFinished(room.subscribe(storage.root, storageRootSubscriber));

      room.batch(() => {
        room.updatePresence({ x: 0 });
        storage.root.set("x", 1);

        assertEq(presenceSubscriber.mock.calls, []);
        assertEq(storageRootSubscriber.mock.calls, []);
      });

      assertEq(presenceSubscriber.mock.calls.length, 1);
      expect(presenceSubscriber).toHaveBeenCalledWith({ x: 0 });

      assertEq(storageRootSubscriber.mock.calls.length, 1);
      expect(storageRootSubscriber).toHaveBeenCalledWith(storage.root);
    });

    test("batch without operations should not add an item to the undo stack", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 1 })], 1);

      storage.root.set("a", 2);

      // Batch without operations on storage or presence
      room.batch(() => {});

      expectStorage({ a: 2 });

      room.history.undo();

      expectStorage({ a: 1 });
    });

    test("batch storage with changes from server", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      room.batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      expectStorage({
        items: [],
      });

      room.history.redo();

      expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("batch storage and presence with changes from server", async () => {
      type P = { x?: number };
      type S = { items: LiveList<string> };
      type M = never;
      type E = never;

      const {
        room,
        storage,
        expectStorage,
        refRoom: refRoom,
      } = await prepareStorageTest<S, P, M, E>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      let refOthers: readonly User<P, M>[] | undefined;
      onTestFinished(
        refRoom.events.others.subscribe((ev) => (refOthers = ev.others))
      );

      room.batch(() => {
        room.updatePresence({ x: 0 });
        room.updatePresence({ x: 1 });
        items.push("A");
        items.push("B");
        items.push("C");
      });

      expectStorage({
        items: ["A", "B", "C"],
      });

      assertEq(refOthers, [
        {
          connectionId: 1,
          isReadOnly: false,
          canWrite: true,
          canComment: true,
          presence: { x: 1 },
        },
      ]);

      room.history.undo();

      expectStorage({
        items: [],
      });

      room.history.redo();

      expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("nested storage updates", async () => {
      const { room, root, expectUpdates } = await prepareStorageUpdateTest<{
        items: LiveList<LiveObject<{ names: LiveList<string> }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", {}, "0:1", FIRST_POSITION),
        createSerializedList("0:3", "0:2", "names"),
      ]);

      let receivedUpdates: StorageUpdate[] = [];

      onTestFinished(
        room.events.storageBatch.subscribe(
          (updates) => (receivedUpdates = updates)
        )
      );

      const immutableState = root.toImmutable() as {
        items: Array<{ names: Array<string> }>;
      };

      room.batch(() => {
        const items = root.get("items");
        items.insert(new LiveObject({ names: new LiveList(["John Doe"]) }), 0);
        items.get(1)?.get("names").push("Jane Doe");
        items.push(new LiveObject({ names: new LiveList(["James Doe"]) }));
      });

      expectUpdates([
        [
          listUpdate(
            [
              { names: ["John Doe"] },
              { names: ["Jane Doe"] },
              { names: ["James Doe"] },
            ],
            [
              listUpdateInsert(0, { names: ["John Doe"] }),
              listUpdateInsert(2, { names: ["James Doe"] }),
            ]
          ),
          listUpdate(["Jane Doe"], [listUpdateInsert(0, "Jane Doe")]),
        ],
      ]);

      // Additional check to prove that generated updates could patch an immutable state
      const newImmutableState = legacy_patchImmutableObject(
        immutableState,
        receivedUpdates
      );
      assertEq(newImmutableState, root.toImmutable());
    });

    test("batch history", () => {
      const { room } = createTestableRoom({});

      const callback = vi.fn();
      onTestFinished(room.events.history.subscribe(callback));

      room.batch(() => {
        room.updatePresence({ x: 0 }, { addToHistory: true });
        room.updatePresence({ y: 1 }, { addToHistory: true });
      });

      assertEq(callback.mock.calls.length, 1);
      expect(callback).toHaveBeenCalledWith({ canUndo: true, canRedo: false });
    });

    test("my-presence", () => {
      const { room } = createTestableRoom({});

      const callback = vi.fn();
      const unsubscribe = room.events.myPresence.subscribe(callback);
      onTestFinished(unsubscribe);

      room.updatePresence({ x: 0 });

      unsubscribe();

      room.updatePresence({ x: 1 });

      assertEq(callback.mock.calls.length, 1);
      expect(callback).toHaveBeenCalledWith({ x: 0 });
    });

    test("others", async () => {
      type P = { x?: number };

      const { room, wss } = createTestableRoom<P, never, never, never, never>(
        {},
        undefined,
        SOCKET_AUTOCONNECT_AND_ROOM_STATE()
      );
      room.connect();

      let others: readonly User<P, never>[] | undefined;

      const unsubscribe = room.events.others.subscribe(
        (ev) => (others = ev.others)
      );
      onTestFinished(unsubscribe);

      await waitUntilStatus(room, "connected");

      wss.last.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 2,
          nonce: "nonce-for-actor-2",
          scopes: ["room:write"],
          users: { 1: { scopes: ["room:write"] } },
        })
      );

      wss.last.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0, // Setting targetActor means this is a full presence update
        })
      );

      await waitUntilOthersEvent(room);
      unsubscribe();

      wss.last.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 3 },
          actor: 1,
        })
      );

      assertEq(others, [
        {
          connectionId: 1,
          isReadOnly: false,
          canWrite: true,
          canComment: true,
          presence: { x: 2 },
        },
      ]);
    });

    test("event", async () => {
      const { room, wss } = createTestableRoom(
        {},
        undefined,
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      );
      room.connect();

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 2,
            nonce: "nonce-for-actor-2",
            scopes: ["room:write"],
            users: {
              "1": {
                id: "user-123",
                info: { name: "Vincent" },
                scopes: ["room:write"],
              },
            },
          })
        );

        // User only becomes known as "other" locally after having received their presence
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_PRESENCE,
            data: { x: 2 },
            actor: 1,
            targetActor: 0, // Setting targetActor means this is a full presence update
          })
        );

        conn.server.send(
          serverMessage({
            type: ServerMsgCode.BROADCASTED_EVENT,
            event: { type: "MY_EVENT" },
            actor: 1,
          })
        );
      });

      const callback = vi.fn();
      onTestFinished(room.events.customEvent.subscribe(callback));

      await waitUntilCustomEvent(room);

      expect(callback).toHaveBeenCalledWith({
        connectionId: 1,
        event: {
          type: "MY_EVENT",
        },
        user: {
          canComment: true,
          canWrite: true,
          connectionId: 1,
          id: "user-123",
          info: { name: "Vincent" },
          isReadOnly: false,
          presence: { x: 2 },
        },
      });
    });

    test("event (but no such user known locally)", async () => {
      const { room, wss } = createTestableRoom(
        {},
        undefined,
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      );
      room.connect();

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 2,
            nonce: "nonce-for-actor-2",
            scopes: ["room:write"],
            users: {},
          })
        );

        conn.server.send(
          serverMessage({
            type: ServerMsgCode.BROADCASTED_EVENT,
            event: { type: "MY_EVENT" },
            actor: 1,
          })
        );
      });

      const callback = vi.fn();
      onTestFinished(room.events.customEvent.subscribe(callback));

      await waitUntilCustomEvent(room);

      expect(callback).toHaveBeenCalledWith({
        connectionId: 1,
        event: {
          type: "MY_EVENT",
        },
        user: null,
      });
    });

    test("history", () => {
      const { room } = createTestableRoom({});

      const callback = vi.fn();
      const unsubscribe = room.events.history.subscribe(callback);

      room.updatePresence({ x: 0 }, { addToHistory: true });

      expect(callback).toHaveBeenCalledWith({ canUndo: true, canRedo: false });

      room.history.undo();

      expect(callback).toHaveBeenCalledWith({ canUndo: false, canRedo: true });

      room.history.redo();

      expect(callback).toHaveBeenCalledWith({ canUndo: true, canRedo: false });

      room.updatePresence({ x: 1 });

      unsubscribe();

      room.updatePresence({ x: 2 }, { addToHistory: true });

      assertEq(callback.mock.calls.length, 3);
    });
  });

  describe("offline", () => {
    test("disconnect and reconnect with offline changes", async () => {
      const { storage, expectStorage, room, refStorage, reconnect, wss } =
        await prepareStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      expectStorage({ items: [] });

      const items = storage.root.get("items");
      items.push("A");
      items.push("C"); // Will be removed by other client when offline
      expectStorage({
        items: ["A", "C"],
      });

      // Kill client A's connection, will trigger auto-reconnect logic
      wss.last.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      // Operation done offline
      items.push("B");

      // Other client (which is still online), deletes "C".
      refStorage.root.get("items").delete(1);

      const storageJson = lsonToJson(storage.root);
      assertEq(storageJson, { items: ["A", "C", "B"] });
      const refStorageJson = lsonToJson(refStorage.root);
      assertEq(refStorageJson, { items: ["A"] });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
        [
          "1:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "!",
            data: "A",
          },
        ],
      ];

      reconnect(2, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        items: ["A", "B"],
      });

      room.history.undo();

      expectStorage({
        items: ["A"],
      });
    });

    test("disconnect and reconnect with remote changes", async () => {
      const { expectStorage, room, wss } = await prepareIsolatedStorageTest<{
        items?: LiveList<string>;
        items2?: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
        ],
        1
      );

      expectStorage({ items: ["a"] });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["2:0", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items2" }],
        [
          "2:1",
          {
            type: CrdtType.REGISTER,
            parentId: "2:0",
            parentKey: FIRST_POSITION,
            data: "B",
          },
        ],
      ];

      // The next time a connection is made, send the updated storage
      wss.onConnection((conn) =>
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.INITIAL_STORAGE_STATE,
            items: newInitStorage,
          })
        )
      );

      // Closing the connection from the server will trigger a reconnect, which
      // will in turn load the "B" item
      wss.last.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      await waitUntilStorageUpdate(room);
      expectStorage({
        items2: ["B"],
      });
    });

    test("disconnect and reconnect should keep user current presence", async () => {
      const { room, refRoom, reconnect, refWss } = await prepareStorageTest<
        never,
        { x: number }
      >([createSerializedObject("0:0", {})], 1);

      room.updatePresence({ x: 1 });

      reconnect(2);

      await refWss.waitUntilMessageReceived();
      const refRoomOthers = refRoom.getOthers();
      assertEq(refRoomOthers, [
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        }, // old user is not cleaned directly
        {
          connectionId: 2,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("hasPendingStorageModifications", async () => {
      const { storage, expectStorage, room, refStorage, reconnect, wss } =
        await prepareStorageTest<{ x: number }>(
          [createSerializedObject("0:0", { x: 0 })],
          1
        );

      expectStorage({ x: 0 });

      assertSame(room.getStorageStatus(), "synchronized");

      const storageStatusCallback = vi.fn();

      onTestFinished(
        room.events.storageStatus.subscribe(storageStatusCallback)
      );

      wss.last.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      storage.root.set("x", 1);

      expect(storageStatusCallback).toHaveBeenCalledWith("synchronizing");
      assertSame(room.getStorageStatus(), "synchronizing");

      const storageJson = lsonToJson(storage.root);
      assertEq(storageJson, { x: 1 });
      const refStorageJson = lsonToJson(refStorage.root);
      assertEq(refStorageJson, { x: 0 });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        createSerializedObject("0:0", { x: 0 }),
      ];

      reconnect(2, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({ x: 1 });
      assertSame(room.getStorageStatus(), "synchronized");
      expect(storageStatusCallback).toHaveBeenCalledWith("synchronized");

      assertEq(storageStatusCallback.mock.calls.length, 2);
    });
  });

  describe("reconnect", () => {
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    test("when error code 1006 (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection as soon as it's opened
      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 1006,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 1006). Retrying in 250ms."
        );
        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a short backoff delay
        await vi.advanceTimersByTimeAsync(250);
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 1006 (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 1006,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 1006). Retrying in 250ms."
        );
        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a short backoff delay
        await vi.advanceTimersByTimeAsync(250);
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 40xx (immediately)", async () => {
      const { room, wss, errorEventSource } = createTestableRoom({ x: 0 });
      room.connect();

      let err = {} as LiveblocksError;
      onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 4042,
            reason: "whatever",
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "disconnected");
        assertSame(wss.connections.size, 1);
        assertEq(err.message, "whatever");
        assertEq(err.context.code, 4042);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 40xx (after delay)", async () => {
      const { room, wss, errorEventSource } = createTestableRoom({ x: 0 });
      room.connect();

      let err = {} as LiveblocksError;
      onTestFinished(errorEventSource.subscribeOnce((e) => (err = e)));

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 4042,
              reason: "whatever",
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);

        await waitUntilStatus(room, "disconnected");
        assertSame(wss.connections.size, 1);
        assertEq(err.message, "whatever");
        assertEq(err.context.code, 4042);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code TRY_AGAIN_LATER 1013 (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 1013,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 1013). Retrying in 2000ms."
        );

        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a longer backoff delay
        await vi.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        assertSame(wss.connections.size, 1);
        await vi.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code TRY_AGAIN_LATER 1013 (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 1013,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 1013). Retrying in 2000ms."
        );
        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a LONG backoff delay
        await vi.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        assertSame(wss.connections.size, 1);
        await vi.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds (for a total of 2000ms)
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 41xx (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 4142,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 4142). Retrying in 250ms."
        );

        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a normal backoff delay
        await vi.advanceTimersByTimeAsync(250);
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 41xx (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 4142,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 4142). Retrying in 250ms."
        );
        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a normal backoff delay
        await vi.advanceTimersByTimeAsync(250);
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 4109 (special case TOKEN_EXPIRED) (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 4109,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        assertSame(wss.connections.size, 2); // Instantly gets a new token, no backoff
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 4109 (special case TOKEN_EXPIRED) (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 4109,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);

        // Instantly gets a new token (no backoff)
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 42xx (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 4242,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 4242). Retrying in 2000ms."
        );

        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a longer backoff delay
        await vi.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        assertSame(wss.connections.size, 1);
        await vi.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("when error code 42xx (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 4242,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await vi.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 4242). Retrying in 2000ms."
        );
        assertSame(wss.connections.size, 1);

        // A new connection attempt will be made after a LONG backoff delay
        await vi.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        assertSame(wss.connections.size, 1);
        await vi.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds (for a total of 2000ms)
        assertSame(wss.connections.size, 2);
      } finally {
        vi.useRealTimers();
      }
    });

    test("manual reconnection", async () => {
      vi.useFakeTimers();
      try {
        const { room, wss } = createTestableRoom(
          { x: 0 },
          AUTH_SUCCESS,
          SOCKET_NO_BEHAVIOR // ⚠️  This will let us programmatically control opening the sockets
        );
        assertEq(room.getStatus(), "initial");

        room.connect();
        assertEq(room.getStatus(), "connecting");
        await vi.advanceTimersByTimeAsync(0); // Resolve the auth promise, which will then start the socket connection

        const ws1 = wss.last;
        ws1.accept();
        ws1.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 1,
            nonce: "nonce-for-actor-1",
            scopes: ["room:write"],
            users: {},
          })
        );
        await waitUntilStatus(room, "connected");
        assertEq(room.getStatus(), "connected");

        room.reconnect();
        assertEq(room.getStatus(), "connecting");
        await vi.advanceTimersByTimeAsync(0); // There's a backoff delay here!
        assertEq(room.getStatus(), "connecting");
        await vi.advanceTimersByTimeAsync(500); // Wait for the increased backoff delay!
        assertEq(room.getStatus(), "connecting");

        const ws2 = wss.last;
        ws2.accept();
        ws2.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 1,
            nonce: "nonce-for-actor-1",
            scopes: ["room:write"],
            users: {},
          })
        );

        // This "last" one is a new/different socket instance!
        assertSame(ws1 === ws2, false);

        await waitUntilStatus(room, "connected");
        assertEq(room.getStatus(), "connected");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Initial UpdatePresenceServerMsg", () => {
    test("skip UpdatePresence from other when initial full presence has not been received", async () => {
      type P = { x?: number };
      type S = never;
      type U = never;
      type E = never;
      type M = never;

      const { room, wss } = createTestableRoom<P, S, U, E, M>(
        {},
        undefined,
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      );

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 2,
            nonce: "nonce-for-actor-2",
            scopes: ["room:write"],
            users: { "1": { id: undefined, scopes: ["room:write"] } },
          })
        );

        // UpdatePresence sent before the initial full UpdatePresence
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_PRESENCE,
            data: { x: 2 },
            actor: 1,
          })
        );
      });

      room.connect();

      let others: readonly User<P, U>[] | undefined;

      onTestFinished(
        room.events.others.subscribe((ev) => (others = ev.others))
      );

      await waitUntilOthersEvent(room);
      assertEq(others, [
        // User not yet publicly visible
      ]);

      // Full UpdatePresence sent as an answer to "UserJoined" message
      wss.last.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0,
        })
      );

      assertEq(others, [
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          isReadOnly: false,
          canWrite: true,
          canComment: true,
          presence: {
            x: 2,
          },
        },
      ]);
    });
  });

  describe("initial storage", () => {
    test("initialize room with initial storage should send operation only once", async () => {
      const { wss, expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>([createSerializedObject("0:0", {})], 1, { items: new LiveList([]) });

      expectStorage({
        items: [],
      });

      assertEq(wss.receivedMessages, [
        [
          { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
          { type: ClientMsgCode.FETCH_STORAGE },
        ],
        [
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.CREATE_LIST,
                id: "1:0",
                opId: "1:1",
                parentId: "0:0",
                parentKey: "items",
              },
            ],
          },
        ],
      ]);
    });
  });

  describe("room load promises", () => {
    test("presence-ready promise", async () => {
      const { room } = createTestableRoom({
        initialPresence: {},
        initialStorage: {},
      });

      const p1 = room.waitUntilPresenceReady();
      const p2 = room.waitUntilPresenceReady();
      assertEq(p1 === p2, true); // Promises must be exactly equal

      assertEq(room.isPresenceReady(), false);

      room.connect();

      assertEq(room.isPresenceReady(), false);
      await room.waitUntilPresenceReady();
      assertEq(room.isPresenceReady(), true);

      room.disconnect();
      assertEq(room.isPresenceReady(), true);

      room.connect();
      await room.waitUntilPresenceReady();
      assertEq(room.isPresenceReady(), true);
    });

    test("storage-ready promise", async () => {
      const { room } = prepareRoomWithStorage_loadWithDelay(
        [["root", { type: CrdtType.OBJECT, data: {} }]],
        undefined,
        undefined,
        undefined,
        100 // Send initial storage after 100ms
      );

      const p1 = room.waitUntilStorageReady();
      const p2 = room.waitUntilStorageReady();
      assertEq(p1 === p2, true); // Promises must be exactly equal

      assertEq(room.isStorageReady(), false);

      room.connect();

      assertEq(room.isStorageReady(), false);

      // Waiting for *Presence* will not lead to *Storage* being ready
      await room.waitUntilPresenceReady();
      assertEq(room.isStorageReady(), false);

      // Waiting for *Storage* to be ready will, though
      await room.waitUntilStorageReady();
      assertEq(room.isStorageReady(), true);

      room.disconnect();
      assertEq(room.isStorageReady(), true);

      room.connect();
      await room.waitUntilStorageReady();
      assertEq(room.isStorageReady(), true);
    });
  });
});
