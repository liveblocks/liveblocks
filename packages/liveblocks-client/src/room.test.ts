import {
  prepareStorageTest,
  createSerializedObject,
  createSerializedList,
  mockEffects,
  MockWebSocket,
  serverMessage,
  objectToJson,
  createSerializedRegister,
  FIRST_POSITION,
  prepareIsolatedStorageTest,
  reconnect,
  waitFor,
  withDateNow,
} from "../test/utils";
import {
  ClientMessageType,
  CrdtType,
  SerializedCrdtWithId,
  ServerMessageType,
  WebsocketCloseCodes,
} from "./live";
import { LiveList } from "./LiveList";
import { makeStateMachine, defaultState, createRoom } from "./room";
import { Authentication, Others } from "./types";
import { rest } from "msw";
import { setupServer } from "msw/node";

const defaultContext = {
  room: "room-id",
  throttleDelay: 100,
  liveblocksServer: "wss://live.liveblocks.io/v5",
  authentication: {
    type: "private",
    url: "/api/auth",
  } as Authentication,
};

describe("room / auth", () => {
  let reqCount = 0;
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJrNXdtaDBGOVVMbHJ6TWdadFMyWl8iLCJhcHBJZCI6IjYwNWE0ZmQzMWEzNmQ1ZWE3YTJlMDkxNCIsImFjdG9yIjowLCJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2N30.AinBUN1gzA1-QdwrQ3cT1X4tNM_7XYCkKgHH94M5wszX-1AEDIgsBdM_7qN9cv0Y7SDFTUVGYLinHgpBonE8tYiNTe4uSpVUmmoEWuYLgsdUccHj5IJYlxPDGb1mgesSNKdeyfkFnu8nFjramLQXBa5aBb5Xq721m4Lgy2dtL_nFicavhpyCsdTVLSjloCDlQpQ99UPY--3ODNbbznHGYu8IyI1DnqQgDPlbAbFPRF6CBZiaUZjSFTRGnVVPE0VN3NunKHimMagBfHrl4AMmxG4kFN8ImK1_7oXC_br1cqoyyBTs5_5_XeA9MTLwbNDX8YBPtjKP1z2qTDpEc22Oxw";
  const server = setupServer(
    rest.post("/api/auth", (req, res, ctx) => {
      if (reqCount === 0) {
        reqCount++;
        return res(
          ctx.json({
            actor: 0,
            token: token,
          })
        );
      } else {
        return res(
          ctx.json({
            actor: 1,
            token: token,
          })
        );
      }
    }),
    rest.post("/api/403", (req, res, ctx) => {
      return res(ctx.status(403));
    }),
    rest.post("/api/not-json", (req, res, ctx) => {
      return res(ctx.status(202), ctx.text("this is not json"));
    }),
    rest.post("/api/missing-token", (req, res, ctx) => {
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

  test("should reuse token after reconnect", async () => {
    const room = createRoom(
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/api/auth",
        },
      }
    );

    room.connect();

    await waitFor(() => room.room.getSelf()?.connectionId === 0);

    const tokenExpDate = 1616727267;
    withDateNow(tokenExpDate - 600, async () => {
      // @ts-ignore
      room.room.internalDevTools.sendCloseEvent({
        reason: "App error",
        code: 4002,
        wasClean: true,
      });

      await waitFor(() => room.room.getSelf()?.connectionId === 0);
    });
  });

  test("should not reuse token after reconnect when expired", async () => {
    const room = createRoom(
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/api/auth",
        },
      }
    );

    room.connect();

    await waitFor(() => room.room.getSelf()?.connectionId === 0);

    const tokenExpDate = 1616727267;
    withDateNow(tokenExpDate + 1, async () => {
      // @ts-ignore
      room.room.internalDevTools.sendCloseEvent({
        reason: "App error",
        code: 4002,
        wasClean: true,
      });

      await waitFor(() => room.room.getSelf()?.connectionId === 1);
    });
  });

  test("private authentication with 403 status should throw", async () => {
    const room = createRoom(
      {},
      {
        ...defaultContext,
        authentication: {
          type: "private",
          url: "/api/403",
        },
      }
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        `Expected a status 200 but got 403 when doing a POST request on "/api/403"`
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
          url: "/api/not-json",
        },
      }
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        `Expected a json when doing a POST request on "/api/not-json". SyntaxError: Unexpected token h in JSON at position 1`
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
          url: "/api/missing-token",
        },
      }
    );

    room.connect();
    await waitFor(() => consoleErrorSpy.mock.calls.length > 0);
    room.disconnect();

    expect(consoleErrorSpy.mock.calls[0][1]).toEqual(
      new Error(
        `Expected a json with a string token when doing a POST request on "/api/missing-token", but got {}`
      )
    );
  });
});

