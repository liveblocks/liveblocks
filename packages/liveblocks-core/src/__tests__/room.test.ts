import { rest } from "msw";
import { setupServer } from "msw/node";

import { nn } from "..";
import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import type { StorageUpdate } from "../crdts/StorageUpdates";
import { legacy_patchImmutableObject, lsonToJson } from "../immutable";
import * as console from "../lib/fancy-console";
import { withTimeout } from "../lib/fsm";
import type { Json, JsonObject } from "../lib/Json";
import type { Authentication } from "../protocol/Authentication";
import type { RoomAuthToken } from "../protocol/AuthToken";
import { RoomScope } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import { ClientMsgCode } from "../protocol/ClientMsg";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import { ServerMsgCode } from "../protocol/ServerMsg";
import type {
  _private_Effects as Effects,
  ConnectionStatus,
  Room,
} from "../room";
import { createRoom } from "../room";
import { WebsocketCloseCodes } from "../types/IWebSocket";
import type { Others } from "../types/Others";
import {
  AUTO_OPEN_SOCKETS,
  DEFAULT_AUTH,
  defineBehavior,
  MANUAL_SOCKETS,
} from "./_behaviors";
import { listUpdate, listUpdateInsert, listUpdateSet } from "./_updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIRST_POSITION,
  makeControllableWebSocket,
  mockEffects,
  prepareDisconnectedStorageUpdateTest,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  prepareStorageUpdateTest,
  reconnect,
  serverMessage,
  waitFor,
  withDateNow,
} from "./_utils";

/**
 * Handy helper that allows to pause test execution until the room has
 * asynchronously reached a particular status. Status must be reached within
 * a limited time window, or else this will fail, to avoid hanging.
 */
export async function waitUntilStatus(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  targetStatus: ConnectionStatus
): Promise<void> {
  let unsub: (() => void) | undefined;
  return withTimeout(
    new Promise<void>((resolve) => {
      if (room.getConnectionState() === targetStatus) {
        resolve(undefined);
      } else {
        // Otherwise, subscribe
        unsub = room.events.connection.subscribe((status) => {
          if (status === targetStatus) {
            resolve();
          }
        });
      }
    }),
    1000,
    `Room did not reach connection status "${targetStatus}" within 1s`
  ).finally(() => unsub?.());
}

export async function waitUntilOthersUpdate(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): Promise<void> {
  let unsub: (() => void) | undefined;
  return withTimeout(
    new Promise<void>((resolve) => {
      // Otherwise, subscribe
      unsub = room.events.others.subscribe(() => {
        resolve();
      });
    }),
    1000,
    'Room never got an "others" update within 1s'
  ).finally(() => unsub?.());
}

function makeRoomConfig<TPresence extends JsonObject, TRoomEvent extends Json>(
  mockedEffects?: Effects<TPresence, TRoomEvent>
) {
  return {
    roomId: "room-id",
    throttleDelay: 100,
    liveblocksServer: "wss://live.liveblocks.io/v6",
    authentication: {
      type: "private",
      url: "/mocked-api/auth",
    } as Authentication,
    mockedEffects,
  };
}

const defaultRoomToken: RoomAuthToken = {
  appId: "my-app",
  roomId: "my-room",
  id: "user1",
  actor: 0,
  scopes: [],
};

function createTestableRoom<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  initialPresence: TPresence,
  authBehavior = DEFAULT_AUTH,
  socketBehavior = AUTO_OPEN_SOCKETS
) {
  const effects = mockEffects<TPresence, TRoomEvent>(); // XXX Stop using/returning this

  const { wss, delegates } = defineBehavior(authBehavior, socketBehavior);

  const room = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
    {
      initialPresence,
      initialStorage: undefined,
    },
    makeRoomConfig(),
    delegates
  );

  return {
    room,
    effects,
    delegates,
    /**
     * The fake WebSocket server backend that these unit tests connect to.
     */
    wss,
  };
}

