import { nn } from "..";
import type { AuthValue } from "../auth-manager";
import { StopRetrying } from "../connection";
import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import type { StorageUpdate } from "../crdts/StorageUpdates";
import { legacy_patchImmutableObject, lsonToJson } from "../immutable";
import * as console from "../lib/fancy-console";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import { ClientMsgCode } from "../protocol/ClientMsg";
import { OpCode } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import { ServerMsgCode } from "../protocol/ServerMsg";
import type { RoomConfig, RoomDelegates } from "../room";
import { createRoom } from "../room";
import { WebsocketCloseCodes } from "../types/IWebSocket";
import type { Others } from "../types/Others";
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
  prepareDisconnectedStorageUpdateTest,
  prepareIsolatedStorageTest,
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

const defaultRoomConfig: RoomConfig = {
  enableDebugLogging: false,
  roomId: "room-id",
  throttleDelay: THROTTLE_DELAY,
  lostConnectionTimeout: 99999,
  liveblocksServer: "wss://live.liveblocks.io/v6",
  delegates: {
    authenticate: () => {
      return Promise.resolve({ publicApiKey: "pk_123", type: "public" });
    },
    createSocket: mockedCreateSocketDelegate,
  },
};

function makeRoomConfig(
  mockedDelegates: RoomDelegates,
  defaults?: Partial<RoomConfig>
) {
  return {
    ...defaultRoomConfig,
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
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
>(
  initialPresence: TPresence,
  authBehavior = AUTH_SUCCESS,
  socketBehavior = SOCKET_AUTOCONNECT_AND_ROOM_STATE,
  config?: Partial<RoomConfig>
) {
  const { wss, delegates } = defineBehavior(authBehavior, socketBehavior);

  const room = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
    {
      initialPresence,
      initialStorage: undefined,
    },
    makeRoomConfig(delegates, config)
  );

  return {
    room,
    delegates,
    /**
     * The fake WebSocket server backend that these unit tests connect to.
     */
    wss,
  };
}

describe("room / auth", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("when auth-manager throws StopRetrying error - should fail", async () => {
    const room = createRoom(
      { initialPresence: {} as never },
      {
        ...makeRoomConfig({
          authenticate: () => {
            return new Promise((_resolve) => {
              throw new StopRetrying("Unauthorized: No access");
            });
          },
          createSocket: mockedCreateSocketDelegate,
        }),
      }
    );

    room.connect();
    await waitUntilStatus(room, "disconnected");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Unauthorized: No access");
    room.destroy();
  });
});