describe("room", () => {
  test("connect should transition to authenticating if closed and execute authenticate", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.connect();

    expect(state.connection.state).toEqual("authenticating");
    expect(effects.authenticate).toHaveBeenCalled();
  });

  test("connect should stay authenticating if connect is called multiple times and call authenticate only once", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.connect();
    expect(state.connection.state).toEqual("authenticating");

    machine.connect();
    expect(state.connection.state).toEqual("authenticating");
    expect(effects.authenticate).toHaveBeenCalledTimes(1);
  });

  test("authentication success should transition to connecting", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket(""));
    expect(state.connection.state).toBe("connecting");
  });

  test("initial presence should be sent once the connection is open", () => {
    const effects = mockEffects();
    const state = defaultState({ x: 0 });
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      {
        type: ClientMessageType.UpdatePresence,
        data: { x: 0 },
      },
    ]);
  });

  test("if presence has been updated before the connection, it should be sent when the connection is ready", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.updatePresence({ x: 0 });
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      {
        type: ClientMessageType.UpdatePresence,
        data: { x: 0 },
      },
    ]);
  });

  test("if no presence has been set before the connection is open, an empty presence should be sent", () => {
    const effects = mockEffects();
    const state = defaultState();
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    expect(effects.send).toHaveBeenCalledWith([
      {
        type: ClientMessageType.UpdatePresence,
        data: {},
      },
    ]);
  });

  test("initial presence followed by updatePresence should delay sending the second presence event", () => {
    const effects = mockEffects();
    const state = defaultState({ x: 0 });
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);

    const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

    withDateNow(now, () => ws.open());

    withDateNow(now + 30, () => machine.updatePresence({ x: 1 }));

    expect(effects.delayFlush).toBeCalledWith(
      defaultContext.throttleDelay - 30
    );
    expect(effects.send).toHaveBeenCalledWith([
      {
        type: ClientMessageType.UpdatePresence,
        data: { x: 0 },
      },
    ]);
    expect(state.buffer.presence).toEqual({ x: 1 });
  });

  test("should replace current presence and set flushData presence when connection is closed", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.buffer.presence).toEqual({ x: 0 });
  });

  test("should merge current presence and set flushData presence when connection is closed", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.buffer.presence).toEqual({ x: 0 });

    machine.updatePresence({ y: 0 });
    expect(state.me).toEqual({ x: 0, y: 0 });
    expect(state.buffer.presence).toEqual({ x: 0, y: 0 });
  });

  test("others should be iterable", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    machine.onMessage(
      serverMessage({
        type: ServerMessageType.UpdatePresence,
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
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    machine.onMessage(
      serverMessage({
        type: ServerMessageType.UpdatePresence,
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
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);

      const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

      withDateNow(now, () => ws.open());

      expect(effects.send).nthCalledWith(1, [
        {
          type: ClientMessageType.UpdatePresence,
          data: {},
        },
      ]);

      withDateNow(now + 1000, () => machine.broadcastEvent({ type: "EVENT" }));

      expect(effects.send).nthCalledWith(2, [
        {
          type: ClientMessageType.ClientEvent,
          event: { type: "EVENT" },
        },
      ]);
    });

    test("should not send event to other users if not connected", () => {
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

      machine.broadcastEvent({ type: "EVENT" });

      expect(effects.send).not.toHaveBeenCalled();

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        {
          type: ClientMessageType.UpdatePresence,
          data: {},
        },
      ]);
    });

    test("should queue event if socket is not ready and shouldQueueEventsIfNotReady is true", () => {
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

      machine.broadcastEvent(
        { type: "EVENT" },
        { shouldQueueEventIfNotReady: true }
      );

      expect(effects.send).not.toHaveBeenCalled();

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      expect(effects.send).toBeCalledTimes(1);
      expect(effects.send).toHaveBeenCalledWith([
        {
          type: ClientMessageType.UpdatePresence,
          data: {},
        },
        {
          type: ClientMessageType.ClientEvent,
          event: { type: "EVENT" },
        },
      ]);
    });
  });

  test("storage should be initialized properly", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    const getStoragePromise = machine.getStorage<{ x: number }>();

    machine.onMessage(
      serverMessage({
        type: ServerMessageType.InitialStorageState,
        items: [["root", { type: CrdtType.Object, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    expect(storage.root.toObject()).toEqual({ x: 0 });
  });

  test("undo redo with presence", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });

    room.redo();

    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("if presence is not added to history during a batch, it should not impact the undo/stack", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    const getStoragePromise = room.getStorage<{ x: number }>();

    room.onMessage(
      serverMessage({
        type: ServerMessageType.InitialStorageState,
        items: [["root", { type: CrdtType.Object, data: { x: 0 } }]],
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
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });
    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.pauseHistory();
    room.resumeHistory();

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });
  });

  test("undo redo with presence that do not impact presence", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("pause / resume history", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.pauseHistory();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
    }

    expect(room.selectors.getPresence()).toEqual({ x: 10 });

    room.resumeHistory();

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });

    room.redo();

    expect(room.selectors.getPresence()).toEqual({ x: 10 });
  });

  test("undo while history is paused", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.updatePresence({ x: 1 }, { addToHistory: true });

    room.pauseHistory();

    for (let i = 1; i <= 10; i++) {
      room.updatePresence({ x: i }, { addToHistory: true });
    }

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });
  });

  test("undo redo with presence + storage", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    const getStoragePromise = room.getStorage<{ x: number }>();

    room.onMessage(
      serverMessage({
        type: ServerMessageType.InitialStorageState,
        items: [["root", { type: CrdtType.Object, data: { x: 0 } }]],
      })
    );

    const storage = await getStoragePromise;

    room.updatePresence({ x: 0 }, { addToHistory: true });

    room.batch(() => {
      room.updatePresence({ x: 1 }, { addToHistory: true });
      storage.root.set("x", 1);
    });

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 0 });
    expect(storage.root.toObject()).toEqual({ x: 0 });

    room.redo();

    expect(storage.root.toObject()).toEqual({ x: 1 });
    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("batch without changes should not erase redo stack", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    const ws = new MockWebSocket("");
    room.connect();
    room.authenticationSuccess({ actor: 0 }, ws);
    ws.open();

    const getStoragePromise = room.getStorage<{ x: number }>();

    room.onMessage(
      serverMessage({
        type: ServerMessageType.InitialStorageState,
        items: [["root", { type: CrdtType.Object, data: { x: 0 } }]],
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
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

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
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);
      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      const getStoragePromise = machine.getStorage<{ x: number }>();

      machine.onMessage(
        serverMessage({
          type: ServerMessageType.InitialStorageState,
          items: [["root", { type: CrdtType.Object, data: { x: 0 } }]],
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
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
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

      expect(itemsSubscriber).toHaveBeenCalledTimes(1);
      expect(itemsSubscriber).toHaveBeenCalledWith(items);
      expect(refItemsSubscriber).toHaveBeenCalledTimes(1);
      expect(refItemsSubscriber).toHaveBeenCalledWith(refItems);

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
      const {
        storage,
        assert,
        undo,
        redo,
        batch,
        subscribe,
        refSubscribe,
        updatePresence,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
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
      let refOthers: Others | undefined;
      const refPresenceSubscriber = (o: any) => (refOthers = o);

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

      expect(itemsSubscriber).toHaveBeenCalledTimes(1);
      expect(itemsSubscriber).toHaveBeenCalledWith(items);
      expect(refItemsSubscriber).toHaveBeenCalledTimes(1);
      expect(refItemsSubscriber).toHaveBeenCalledWith(refItems);

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
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

      const callback = jest.fn();

      const unsubscribe = machine.subscribe("my-presence", callback);

      machine.updatePresence({ x: 0 });

      unsubscribe();

      machine.updatePresence({ x: 1 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 0 });
    });

    test("others", () => {
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);
      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      let others: Others | undefined;

      const unsubscribe = machine.subscribe("others", (o) => (others = o));

      machine.onMessage(
        serverMessage({
          type: ServerMessageType.UpdatePresence,
          data: { x: 2 },
          actor: 1,
        })
      );

      unsubscribe();

      machine.onMessage(
        serverMessage({
          type: ServerMessageType.UpdatePresence,
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
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      const callback = jest.fn();

      machine.subscribe("event", callback);

      machine.onMessage(
        serverMessage({
          type: ServerMessageType.Event,
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
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = storage.root.get("items");

      assert({ items: [] });

      items.push("A");
      assert({
        items: ["A"],
      });

      ws.closeFromBackend(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      // Operation done offline
      items.push("B");

      const storageJson = objectToJson(storage.root);
      expect(storageJson).toEqual({ items: ["A", "B"] });
      const refStorageJson = objectToJson(refStorage.root);
      expect(refStorageJson).toEqual({ items: ["A"] });

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
        [
          "1:0",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: "!",
            data: "A",
          },
        ],
      ];

      await reconnect(2, newInitStorage);

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
        items: LiveList<string>;
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

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["2:0", { type: CrdtType.List, parentId: "0:0", parentKey: "items2" }],
        [
          "2:1",
          {
            type: CrdtType.Register,
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
      const { machine, refMachine, reconnect, ws } =
        await prepareStorageTest<unknown>(
          [createSerializedObject("0:0", {})],
          1
        );

      machine.updatePresence({ x: 1 });

      ws.closeFromBackend(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      await reconnect(2);

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
      const effects = mockEffects();

      const state = defaultState({ x: 0 });
      const machine = makeStateMachine(state, defaultContext, effects);

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
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
      const effects = mockEffects();

      const state = defaultState({ x: 0 });
      const machine = makeStateMachine(state, defaultContext, effects);

      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
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

  describe("Initial UpdatePresenceMessage", () => {
    test("skip UpdatePresence from other when initial full presence has not been received", () => {
      const effects = mockEffects();
      const state = defaultState({});
      const machine = makeStateMachine(state, defaultContext, effects);
      const ws = new MockWebSocket("");
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, ws);
      ws.open();

      let others: Others | undefined;

      machine.subscribe("others", (o) => (others = o));

      machine.onMessage(
        serverMessage({
          type: ServerMessageType.RoomState,
          users: { "1": { id: undefined } },
        })
      );

      // UpdatePresence sent before the initial full UpdatePresence
      machine.onMessage(
        serverMessage({
          type: ServerMessageType.UpdatePresence,
          data: { x: 2 },
          actor: 1,
        })
      );

      expect(others?.toArray()).toEqual([
        {
          connectionId: 1,
          id: undefined,
          info: undefined,
        },
      ]);

      // Full UpdatePresence sent as an answer to "UserJoined" message
      machine.onMessage(
        serverMessage({
          type: ServerMessageType.UpdatePresence,
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
        {
          data: {},
          type: ClientMessageType.UpdatePresence,
        },
        { type: ClientMessageType.FetchStorage },
        {
          type: ClientMessageType.UpdateStorage,
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