describe("room / auth", () => {
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6ODcsInNjb3BlcyI6WyJyb29tOndyaXRlIl19.uS0VcdeAPdMfJ2rseRRUnL_X3I-h6ljPKEiu1xfKRG0Qrth0zdqo2ngn7NZ8_fLcQBaIvaZ4q5vXg_Nex81Ae9sjmmLhjxHcE-iA-BC82NROVSnyGdVHJRMNqs6h57pCdiXwCwpcLjqi_EOIS8gmMB8dcRX748Wpa4C2T0e94An8_vP6eD66JKndxjFvVPrB_LSOOlQZoxW9USPS7ZUTAECeGQscrXnss_-1TJEaGf0RxVkNQsDfUKu4TjWYa3iBvBPip--Ev1bBETh0IHrGNsWVUd-691cCRAemiC_ADBaOg5IEszqoEw96Xe9BtQeWrjAgMKKrPS72cwkikVmiJQ";
  const server = setupServer(
    rest.post("/mocked-api/auth", (_req, res, ctx) => {
      return res(ctx.json({ token }));
    }),
    rest.post("/mocked-api/403", (_req, res, ctx) => {
      return res(ctx.status(403));
    }),
    rest.post("/mocked-api/not-json", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.text("this is not json"));
    }),
    rest.post("/mocked-api/missing-token", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.json({}));
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = process.env;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  test.each([{ notAToken: "" }, undefined, null, ""])(
    "custom authentication with missing token in callback response should throw",
    async (response) => {
      const room = createRoom(
        { initialPresence: {} as never },
        {
          ...makeRoomConfig(),
          authentication: {
            type: "custom",
            callback: (_room) =>
              new Promise((resolve) => {
                // @ts-expect-error: testing for missing token in callback response
                resolve(response);
              }),
          },
        },
        /* XXX TODO */ void "PLEASE IMPLEMENT ME"
      );

      room.connect();
      await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
      room.disconnect();

      expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
        new Error(
          'Authentication error. We expect the authentication callback to return a token, but it does not. Hint: the return value should look like: { token: "..." }'
        )
      );
    }
  );

  test("private authentication with 403 status should throw", async () => {
    const room = createRoom(
      { initialPresence: {} as never },
      {
        ...makeRoomConfig(),
        authentication: {
          type: "private",
          url: "/mocked-api/403",
        },
      },
      /* XXX TODO */ void "PLEASE IMPLEMENT ME"
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        'Expected a status 200 but got 403 when doing a POST request on "/mocked-api/403"'
      )
    );
  });

  test("private authentication that does not returns json should throw", async () => {
    const room = createRoom(
      { initialPresence: {} as never },
      {
        ...makeRoomConfig(),
        authentication: {
          type: "private",
          url: "/mocked-api/not-json",
        },
      },
      /* XXX TODO */ void "PLEASE IMPLEMENT ME"
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        'Expected a JSON response when doing a POST request on "/mocked-api/not-json". SyntaxError: Unexpected token h in JSON at position 1'
      )
    );
  });

  test("private authentication that does not returns json should throw", async () => {
    const room = createRoom(
      { initialPresence: {} as never },
      {
        ...makeRoomConfig(),
        authentication: {
          type: "private",
          url: "/mocked-api/missing-token",
        },
      },
      /* XXX TODO */ void "PLEASE IMPLEMENT ME"
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        'Expected a JSON response of the form `{ token: "..." }` when doing a POST request on "/mocked-api/missing-token", but got {}'
      )
    );
  });
});

