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
  SECOND_POSITION,
} from "../test/utils";
import {
  ClientMessageType,
  CrdtType,
  SerializedCrdtWithId,
  ServerMessage,
  ServerMessageType,
  WebsocketCloseCodes,
} from "./live";
import { LiveList } from "./LiveList";
import { makeStateMachine, Effects, defaultState } from "./room";
import { Others } from "./types";

const defaultContext = {
  room: "room-id",
  authEndpoint: "/api/auth",
  throttleDelay: 100,
  liveblocksServer: "wss://live.liveblocks.io",
  onError: () => {},
  WebSocketPolyfill: WebSocket
}

function withDateNow(now: number, callback: () => void) {
  const realDateNow = Date.now.bind(global.Date);
  global.Date.now = jest.fn(() => now);
  try {
    callback();
  } finally {
    global.Date.now = realDateNow;
  }
}

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

    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    expect(state.connection.state).toBe("connecting");
  });

  test("initial presence should be sent once the connection is open", () => {
    const effects = mockEffects();
    const state = defaultState({ x: 0 });
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

    machine.updatePresence({ x: 0 });
    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);

    const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

    withDateNow(now, () => machine.onOpen());

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

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);

      const now = new Date(2021, 1, 1, 0, 0, 0, 0).getTime();

      withDateNow(now, () => machine.onOpen());

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

      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
      machine.onOpen();

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

      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
      machine.onOpen();

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

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

    room.updatePresence({ x: 0 });
    room.updatePresence({ x: 1 });

    room.undo();

    expect(room.selectors.getPresence()).toEqual({ x: 1 });
  });

  test("pause / resume history", async () => {
    const effects = mockEffects();
    const state = defaultState({});
    const room = makeStateMachine(state, defaultContext, effects);

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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

    room.connect();
    room.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    room.onOpen();

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
      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
      machine.onOpen();

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
      const { storage, assert, undo, redo, batch, subscribe, refSubscribe } =
        await prepareStorageTest<{
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
        refStorage,
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
          connectionId: 0,
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

      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
      machine.onOpen();

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

      machine.connect();
      machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
      machine.onOpen();

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
      const { storage, assert, machine, refStorage, reconnect } =
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

      machine.onClose(
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
  });
});
