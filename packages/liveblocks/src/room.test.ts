import { mockEffects, MockWebSocket, serverMessage } from "../test/utils";
import {
  ClientMessageType,
  CrdtType,
  ServerMessage,
  ServerMessageType,
  WebsocketCloseCodes,
} from "./live";
import { makeStateMachine, Effects, defaultState } from "./room";
import { Others } from "./types";

const defaultContext = {
  room: "room-id",
  authEndpoint: "/api/auth",
  throttleDelay: 100,
  liveblocksServer: "wss://live.liveblocks.io",
  onError: () => {},
};

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
});