describe("room", () => {
  test.only("connect should transition to authenticating if closed and execute authenticate", () => {
    const { room, delegates } = createTestableRoom({});
    expect(delegates.authenticate).not.toHaveBeenCalled();
    room.connect();
    expect(room.getConnectionState()).toEqual("authenticating");
    expect(delegates.authenticate).toHaveBeenCalled();
    expect(delegates.createSocket).not.toHaveBeenCalled();
  });

  test.only("connect should stay authenticating if connect is called multiple times and call authenticate only once", () => {
    const { room, delegates } = createTestableRoom({});
    room.connect();
    expect(room.getConnectionState()).toEqual("authenticating");
    room.connect();
    room.connect();
    room.connect();
    expect(room.getConnectionState()).toEqual("authenticating");
    expect(delegates.authenticate).toHaveBeenCalledTimes(1);
    expect(delegates.createSocket).not.toHaveBeenCalled();
  });

  test.only("authentication success should transition to connecting", async () => {
    const { room } = createTestableRoom({});
    expect(room.getConnectionState()).toBe("closed");

    room.connect();
    expect(room.getConnectionState()).toBe("authenticating");
    await waitUntilStatus(room, "connecting");
    expect(room.getConnectionState()).toBe("connecting");
    await waitUntilStatus(room, "open");
    expect(room.getConnectionState()).toBe("open");
  });

  test.only("initial presence should be sent once the connection is open", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });

    room.connect();
    await waitUntilStatus(room, "connecting");
    expect(wss.receivedMessages).toEqual([]);

    await waitUntilStatus(room, "open");
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

  test.only("if presence has been updated before the connection, it should be sent when the connection is ready", async () => {
    const { room, wss } = createTestableRoom({});
    room.updatePresence({ x: 0 });
    room.connect();

    await waitUntilStatus(room, "open");
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

  test.only("if no presence has been set before the connection is open, an empty presence should be sent", async () => {
    const { room, wss } = createTestableRoom({} as never);
    room.connect();

    await waitUntilStatus(room, "open");
    expect(wss.receivedMessages).toEqual([
      [{ type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} }],
    ]);
  });

  test.only("initial presence followed by updatePresence should delay sending the second presence event", async () => {
    const { room, wss } = createTestableRoom({ x: 0 });
    room.connect();

    expect(wss.receivedMessages).toEqual([]);
    await waitUntilStatus(room, "open");

    expect(wss.receivedMessages.length).toBe(1);
    expect(wss.receivedMessages[0]).toEqual([
      { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: { x: 0 } },
    ]);

    jest.useFakeTimers();
    const now = Date.now();

    // Forward the system clock by 30 millis
    jest.setSystemTime(now + 30);
    room.updatePresence({ x: 1 });
    jest.setSystemTime(now + 35);
    room.updatePresence({ x: 2 }); // These calls should get batched and flushed later

    await jest.advanceTimersByTimeAsync(0);
    expect(wss.receivedMessages.length).toBe(1); // Still no new data received
    expect(room.__internal.buffer.me?.data).toEqual({ x: 2 });

    // Forwarding time by the flush threshold will trigger the future flush
    await jest.advanceTimersByTimeAsync(makeRoomConfig().throttleDelay);

    expect(wss.receivedMessages.length).toBe(2);
    expect(wss.receivedMessages[1]).toEqual([
      { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 2 } },
    ]);
  });

  test.only("should replace current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    expect(room.getPresence()).toStrictEqual({ x: 0 });
    expect(room.__internal.buffer.me?.data).toStrictEqual({ x: 0 });
  });

  test.only("should merge current presence and set flushData presence when connection is closed", () => {
    const { room } = createTestableRoom({});

    room.updatePresence({ x: 0 });

    expect(room.getPresence()).toStrictEqual({ x: 0 });
    expect(room.__internal.buffer.me?.data).toStrictEqual({ x: 0 });

    room.updatePresence({ y: 0 });
    expect(room.getPresence()).toStrictEqual({ x: 0, y: 0 });
    expect(room.__internal.buffer.me?.data).toStrictEqual({ x: 0, y: 0 });
  });

  test("others should be iterable", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [] },
        },
      })
    );

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
        targetActor: 0, // Setting targetActor means this is a full presence update
      })
    );

    const users = [];
    for (const user of room.getOthers()) {
      users.push(user);
    }

    expect(users).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);
  });

  test("others should be iterable", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [] },
        },
      })
    );

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
        targetActor: 0, // Setting targetActor means this is a full presence update
      })
    );

    const users = [];
    for (const user of room.getOthers()) {
      users.push(user);
    }

    expect(users).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);
  });

  test("others should be read-only when associated scopes are received", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [RoomScope.Read, RoomScope.PresenceWrite] },
        },
      })
    );

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
        targetActor: 0, // Setting targetActor means this is a full presence update
      })
    );

    const users = [];
    for (const user of room.getOthers()) {
      users.push(user);
    }

    expect(users).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: true },
    ]);
  });

  test("should clear users when socket close", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [] },
        },
      })
    );

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
        targetActor: 0, // Setting targetActor means this is a full presence update
      })
    );

    expect(room.getOthers()).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);

    room.__internal.send.explicitClose(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_ABNORMAL,
        wasClean: false,
      })
    );

    expect(room.getOthers()).toEqual([]);
  });

  test("should clear users not present in server message ROOM_STATE", () => {
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

    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [] },
          "2": { scopes: [] },
        },
      })
    );

    // Client B
    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
        targetActor: 0,
      })
    );

    // Client C
    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 2,
        targetActor: 0,
      })
    );

    expect(room.getOthers()).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
      { connectionId: 2, presence: { x: 2 }, isReadOnly: false },
    ]);

    // -----
    // Client C was inactive and was removed by the server.
    // -----

    // Client reconnects to the room, and receives a new ROOM_STATE msg from the server.
    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.ROOM_STATE,
        users: {
          "1": { scopes: [] },
        },
      })
    );

    // Only Client B is part of others.
    expect(room.getOthers()).toEqual([
      { connectionId: 1, presence: { x: 2 }, isReadOnly: false },
    ]);
  });

  describe("broadcast", () => {
    test("should send event to other users", () => {
      const { room, effects } = createTestableRoom({});

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);

      const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

      withDateNow(now, () => ws.server.accept());

      expect(effects.send).nthCalledWith(1, [
        { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
      ]);

      // Event payload can be any JSON value
      withDateNow(now + 1000, () => room.broadcastEvent({ type: "EVENT" }));
      withDateNow(now + 2000, () => room.broadcastEvent([1, 2, 3]));
      withDateNow(now + 3000, () => room.broadcastEvent(42));
      withDateNow(now + 4000, () => room.broadcastEvent("hi"));

      expect(effects.send).nthCalledWith(2, [
        { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
      ]);
      expect(effects.send).nthCalledWith(3, [
        { type: ClientMsgCode.BROADCAST_EVENT, event: [1, 2, 3] },
      ]);
      expect(effects.send).nthCalledWith(4, [
        { type: ClientMsgCode.BROADCAST_EVENT, event: 42 },
      ]);
      expect(effects.send).nthCalledWith(5, [
        { type: ClientMsgCode.BROADCAST_EVENT, event: "hi" },
      ]);
    });

    test("should not send event to other users if not connected", () => {
      const { room, effects } = createTestableRoom({});

      room.broadcastEvent({ type: "EVENT" });

      expect(effects.send).not.toHaveBeenCalled();

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
      ]);
    });

    test("should queue event if socket is not ready and shouldQueueEventsIfNotReady is true", () => {
      const { room, effects } = createTestableRoom({});

      room.broadcastEvent(
        { type: "EVENT" },
        { shouldQueueEventIfNotReady: true }
      );

      expect(effects.send).not.toHaveBeenCalled();

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
        { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
      ]);
    });
  });

  test("storage should be initialized properly", async () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    const getStoragePromise = room.getStorage();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    expect(storage.root.toObject()).toEqual({ x: 0 });
  });

  test("undo redo with presence", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    expect(room.__internal.buffer.me).toEqual(null);
    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 1 });

    room.history.undo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 1 });
    expect(room.getPresence()).toEqual({ x: 1 });
  });

  it("undo redo batch", async () => {
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
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    const getStoragePromise = room.getStorage();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

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

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 1 });

    room.history.pause();
    room.history.resume();

    room.history.undo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });
  });

  test("undo redo with presence that do not impact presence", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.history.undo();

    expect(room.getPresence()).toEqual({ x: 1 });
  });

  test("pause / resume history", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });

    room.history.pause();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
      expect(room.__internal.buffer.me?.data).toEqual({ x: i });
    }

    expect(room.getPresence()).toEqual({ x: 10 });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 10 });

    room.history.resume();

    room.history.undo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 10 });
    expect(room.getPresence()).toEqual({ x: 10 });
  });

  test("undo while history is paused", () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.history.pause();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
    }

    room.history.undo();

    expect(room.getPresence()).toEqual({ x: 0 });
    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
  });

  test("undo redo with presence + storage", async () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    const getStoragePromise = room.getStorage();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.batch(() => {
      room.updatePresence({ x: 1 }, { addToHistory: true });
      storage.root.set("x", 1);
    });

    expect(room.__internal.buffer.me?.data).toEqual({ x: 1 });

    room.history.undo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 0 });
    expect(room.getPresence()).toEqual({ x: 0 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.history.redo();

    expect(room.__internal.buffer.me?.data).toEqual({ x: 1 });
    expect(storage.root.toObject()).toEqual({ x: 1 });
    expect(room.getPresence()).toEqual({ x: 1 });
  });

  test("batch without changes should not erase redo stack", async () => {
    const { room } = createTestableRoom({});

    const ws = makeControllableWebSocket();
    room.connect();
    room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
    ws.server.accept();

    const getStoragePromise = room.getStorage();

    room.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

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
    test.only("batch my-presence", () => {
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
      const { room } = createTestableRoom({});

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      const getStoragePromise = room.getStorage();

      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );

      const storage = await getStoragePromise;

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
          presence: {
            x: 1,
          },
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

    test.only("batch history", () => {
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

    test.only("my-presence", () => {
      const { room } = createTestableRoom({});

      const callback = jest.fn();
      const unsubscribe = room.events.me.subscribe(callback);

      room.updatePresence({ x: 0 });

      unsubscribe();

      room.updatePresence({ x: 1 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 0 });
    });

    test("others", () => {
      type P = { x?: number };

      const { room } = createTestableRoom<P, never, never, never>({});

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      let others: Others<P, never> | undefined;

      const unsubscribe = room.events.others.subscribe(
        (ev) => (others = ev.others)
      );

      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          users: { 1: { scopes: [] } },
        })
      );

      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0, // Setting targetActor means this is a full presence update
        })
      );

      unsubscribe();

      room.__internal.send.incomingMessage(
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
          presence: {
            x: 2,
          },
        },
      ]);
    });

    test("event", () => {
      const { room } = createTestableRoom({});

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      const callback = jest.fn();
      room.events.customEvent.subscribe(callback);

      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.BROADCASTED_EVENT,
          event: { type: "MY_EVENT" },
          actor: 1,
        })
      );

      expect(callback).toHaveBeenCalledWith({
        connectionId: 1,
        event: {
          type: "MY_EVENT",
        },
      });
    });

    test.only("history", () => {
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
      const { storage, expectStorage, room, refStorage, reconnect, ws } =
        await prepareStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = storage.root.get("items");

      expectStorage({ items: [] });

      items.push("A");
      items.push("C"); // Will be removed by other client when offline
      expectStorage({
        items: ["A", "C"],
      });

      ws.server.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      // Operation done offline
      items.push("B");

      // Other client (which is online), deletes "C".
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

      expectStorage({
        items: ["A", "B"],
      });

      room.history.undo();

      expectStorage({
        items: ["A"],
      });
    });

    test("disconnect and reconnect with remote changes", async () => {
      const { expectStorage, room } = await prepareIsolatedStorageTest<{
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

      room.__internal.send.explicitClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

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

      reconnect(room, 3, newInitStorage);

      expectStorage({
        items2: ["B"],
      });
    });

    test("disconnect and reconnect should keep user current presence", async () => {
      const { room, refRoom, reconnect, ws } = await prepareStorageTest<
        never,
        { x: number }
      >([createSerializedObject("0:0", {})], 1);

      room.updatePresence({ x: 1 });

      ws.server.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      reconnect(2);

      const refRoomOthers = refRoom.getOthers();

      expect(refRoomOthers).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
        }, // old user is not cleaned directly
        {
          connectionId: 2,
          id: undefined,
          info: undefined,
          presence: { x: 1 },
          isReadOnly: false,
        },
      ]);
    });

    test("hasPendingStorageModifications", async () => {
      const { storage, expectStorage, room, refStorage, reconnect, ws } =
        await prepareStorageTest<{ x: number }>(
          [createSerializedObject("0:0", { x: 0 })],
          1
        );

      expectStorage({ x: 0 });

      expect(room.getStorageStatus()).toBe("synchronized");

      const storageStatusCallback = jest.fn();

      room.events.storageStatus.subscribe(storageStatusCallback);

      ws.server.close(
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

      expectStorage({
        x: 1,
      });
      expect(room.getStorageStatus()).toBe("synchronized");
      expect(storageStatusCallback).toBeCalledWith("synchronized");

      expect(storageStatusCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("reconnect", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    test("when error code 1006", () => {
      const { room } = createTestableRoom({ x: 0 });

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      ws.server.close(
        new CloseEvent("close", {
          code: 1006,
          wasClean: false,
        })
      );

      expect(consoleWarnSpy.mock.calls[0][0]).toEqual(
        "Connection to Liveblocks websocket server closed (code: 1006). Retrying in 250ms."
      );

      // XXX Assert here that, if 250ms pass (= SHORT delay!), another
      // WebSocket connection gets instantiated by the room
    });

    test("when error code 4002", () => {
      const { room } = createTestableRoom({ x: 0 });

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      ws.server.close(
        new CloseEvent("close", {
          code: 4002,
          wasClean: false,
        })
      );

      expect(consoleErrorSpy.mock.calls[0][0]).toEqual(
        "Connection to websocket server closed. Reason:  (code: 4002). Retrying in 2000ms."
      );

      // XXX Assert here that, if 2000ms pass (= LONG delay!), another
      // WebSocket connection gets instantiated by the room
    });

    test.only("manual reconnection", async () => {
      jest.useFakeTimers();

      const { room, wss } = createTestableRoom(
        { x: 0 },
        DEFAULT_AUTH,
        MANUAL_SOCKETS // ⚠️  This will let us programmatically control opening the sockets
      );
      expect(room.getConnectionState()).toBe("closed");

      room.connect();
      expect(room.getConnectionState()).toBe("authenticating");
      await waitUntilStatus(room, "connecting");
      expect(room.getConnectionState()).toBe("connecting");

      const ws1 = wss.last;
      ws1.accept();
      await waitUntilStatus(room, "open");
      expect(room.getConnectionState()).toBe("open");

      room.reconnect();
      expect(room.getConnectionState()).toBe("authenticating");
      await jest.advanceTimersByTimeAsync(0); // There's a backoff delay here!
      expect(room.getConnectionState()).toBe("authenticating");
      await jest.advanceTimersByTimeAsync(500); // Wait for the increased backoff delay!
      expect(room.getConnectionState()).toBe("connecting");

      const ws2 = wss.last;
      ws2.accept();

      // This "last" one is a new/different socket instance!
      expect(ws1 === ws2).toBe(false);

      await waitUntilStatus(room, "open");
      expect(room.getConnectionState()).toBe("open");
    });
  });

  describe("Initial UpdatePresenceServerMsg", () => {
    test("skip UpdatePresence from other when initial full presence has not been received", () => {
      type P = { x?: number };
      type S = never;
      type M = never;
      type E = never;

      const { room } = createTestableRoom<P, S, M, E>({});

      const ws = makeControllableWebSocket();
      room.connect();
      room.__internal.send.simulateAuthSuccess(defaultRoomToken, ws);
      ws.server.accept();

      let others: Others<P, M> | undefined;

      room.events.others.subscribe((ev) => (others = ev.others));

      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          users: { "1": { id: undefined, scopes: [] } },
        })
      );

      // UpdatePresence sent before the initial full UpdatePresence
      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        })
      );

      expect(others).toEqual([
        // User not yet publicly visible
      ]);

      // Full UpdatePresence sent as an answer to "UserJoined" message
      room.__internal.send.incomingMessage(
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
          presence: {
            x: 2,
          },
        },
      ]);
    });
  });

  describe("initial storage", () => {
    test("initialize room with initial storage should send operation only once", async () => {
      const { expectStorage, expectMessagesSent } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>([createSerializedObject("0:0", {})], 1, { items: new LiveList() });

      expectStorage({
        items: [],
      });

      expectMessagesSent([
        { type: ClientMsgCode.UPDATE_PRESENCE, targetActor: -1, data: {} },
        { type: ClientMsgCode.FETCH_STORAGE },
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              id: "1:0",
              opId: "1:1",
              parentId: "0:0",
              parentKey: "items",
              type: 2,
            },
          ],
        },
      ]);
    });
  });
});
