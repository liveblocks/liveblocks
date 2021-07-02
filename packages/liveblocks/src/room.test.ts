import {
  ClientMessageType,
  ServerMessageType,
  WebsocketCloseCodes,
} from "./live";
import { makeStateMachine, Effects, defaultState } from "./room";

const defaultContext = {
  room: "room-id",
  authEndpoint: "/api/auth",
  throttleDelay: 100,
  liveblocksServer: "wss://live.liveblocks.io",
  onError: () => {},
};

function mockEffects(): Effects {
  return {
    authenticate: jest.fn(),
    delayFlush: jest.fn(),
    send: jest.fn(),
    schedulePongTimeout: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    scheduleReconnect: jest.fn(),
  };
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
    expect(state.flushData.presence).toEqual({ x: 1 });
  });

  test("should replace current presence and set flushData presence when connection is closed", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.flushData.presence).toEqual({ x: 0 });
  });

  test("should merge current presence and set flushData presence when connection is closed", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.updatePresence({ x: 0 });

    expect(state.me).toEqual({ x: 0 });
    expect(state.flushData.presence).toEqual({ x: 0 });

    machine.updatePresence({ y: 0 });
    expect(state.me).toEqual({ x: 0, y: 0 });
    expect(state.flushData.presence).toEqual({ x: 0, y: 0 });
  });

  test("should clear users when socket close", () => {
    const effects = mockEffects();
    const state = defaultState({});
    const machine = makeStateMachine(state, defaultContext, effects);

    machine.connect();
    machine.authenticationSuccess({ actor: 0 }, new MockWebSocket("") as any);
    machine.onOpen();

    machine.onMessage(
      new MessageEvent("message", {
        data: JSON.stringify({
          type: ServerMessageType.UpdatePresence,
          data: { x: 2 },
          actor: 1,
        }),
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
});

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  isMock = true;

  callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  sentMessages: string[] = [];
  readyState: number;

  constructor(public url: string) {
    this.readyState = WebSocket.CLOSED;
    MockWebSocket.instances.push(this);
  }

  addEventListener<T extends "open" | "close" | "error" | "message">(
    event: T,
    callback: (event: WebSocketEventMap[T]) => void
  ) {
    this.callbacks[event].push(callback as any);
  }

  removeEventListener<T extends "open" | "close" | "error" | "message">(
    event: T,
    callback: (event: WebSocketEventMap[T]) => void
  ) {
    remove(this.callbacks[event], callback as any);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {}
}

window.WebSocket = MockWebSocket as any;

function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}
