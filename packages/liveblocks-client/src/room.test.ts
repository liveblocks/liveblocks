import { rest } from "msw";
import { setupServer } from "msw/node";

import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIRST_POSITION,
  mockEffects,
  MockWebSocket,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  reconnect,
  serverMessage,
  waitFor,
  withDateNow,
} from "../test/utils";
import type { RoomAuthToken } from "./AuthToken";
import { lsonToJson } from "./immutable";
import { LiveList } from "./LiveList";
import { createRoom, defaultState, makeStateMachine } from "./room";
import type { Authentication, IdTuple, Others, SerializedCrdt } from "./types";
import {
  ClientMsgCode,
  CrdtType,
  ServerMsgCode,
  WebsocketCloseCodes,
} from "./types";
import type { JsonObject } from "./types/Json";
import type { LsonObject } from "./types/Lson";

const defaultContext = {
  roomId: "room-id",
  throttleDelay: 100,
  liveblocksServer: "wss://live.liveblocks.io/v6",
  authentication: {
    type: "private",
    url: "/mocked-api/auth",
  } as Authentication,
};

const defaultRoomToken: RoomAuthToken = {
  appId: "my-app",
  roomId: "my-room",
  actor: 0,
  scopes: [],
};

function setupStateMachine<
  TPresence extends JsonObject,
  TStorage extends LsonObject
>(initialPresence?: TPresence) {
  const effects = mockEffects<TPresence>();
  const state = defaultState<TPresence, TStorage>(initialPresence);
  const machine = makeStateMachine<TPresence, TStorage>(
    state,
    defaultContext,
    effects
  );
  return { machine, state, effects };
}