describe("room", () => {
  test("connect should transition to authenticating if closed and execute authenticate", () => {
    const { room, delegates } = createTestableRoom({});
    expect(delegates.authenticate).not.toHaveBeenCalled();
    room.connect();
    expect(room.getConnectionState()).toEqual("connecting");
    expect(room.getStatus()).toEqual("connecting");
    expect(delegates.authenticate).toHaveBeenCalled();
    expect(delegates.createSocket).not.toHaveBeenCalled();
  });

  test("connect should stay authenticating if connect is called multiple times and call authenticate only once", () => {
    const { room, delegates } = createTestableRoom({});
    room.connect();
    expect(room.getConnectionState()).toEqual("connecting");
    expect(room.getStatus()).toEqual("connecting");
    room.connect();
    room.connect();
    room.connect();
    expect(room.getConnectionState()).toEqual("connecting");
    expect(room.getStatus()).toEqual("connecting");
    expect(delegates.authenticate).toHaveBeenCalledTimes(1);
    expect(delegates.createSocket).not.toHaveBeenCalled();
  });

  test("authentication success should transition to connecting", async () => {
    const { room } = createTestableRoom({});
    expect(room.getConnectionState()).toBe("closed"); // This API will be deprecated in the future
    expect(room.getStatus()).toEqual("initial");

    room.connect();
    expect(room.getConnectionState()).toBe("connecting");
    expect(room.getStatus()).toEqual("connecting");
    await waitUntilStatus(room, "connected");
    expect(room.getConnectionState()).toBe("open"); // This API will be deprecated in the future
    expect(room.getStatus()).toEqual("connected");
  });

  test("should fall back to get a new token if socket cannot connect (initially)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_THROWS("😈"),
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE // Repeats infinitely
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected");

    expect(delegates.authenticate).toHaveBeenCalledTimes(2); // It re-authed!
    expect(delegates.createSocket).toHaveBeenCalledTimes(2);
  });

  test("should fall back to get a new token if socket cannot connect (when reconnecting)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE,
        SOCKET_THROWS("😈"),
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE // Repeats infinitely
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
    expect(delegates.authenticate).toHaveBeenCalledTimes(2); // It re-authed!
    expect(delegates.createSocket).toHaveBeenCalledTimes(3);
  });

  test("should reconnect without getting a new auth token when told by server that room is full (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_REFUSES(
          WebsocketCloseCodes.MAX_NUMBER_OF_CONCURRENT_CONNECTIONS,
          "Room full"
        ),
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE // Repeated to infinity
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected", 4000);

    // ...but we should not hit authentication again here (instead, the token should be reused)
    expect(delegates.authenticate).toHaveBeenCalledTimes(1); // Only once!
    expect(delegates.createSocket).toHaveBeenCalledTimes(2);
  });

  test("should reconnect without getting a new auth token when told by server that room is full (while connected)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.MAX_NUMBER_OF_CONCURRENT_CONNECTIONS,
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "reconnecting");
    await waitUntilStatus(room, "connected", 4000);

    expect(delegates.authenticate).toHaveBeenCalledTimes(1); // Only once!
    expect(delegates.createSocket).toHaveBeenCalledTimes(2);
  });

  test("should get a new auth token if unauthorized (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_REFUSES(WebsocketCloseCodes.NOT_ALLOWED),
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      )
    );
    room.connect();

    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "connected", 4000);

    expect(delegates.authenticate).toHaveBeenCalledTimes(2); // It re-authed!
    expect(delegates.createSocket).toHaveBeenCalledTimes(2);
  });

  test("should get a new auth token if unauthorized (while connected)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.NOT_ALLOWED,
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "reconnecting");
    await waitUntilStatus(room, "connected");

    expect(delegates.authenticate).toHaveBeenCalledTimes(2); // It re-authed!
    expect(delegates.createSocket).toHaveBeenCalledTimes(2);
  });

  test("should disconnect if told by server to not try reconnecting again (as refusal)", async () => {
    const { room, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_SEQUENCE(
        SOCKET_REFUSES(WebsocketCloseCodes.CLOSE_WITHOUT_RETRY),
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      )
    );
    room.connect();

    // Will try to reconnect, then gets refused, then disconnects
    await waitUntilStatus(room, "connecting");
    await waitUntilStatus(room, "disconnected", 4000);

    expect(delegates.authenticate).toHaveBeenCalledTimes(1); // Only once!
    expect(delegates.createSocket).toHaveBeenCalledTimes(1);
  });

  test("should disconnect if told by server to not try reconnecting again (while connected)", async () => {
    const { room, wss, delegates } = createTestableRoom(
      {},
      undefined,
      SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
    );
    room.connect();

    await waitUntilStatus(room, "connected");

    // Closing this connection will trigger a reconnection...
    wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_WITHOUT_RETRY,
        wasClean: true,
      })
    );

    await waitUntilStatus(room, "disconnected");

    expect(delegates.authenticate).toHaveBeenCalledTimes(1); // It re-authed!
    expect(delegates.createSocket).toHaveBeenCalledTimes(1);
  });

  test("initial presence should be sent once the connection is open", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });

    room.connect();
    await waitUntilStatus(room, "connecting");
    expect(wss.receivedMessages).toEqual([]);

    await waitUntilStatus(room, "connected");
    expect(wss.receivedMessages).toEqual([
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
    expect(wss.receivedMessages).toEqual([
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
    expect(wss.receivedMessages).toEqual([
      [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
    ]);
  });

  test("initial presence followed by updatePresence should delay sending the second presence event", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });
    room.connect();

    expect(wss.receivedMessages).toEqual([]);
    await waitUntilStatus(room, "connected");

    expect(wss.receivedMessages.length).toBe(1);
    expect(wss.receivedMessages[0]).toEqual([
      { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: { x: 0 } },
    ]);

    jest.useFakeTimers();
    try {
      const now = Date.now();

      // Forward the system clock by 30 millis
      jest.setSystemTime(now + 30);
      room.updatePresence({ x: 1 });
      jest.setSystemTime(now + 35);
      room.updatePresence({ x: 2 }); // These calls should get batched and flushed later

      await jest.advanceTimersByTimeAsync(0);
      expect(wss.receivedMessages.length).toBe(1); // Still no new data received
      expect(room.__internal.presenceBuffer).toEqual({ x: 2 });

      // Forwarding time by the flush threshold will trigger the future flush
      await jest.advanceTimersByTimeAsync(THROTTLE_DELAY);

      expect(wss.receivedMessages.length).toBe(2);
      expect(wss.receivedMessages[1]).toEqual([
        { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 2 } },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("should replace current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    expect(room.getPresence()).toStrictEqual({ x: 0 });
    expect(room.__internal.presenceBuffer).toStrictEqual({ x: 0 });
  });

  test("should merge current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    expect(room.getPresence()).toStrictEqual({ x: 0 });
    expect(room.__internal.presenceBuffer).toStrictEqual({ x: 0 });

    room.updatePresence({ y: 0 });
    expect(room.getPresence()).toStrictEqual({ x: 0, y: 0 });
    expect(room.__internal.presenceBuffer).toStrictEqual({ x: 0, y: 0 });
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

    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
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

    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: true,
        canWrite: false,
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
    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
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
    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
      },
    ]);

    // But it will clear eventually (after lostConnectionTimeout milliseconds)
    await waitUntilOthersEvent(room);
    expect(room.getOthers()).toEqual([]);
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
    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
      },
      {
        connectionId: 2,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
      },
    ]);

    // -----
    // Client C was inactive and was removed by the server.
    // -----

    // Client reconnects to the room, and receives a new ROOM_STATE msg from the server.
    expect(wss.connections.size).toBe(1);
    wss.last.send(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        actor: 2,
        scopes: ["room:write"],
        users: {
          "1": { scopes: ["room:write"] },
        },
      })
    );

    // Only Client B is part of others.
    expect(room.getOthers()).toEqual([
      {
        connectionId: 1,
        presence: { x: 2 },
        isReadOnly: false,
        canWrite: true,
      },
    ]);
  });

  describe("broadcast", () => {
    test("should send event to other users", async () => {
      const { room, wss } = createTestableRoom({});
      room.connect();

      await waitUntilStatus(room, "connected");
      expect(wss.receivedMessages).toEqual([
        [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
      ]);

      const now = Date.now();
      jest.useFakeTimers();
      try {
        // Event payload can be any JSON value
        jest.setSystemTime(now + 1000);
        room.broadcastEvent({ type: "EVENT" });
        jest.setSystemTime(now + 2000);
        room.broadcastEvent([1, 2, 3]);
        jest.setSystemTime(now + 3000);
        room.broadcastEvent(42);
        jest.setSystemTime(now + 4000);
        room.broadcastEvent("hi");
      } finally {
        jest.useRealTimers();
      }

      expect(wss.receivedMessages[1]).toEqual([
        { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
      ]);
      expect(wss.receivedMessages[2]).toEqual([
        { type: ClientMsgCode.BROADCAST_EVENT, event: [1, 2, 3] },
      ]);
      expect(wss.receivedMessages[3]).toEqual([
        { type: ClientMsgCode.BROADCAST_EVENT, event: 42 },
      ]);
      expect(wss.receivedMessages[4]).toEqual([
        { type: ClientMsgCode.BROADCAST_EVENT, event: "hi" },
      ]);
    });

    test("should not send event to other users if not connected", async () => {
      const { room, wss } = createTestableRoom({});

      room.broadcastEvent({ type: "EVENT" });
      expect(wss.receivedMessages).toEqual([]);

      room.connect();
      await waitUntilStatus(room, "connected");

      expect(wss.receivedMessages).toEqual([
        [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
      ]);
    });

    test("should queue event if socket is not ready and shouldQueueEventsIfNotReady is true", async () => {
      const { room, wss } = createTestableRoom({});

      room.broadcastEvent(
        { type: "EVENT" },
        { shouldQueueEventIfNotReady: true }
      );
      expect(wss.receivedMessages).toEqual([]);

      room.connect();
      await waitUntilStatus(room, "connected");

      expect(wss.receivedMessages).toEqual([
        [
          { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
          { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
        ],
      ]);
    });
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
    expect(storage.root.toObject()).toEqual({ x: 0 });
  });

  test("undo redo with presence", async () => {
    const { room } = createTestableRoom({ x: -1 });
    room.connect();

    await waitUntilStatus(room, "connected");
    expect(room.__internal.presenceBuffer).toEqual(null); // Buffer was flushed
    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(room.__internal.presenceBuffer).toEqual({ x: 1 });

    room.history.undo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 1 });
    expect(room.getPresence()).toEqual({ x: 1 });
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

    expect(items.toImmutable()).toEqual([{ a: 2 }]);
    room.history.undo();

    expect(items.toImmutable()).toEqual([{}]);
    room.history.redo();

    expect(items.toImmutable()).toEqual([{ a: 2 }]);
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

    expect(room.getPresence()).toEqual({ x: 1 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.history.redo();
  });

  test("if nothing happened while the history was paused, the undo stack should not be impacted", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(room.__internal.presenceBuffer).toEqual({ x: 1 });

    room.history.pause();
    room.history.resume();

    room.history.undo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });
  });

  test("undo redo with presence that do not impact presence", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.history.undo();

    expect(room.getPresence()).toEqual({ x: 1 });
  });

  test("pause / resume history", () => {
    const { room } = createTestableRoom({});
    // room.connect();  // Seems not even needed?

    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });

    room.history.pause();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
      expect(room.__internal.presenceBuffer).toEqual({ x: i });
    }

    expect(room.getPresence()).toEqual({ x: 10 });
    expect(room.__internal.presenceBuffer).toEqual({ x: 10 });

    room.history.resume();

    room.history.undo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 10 });
    expect(room.getPresence()).toEqual({ x: 10 });
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

    expect(room.getPresence()).toEqual({ x: 0 });
    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
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

    expect(room.__internal.presenceBuffer).toEqual({ x: 1 });

    room.history.undo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.presenceBuffer).toEqual({ x: 1 });
    expect(storage.root.toObject()).toEqual({ x: 1 });
    expect(room.getPresence()).toEqual({ x: 1 });
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
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.batch(() => {});
    room.history.redo();

    expect(storage.root.toObject()).toEqual({ x: 1 });
  });

  test("canUndo / canRedo", async () => {
    const { room, storage } = await prepareStorageTest<{
      a: number;
    }>([createSerializedObject("0:0", { a: 1 })], 1);

    expect(room.history.canUndo()).toBeFalsy();
    expect(room.history.canRedo()).toBeFalsy();

    storage.root.set("a", 2);

    expect(room.history.canUndo()).toBeTruthy();

    room.history.undo();

    expect(room.history.canRedo()).toBeTruthy();
  });

  describe("subscription", () => {
    test("batch my-presence", () => {
      const { room } = createTestableRoom({});

      const callback = jest.fn();

      room.events.me.subscribe(callback);

      room.batch(() => {
        room.updatePresence({ x: 0 });
        room.updatePresence({ y: 1 });
      });

      expect(callback).toHaveBeenCalledTimes(1);
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

      const presenceSubscriber = jest.fn();
      const storageRootSubscriber = jest.fn();
      room.subscribe("my-presence", presenceSubscriber);
      room.subscribe(storage.root, storageRootSubscriber);

      room.batch(() => {
        room.updatePresence({ x: 0 });
        storage.root.set("x", 1);

        expect(presenceSubscriber).not.toHaveBeenCalled();
        expect(storageRootSubscriber).not.toHaveBeenCalled();
      });

      expect(presenceSubscriber).toHaveBeenCalledTimes(1);
      expect(presenceSubscriber).toHaveBeenCalledWith({ x: 0 });

      expect(storageRootSubscriber).toHaveBeenCalledTimes(1);
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

      let refOthers: Others<P, M> | undefined;
      refRoom.events.others.subscribe((ev) => (refOthers = ev.others));

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

      expect(refOthers).toEqual([
        {
          connectionId: 1,
          isReadOnly: false,
          canWrite: true,
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

      room.events.storage.subscribe((updates) => (receivedUpdates = updates));

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
      expect(newImmutableState).toEqual(root.toImmutable());
    });

    test("batch history", () => {
      const { room } = createTestableRoom({});

      const callback = jest.fn();
      room.events.history.subscribe(callback);

      room.batch(() => {
        room.updatePresence({ x: 0 }, { addToHistory: true });
        room.updatePresence({ y: 1 }, { addToHistory: true });
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ canUndo: true, canRedo: false });
    });

    test("my-presence", () => {
      const { room } = createTestableRoom({});

      const callback = jest.fn();
      const unsubscribe = room.events.me.subscribe(callback);

      room.updatePresence({ x: 0 });

      unsubscribe();

      room.updatePresence({ x: 1 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 0 });
    });

    test("others", async () => {
      type P = { x?: number };

      const { room, wss } = createTestableRoom<P, never, never, never>(
        {},
        undefined,
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      );
      room.connect();

      let others: Others<P, never> | undefined;

      const unsubscribe = room.events.others.subscribe(
        (ev) => (others = ev.others)
      );

      await waitUntilStatus(room, "connected");

      wss.last.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor: 2,
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

      expect(others).toEqual([
        {
          connectionId: 1,
          isReadOnly: false,
          canWrite: true,
          presence: { x: 2 },
        },
      ]);
    });

    test("event", async () => {
      const { room, wss } = createTestableRoom({});

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.BROADCASTED_EVENT,
            event: { type: "MY_EVENT" },
            actor: 1,
          })
        );
      });

      room.connect();

      const callback = jest.fn();
      room.events.customEvent.subscribe(callback);

      await waitUntilCustomEvent(room);

      expect(callback).toHaveBeenCalledWith({
        connectionId: 1,
        event: {
          type: "MY_EVENT",
        },
      });
    });

    test("history", () => {
      const { room } = createTestableRoom({});

      const callback = jest.fn();
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

      expect(callback).toHaveBeenCalledTimes(3);
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
      expect(storageJson).toEqual({ items: ["A", "C", "B"] });
      const refStorageJson = lsonToJson(refStorage.root);
      expect(refStorageJson).toEqual({ items: ["A"] });

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
      expect(refRoomOthers).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
          canWrite: true,
        }, // old user is not cleaned directly
        {
          connectionId: 2,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
          canWrite: true,
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

      expect(room.getStorageStatus()).toBe("synchronized");

      const storageStatusCallback = jest.fn();

      room.events.storageStatus.subscribe(storageStatusCallback);

      wss.last.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      storage.root.set("x", 1);

      expect(storageStatusCallback).toBeCalledWith("synchronizing");
      expect(room.getStorageStatus()).toBe("synchronizing");

      const storageJson = lsonToJson(storage.root);
      expect(storageJson).toEqual({ x: 1 });
      const refStorageJson = lsonToJson(refStorage.root);
      expect(refStorageJson).toEqual({ x: 0 });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        createSerializedObject("0:0", { x: 0 }),
      ];

      reconnect(2, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({ x: 1 });
      expect(room.getStorageStatus()).toBe("synchronized");
      expect(storageStatusCallback).toBeCalledWith("synchronized");

      expect(storageStatusCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("reconnect", () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
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

      jest.useFakeTimers();
      try {
        await jest.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 1006). Retrying in 250ms."
        );
        expect(wss.connections.size).toBe(1);

        // A new connection attempt will be made after a short backoff delay
        await jest.advanceTimersByTimeAsync(250);
        expect(wss.connections.size).toBe(2);
      } finally {
        jest.useRealTimers();
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

      jest.useFakeTimers();
      try {
        await jest.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await jest.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 1006). Retrying in 250ms."
        );
        expect(wss.connections.size).toBe(1);

        // A new connection attempt will be made after a short backoff delay
        await jest.advanceTimersByTimeAsync(250);
        expect(wss.connections.size).toBe(2);
      } finally {
        jest.useRealTimers();
      }
    });

    test("when error code 4002 (immediately)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      wss.onConnection((conn) => {
        conn.server.close(
          new CloseEvent("close", {
            code: 4002,
            wasClean: false,
          })
        );
      });

      await waitUntilStatus(room, "connecting");

      jest.useFakeTimers();
      try {
        await jest.advanceTimersByTimeAsync(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed prematurely (code: 4002). Retrying in 2000ms."
        );

        expect(wss.connections.size).toBe(1);

        // A new connection attempt will be made after a longer backoff delay
        await jest.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        expect(wss.connections.size).toBe(1);
        await jest.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds
        expect(wss.connections.size).toBe(2);
      } finally {
        jest.useRealTimers();
      }
    });

    test("when error code 4002 (after delay)", async () => {
      const { room, wss } = createTestableRoom({ x: 0 });
      room.connect();

      // Close the connection 1.111 second after it opened
      wss.onConnection((conn) => {
        setTimeout(() => {
          conn.server.close(
            new CloseEvent("close", {
              code: 4002,
              wasClean: false,
            })
          );
        }, 1111);
      });

      await waitUntilStatus(room, "connecting");

      jest.useFakeTimers();
      try {
        await jest.advanceTimersByTimeAsync(0);
        await waitUntilStatus(room, "connected");
        await jest.advanceTimersByTimeAsync(1111);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Connection to Liveblocks websocket server closed (code: 4002). Retrying in 2000ms."
        );
        expect(wss.connections.size).toBe(1);

        // A new connection attempt will be made after a LONG backoff delay
        await jest.advanceTimersByTimeAsync(500); // Waiting our normal short delay isn't enough here...
        expect(wss.connections.size).toBe(1);
        await jest.advanceTimersByTimeAsync(1500); // Wait an additional 1500 seconds (for a total of 2000ms)
        expect(wss.connections.size).toBe(2);
      } finally {
        jest.useRealTimers();
      }
    });

    test("manual reconnection", async () => {
      jest.useFakeTimers();
      try {
        const { room, wss } = createTestableRoom(
          { x: 0 },
          AUTH_SUCCESS,
          SOCKET_NO_BEHAVIOR // ⚠️  This will let us programmatically control opening the sockets
        );
        expect(room.getConnectionState()).toBe("closed"); // This API will be deprecated in the future
        expect(room.getStatus()).toEqual("initial");

        room.connect();
        expect(room.getConnectionState()).toBe("connecting");
        expect(room.getStatus()).toEqual("connecting");
        await jest.advanceTimersByTimeAsync(0); // Resolve the auth promise, which will then start the socket connection

        const ws1 = wss.last;
        ws1.accept();
        await waitUntilStatus(room, "connected");
        expect(room.getConnectionState()).toBe("open"); // This API will be deprecated in the future
        expect(room.getStatus()).toEqual("connected");

        room.reconnect();
        expect(room.getConnectionState()).toBe("connecting");
        expect(room.getStatus()).toEqual("connecting");
        await jest.advanceTimersByTimeAsync(0); // There's a backoff delay here!
        expect(room.getConnectionState()).toBe("connecting");
        expect(room.getStatus()).toEqual("connecting");
        await jest.advanceTimersByTimeAsync(500); // Wait for the increased backoff delay!
        expect(room.getConnectionState()).toBe("connecting"); // This API will be deprecated in the future
        expect(room.getStatus()).toEqual("connecting");

        const ws2 = wss.last;
        ws2.accept();

        // This "last" one is a new/different socket instance!
        expect(ws1 === ws2).toBe(false);

        await waitUntilStatus(room, "connected");
        expect(room.getConnectionState()).toBe("open");
        expect(room.getStatus()).toEqual("connected");
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("Initial UpdatePresenceServerMsg", () => {
    test("skip UpdatePresence from other when initial full presence has not been received", async () => {
      type P = { x?: number };
      type S = never;
      type M = never;
      type E = never;

      const { room, wss } = createTestableRoom<P, S, M, E>(
        {},
        undefined,
        SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE
      );

      wss.onConnection((conn) => {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.ROOM_STATE,
            actor: 2,
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

      let others: Others<P, M> | undefined;

      room.events.others.subscribe((ev) => (others = ev.others));

      await waitUntilOthersEvent(room);
      expect(others).toEqual([
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

      expect(others).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          isReadOnly: false,
          canWrite: true,
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
      }>([createSerializedObject("0:0", {})], 1, { items: new LiveList() });

      expectStorage({
        items: [],
      });

      expect(wss.receivedMessages).toEqual([
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
});