describe.only("room / auth", () => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2Nywicm9vbUlkIjoiazV3bWgwRjlVTGxyek1nWnRTMlpfIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJhY3RvciI6MCwic2NvcGVzIjpbIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIiwicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.IQFyw54-b4F6P0MTSzmBVwdZi2pwPaxZwzgkE2l0Mi4";
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
        {},
        {
          ...defaultContext,
          authentication: {
            type: "custom",
            callback: (room) =>
              new Promise((resolve, reject) => {
                // @ts-expect-error: testing for missing token in callback response
                resolve(response);
              }),
          },
        }
      );

      room.connect();
      await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
      room.disconnect();

      expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
        new Error(
          'Authentication error. We expect the authentication callback to return a token, but it did not. Hint: the return value should look like { token: "..." }'
        )
      );
    }
  );

  test("private authentication with 403 status should throw", async () => {
    const room = createRoom(
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/mocked-api/403",
        },
      }
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
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/mocked-api/not-json",
        },
      }
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
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/mocked-api/missing-token",
        },
      }
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
  test("connect should transition to authenticating if closed and execute authenticate", () => {
    const { machine, state, effects } = setupStateMachine({});
    machine.connect();
    expect(state.connection.state).toEqual("authenticating");
    expect(effects.authenticate).toHaveBeenCalled();
  });

  test("connect should stay authenticating if connect is called multiple times and call authenticate only once", () => {
    const { machine, state, effects } = setupStateMachine({});
    machine.connect();
    expect(state.connection.state).toEqual("authenticating");
    machine.connect();
    expect(state.connection.state).toEqual("authenticating");
    expect(effects.authenticate).toHaveBeenCalledTimes(1);
  });

  test("authentication success should transition to connecting", () => {
    const { machine, state } = setupStateMachine({});
    machine.authenticationSuccess(defaultRoomToken, new MockWebSocket(""));
    expect(state.connection.state).toBe("connecting");
  });

  test("initial presence should be sent once the connection is open", () => {
    const { machine, effects } = setupStateMachine({ x: 0 });

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 0 } },
    ]);
  });

  test("if presence has been updated before the connection, it should be sent when the connection is ready", () => {
    const { machine, effects } = setupStateMachine({});

    const ws = new MockWebSocket("");
    machine.updatePresence({ x: 0 });
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 0 } },
    ]);
  });

  test("if no presence has been set before the connection is open, an empty presence should be sent", () => {
    const { machine, effects } = setupStateMachine();

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      { type: ClientMsgCode.UPDATE_PRESENCE, data: {} },
    ]);
  });

  test("initial presence followed by updatePresence should delay sending the second presence event", () => {
    const { machine, state, effects } = setupStateMachine({ x: 0 });

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);

    const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

    withDateNow(now, () => ws.open());

    withDateNow(now + 30, () => machine.updatePresence({ x: 1 }));

    expect(effects.delayFlush).toBeCalledWith(
      defaultContext.throttleDelay - 30
    );
    expect(effects.send).toHaveBeenCalledWith([
      { type: ClientMsgCode.UPDATE_PRESENCE, data: { x: 0 } },
    ]);
    expect(state.buffer.presence).toEqual({ x: 1 });
  });

  test("should replace current presence and set flushData presence when connection is closed", () => {
    const { machine, state } = setupStateMachine({});

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.buffer.presence).toEqual({ x: 0 });
  });

  test("should merge current presence and set flushData presence when connection is closed", () => {
    const { machine, state } = setupStateMachine({});

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.buffer.presence).toEqual({ x: 0 });

    machine.updatePresence({ y: 0 });
    expect(state.me).toEqual({ x: 0, y: 0 });
    expect(state.buffer.presence).toEqual({ x: 0, y: 0 });
  });

  test("others should be iterable", () => {
    const { machine } = setupStateMachine({});

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    machine.onMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
      })
    );

    const users = [];
    for (const user of machine.selectors.getOthers()) {
      users.push(user);
    }

    expect(users).toEqual([{ connectionId: 1, presence: { x: 2 } }]);
  });

  test("should clear users when socket close", () => {
    const { machine } = setupStateMachine({});

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    machine.onMessage(
      serverMessage({
        type: ServerMsgCode.UPDATE_PRESENCE,
        data: { x: 2 },
        actor: 1,
      })
    );

    expect(machine.selectors.getOthers().toArray()).toEqual([
      { connectionId: 1, presence: { x: 2 } },
    ]);

    machine.onClose(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_ABNORMAL,
        wasClean: false,
      })
    );

    expect(machine.selectors.getOthers().toArray()).toEqual([]);
  });

  describe("broadcast", () => {
    test("should send event to other users", () => {
      const { machine, effects } = setupStateMachine({});

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);

      const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

      withDateNow(now, () => ws.open());

      expect(effects.send).nthCalledWith(1, [
        { type: ClientMsgCode.UPDATE_PRESENCE, data: {} },
      ]);

      // Event payload can be any JSON value
      withDateNow(now + 1000, () => machine.broadcastEvent({ type: "EVENT" }));
      withDateNow(now + 2000, () => machine.broadcastEvent([1, 2, 3]));
      withDateNow(now + 3000, () => machine.broadcastEvent(42));
      withDateNow(now + 4000, () => machine.broadcastEvent("hi"));

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
      const { machine, effects } = setupStateMachine({});

      machine.broadcastEvent({ type: "EVENT" });

      expect(effects.send).not.toHaveBeenCalled();

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        { type: ClientMsgCode.UPDATE_PRESENCE, data: {} },
      ]);
    });

    test("should queue event if socket is not ready and shouldQueueEventsIfNotReady is true", () => {
      const { machine, effects } = setupStateMachine({});

      machine.broadcastEvent(
        { type: "EVENT" },
        { shouldQueueEventIfNotReady: true }
      );

      expect(effects.send).not.toHaveBeenCalled();

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        { type: ClientMsgCode.UPDATE_PRESENCE, data: {} },
        { type: ClientMsgCode.BROADCAST_EVENT, event: { type: "EVENT" } },
      ]);
    });
  });

  test("storage should be initialized properly", async () => {
    const { machine } = setupStateMachine({});

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    const getStoragePromise = machine.getStorage();

    machine.onMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    expect(storage.root.toObject()).toEqual({ x: 0 });
  });

  test("undo redo with presence", async () => {
    const { machine: room, state } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    expect(state.buffer.presence).toEqual(null);
    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(state.buffer.presence).toEqual({ x: 0 });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(state.buffer.presence).toEqual({ x: 1 });

    room.undo();

    expect(state.buffer.presence).toEqual({ x: 0 });
    expect(room.selectors.getPresence()).toEqual({ x: 0 });

    room.redo();

    expect(state.buffer.presence).toEqual({ x: 1 });
    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("if presence is not added to history during a batch, it should not impact the undo/stack", async () => {
    const { machine: room } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    const getStoragePromise = room.getStorage();

    room.onMessage(
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

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 1 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.redo();
  });

  test("if nothing happened while the history was paused, the undo stack should not be impacted", () => {
    const { machine: room, state } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });
    expect(state.buffer.presence).toEqual({ x: 1 });

    room.pauseHistory();
    room.resumeHistory();

    room.undo();

    expect(state.buffer.presence).toEqual({ x: 0 });
    expect(room.selectors.getPresence()).toEqual({ x: 0 });
  });

  test("undo redo with presence that do not impact presence", async () => {
    const { machine: room } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("pause / resume history", async () => {
    const { machine: room, state } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    expect(state.buffer.presence).toEqual({ x: 0 });

    room.pauseHistory();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
      expect(state.buffer.presence).toEqual({ x: i });
    }

    expect(room.selectors.getPresence()).toEqual({ x: 10 });
    expect(state.buffer.presence).toEqual({ x: 10 });

    room.resumeHistory();

    room.undo();

    expect(state.buffer.presence).toEqual({ x: 0 });
    expect(room.selectors.getPresence()).toEqual({ x: 0 });

    room.redo();

    expect(state.buffer.presence).toEqual({ x: 10 });
    expect(room.selectors.getPresence()).toEqual({ x: 10 });
  });

  test("undo while history is paused", async () => {
    const { machine: room, state } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.pauseHistory();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
    }

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });

    expect(state.buffer.presence).toEqual({ x: 0 });
  });

  test("undo redo with presence + storage", async () => {
    const { machine: room, state } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    const getStoragePromise = room.getStorage();

    room.onMessage(
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

    expect(state.buffer.presence).toEqual({ x: 1 });

    room.undo();

    expect(state.buffer.presence).toEqual({ x: 0 });
    expect(room.selectors.getPresence()).toEqual({ x: 0 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.redo();

    expect(state.buffer.presence).toEqual({ x: 1 });
    expect(storage.root.toObject()).toEqual({ x: 1 });
    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("batch without changes should not erase redo stack", async () => {
    const { machine: room } = setupStateMachine({});

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess(defaultRoomToken, ws);
    ws.open();

    const getStoragePromise = room.getStorage();

    room.onMessage(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    storage.root.set("x", 1);

    room.undo();

    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.batch(() => {});

    room.redo();

    expect(storage.root.toObject()).toEqual({ x: 1 });
  });

  describe("subscription", () => {
    test("batch my-presence", () => {
      const { machine } = setupStateMachine({});

      const callback = jest.fn();

      machine.subscribe("my-presence", callback);

      machine.batch(() => {
        machine.updatePresence({ x: 0 });
        machine.updatePresence({ y: 1 });
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 0, y: 1 });
    });

    test("batch storage and presence", async () => {
      const { machine } = setupStateMachine({});

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      const getStoragePromise = machine.getStorage();

      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: [["root", { type: CrdtType.OBJECT, data: { x: 0 } }]],
        })
      );

      const storage = await getStoragePromise;

      const presenceSubscriber = jest.fn();
      const storageRootSubscriber = jest.fn();
      machine.subscribe("my-presence", presenceSubscriber);
      machine.subscribe(storage.root, storageRootSubscriber);

      machine.batch(() => {
        machine.updatePresence({ x: 0 });
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
      const { storage, assert, undo, batch } = await prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 1 })], 1);

      storage.root.set("a", 2);

      // Batch without operations on storage or presence
      batch(() => {});

      assert({ a: 2 });

      undo();

      assert({ a: 1 });
    });

    test("batch storage with changes from server", async () => {
      const { storage, assert, undo, redo, batch, subscribe, refSubscribe } =
        await prepareStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = storage.root.get("items");
      const refItems = storage.root.get("items");

      const itemsSubscriber = jest.fn();
      const refItemsSubscriber = jest.fn();

      subscribe(items, itemsSubscriber);
      refSubscribe(refItems, refItemsSubscriber);

      batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      assert({
        items: ["A", "B", "C"],
      });

      undo();

      assert({
        items: [],
      });

      redo();

      assert({
        items: ["A", "B", "C"],
      });
    });

    test("batch storage and presence with changes from server", async () => {
      type P = { x?: number };
      type S = { items: LiveList<string> };

      const {
        storage,
        assert,
        undo,
        redo,
        batch,
        subscribe,
        refSubscribe,
        updatePresence,
      } = await prepareStorageTest<S, P>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");
      const refItems = storage.root.get("items");

      const itemsSubscriber = jest.fn();
      const refItemsSubscriber = jest.fn();
      let refOthers: Others<P> | undefined;
      const refPresenceSubscriber = (o: Others<P>) => (refOthers = o);

      subscribe(items, itemsSubscriber);
      refSubscribe(refItems, refItemsSubscriber);
      refSubscribe("others", refPresenceSubscriber);

      batch(() => {
        updatePresence({ x: 0 });
        updatePresence({ x: 1 });
        items.push("A");
        items.push("B");
        items.push("C");
      });

      assert({
        items: ["A", "B", "C"],
      });

      expect(refOthers?.toArray()).toEqual([
        {
          connectionId: 1,
          presence: {
            x: 1,
          },
        },
      ]);

      undo();

      assert({
        items: [],
      });

      redo();

      assert({
        items: ["A", "B", "C"],
      });
    });

    test("my-presence", () => {
      const { machine } = setupStateMachine({});

      const callback = jest.fn();

      const unsubscribe = machine.subscribe("my-presence", callback);

      machine.updatePresence({ x: 0 });

      unsubscribe();

      machine.updatePresence({ x: 1 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 0 });
    });

    test("others", () => {
      type P = { x?: number };

      const { machine } = setupStateMachine<P, never>({});

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      let others: Others<P> | undefined;

      const unsubscribe = machine.subscribe<P>("others", (o) => (others = o));

      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        })
      );

      unsubscribe();

      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 3 },
          actor: 1,
        })
      );

      expect(others?.toArray()).toEqual([
        {
          connectionId: 1,
          presence: {
            x: 2,
          },
        },
      ]);
    });

    test("event", () => {
      const { machine } = setupStateMachine({});

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      const callback = jest.fn();

      machine.subscribe("event", callback);

      machine.onMessage(
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
  });

  describe("offline", () => {
    test("disconnect and reconnect with offline changes", async () => {
      const { storage, assert, machine, refStorage, reconnect, ws } =
        await prepareStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = storage.root.get("items");

      assert({ items: [] });

      items.push("A");
      items.push("C"); // Will be removed by other client when offline
      assert({
        items: ["A", "C"],
      });

      ws.closeFromBackend(
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

      assert({
        items: ["A", "B"],
      });

      machine.undo();

      assert({
        items: ["A"],
      });
    });

    test("disconnect and reconnect with remote changes", async () => {
      const { assert, machine } = await prepareIsolatedStorageTest<{
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

      assert({ items: ["a"] });

      machine.onClose(
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

      reconnect(machine, 3, newInitStorage);

      assert({
        items2: ["B"],
      });
    });

    test("disconnect and reconnect should keep user current presence", async () => {
      const { machine, refMachine, reconnect, ws } = await prepareStorageTest<
        never,
        { x: number }
      >([createSerializedObject("0:0", {})], 1);

      machine.updatePresence({ x: 1 });

      ws.closeFromBackend(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      reconnect(2);

      const refMachineOthers = refMachine.selectors.getOthers().toArray();

      expect(refMachineOthers).toEqual([
        { connectionId: 1, id: undefined, info: undefined, presence: { x: 1 } }, // old user is not cleaned directly
        { connectionId: 2, id: undefined, info: undefined, presence: { x: 1 } },
      ]);
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
      const { machine, state } = setupStateMachine({ x: 0 });

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      ws.closeFromBackend(
        new CloseEvent("close", {
          code: 1006,
          wasClean: false,
        })
      );

      expect(consoleWarnSpy.mock.calls[0][0]).toEqual(
        "Connection to Liveblocks websocket server closed (code: 1006). Retrying in 250ms."
      );

      expect(state.numberOfRetry).toEqual(1);
    });

    test("when error code 4002", () => {
      const { machine, state } = setupStateMachine({ x: 0 });

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      ws.closeFromBackend(
        new CloseEvent("close", {
          code: 4002,
          wasClean: false,
        })
      );

      expect(consoleErrorSpy.mock.calls[0][0]).toEqual(
        "Connection to Liveblocks websocket server closed. Reason:  (code: 4002). Retrying in 2000ms."
      );

      expect(state.numberOfRetry).toEqual(1);
    });
  });

  describe("Initial UpdatePresenceServerMsg", () => {
    test("skip UpdatePresence from other when initial full presence has not been received", () => {
      type P = { x?: number };
      type S = never;

      const { machine } = setupStateMachine<P, S>({});

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess(defaultRoomToken, ws);
      ws.open();

      let others: Others<P> | undefined;

      machine.subscribe<P>("others", (o) => (others = o));

      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          users: { "1": { id: undefined } },
        })
      );

      // UpdatePresence sent before the initial full UpdatePresence
      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
        })
      );

      expect(others?.toArray()).toEqual([
        { connectionId: 1, id: undefined, info: undefined },
      ]);

      // Full UpdatePresence sent as an answer to "UserJoined" message
      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_PRESENCE,
          data: { x: 2 },
          actor: 1,
          targetActor: 0,
        })
      );

      expect(others?.toArray()).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
          presence: {
            x: 2,
          },
        },
      ]);
    });
  });

  describe("defaultStorage", () => {
    test("initialize room with defaultStorage should send operation only once", async () => {
      const { assert, assertMessagesSent } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>([createSerializedObject("0:0", {})], 1, { items: new LiveList() });

      assert({
        items: [],
      });

      assertMessagesSent([
        { data: {}, type: ClientMsgCode.UPDATE_PRESENCE },
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
