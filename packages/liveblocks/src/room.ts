import {
  Others,
  Presence,
  ClientOptions,
  Room,
  MyPresenceCallback,
  OthersEventCallback,
  RoomEventCallbackMap,
  AuthEndpoint,
  EventCallback,
  User,
  Connection,
  ErrorCallback,
  OthersEvent,
  AuthenticationToken,
  ConnectionCallback,
} from "./types";
import { remove } from "./utils";
import auth, { parseToken } from "./authentication";
import {
  ClientMessage,
  ClientMessageType,
  ServerMessageType,
  UserLeftMessage,
  Op,
  EventMessage,
  RoomStateMessage,
  UpdatePresenceMessage,
  UserJoinMessage,
} from "./live";
import Storage from "./storage";

const BACKOFF_RETRY_DELAYS = [250, 500, 1000, 2000, 4000, 8000, 10000];

const HEARTBEAT_INTERVAL = 30000;
// const WAKE_UP_CHECK_INTERVAL = 2000;
const PONG_TIMEOUT = 2000;

function isValidRoomEventType(value: string) {
  return (
    value === "my-presence" ||
    value === "others" ||
    value === "event" ||
    value === "error" ||
    value === "connection"
  );
}

function makeIdFactory(connectionId: number): IdFactory {
  let count = 0;
  return () => `${connectionId}:${count++}`;
}

function makeOthers<T extends Presence>(presenceMap: {
  [key: number]: User<T>;
}): Others<T> {
  const array = Object.values(presenceMap);

  return {
    get count() {
      return array.length;
    },
    map(callback) {
      return array.map(callback);
    },
    toArray() {
      return array;
    },
  };
}

function log(...params: any[]) {
  return;
  console.log(...params, new Date().toString());
}

type IdFactory = () => string;

export type State = {
  connection: Connection;
  socket: WebSocket | null;
  lastFlushTime: number;
  flushData: {
    presence: Presence | null;
    messages: ClientMessage[];
    storageOperations: Op[];
  };
  timeoutHandles: {
    flush: number | null;
    reconnect: number;
    pongTimeout: number;
  };
  intervalHandles: {
    heartbeat: number;
  };
  listeners: {
    event: EventCallback[];
    others: OthersEventCallback[];
    "my-presence": MyPresenceCallback[];
    error: ErrorCallback[];
    connection: ConnectionCallback[];
  };
  me: Presence;
  others: Others;
  users: {
    [connectionId: number]: User;
  };
  idFactory: IdFactory | null;
  numberOfRetry: number;
  defaultStorageRoot?: { [key: string]: any };
};

export type Effects = {
  authenticate(): void;
  send(messages: ClientMessage[]): void;
  delayFlush(delay: number): number;
  startHeartbeatInterval(): number;
  schedulePongTimeout(): number;
  scheduleReconnect(delay: number): number;
};

type Context = {
  room: string;
  authEndpoint: AuthEndpoint;
  liveblocksServer: string;
  throttleDelay: number;
};

export function makeStateMachine(
  state: State,
  context: Context,
  mockedEffects?: Effects
) {
  const effects: Effects = mockedEffects || {
    async authenticate() {
      try {
        const token = await auth(context.authEndpoint, context.room);
        const parsedToken = parseToken(token);
        const socket = new WebSocket(
          `${context.liveblocksServer}/?token=${token}`
        );
        socket.addEventListener("message", onMessage);
        socket.addEventListener("open", onOpen);
        socket.addEventListener("close", onClose);
        socket.addEventListener("error", onError);
        authenticationSuccess(parsedToken, socket);
      } catch (er) {
        authenticationFailure(er);
      }
    },
    send(messageOrMessages: ClientMessage | ClientMessage[]) {
      if (state.socket == null) {
        throw new Error("Can't send message if socket is null");
      }
      state.socket.send(JSON.stringify(messageOrMessages));
    },
    delayFlush(delay: number) {
      return setTimeout(tryFlushing, delay) as any;
    },
    startHeartbeatInterval() {
      return setInterval(heartbeat, HEARTBEAT_INTERVAL) as any;
    },
    schedulePongTimeout() {
      return setTimeout(pongTimeout, PONG_TIMEOUT) as any;
    },
    scheduleReconnect(delay: number) {
      return setTimeout(connect, delay) as any;
    },
  };

  function subscribe<T extends Presence>(
    type: "my-presence",
    listener: MyPresenceCallback<T>
  ): void;
  function subscribe<T extends Presence>(
    type: "others",
    listener: OthersEventCallback<T>
  ): void;
  function subscribe(type: "event", listener: EventCallback): void;
  function subscribe(type: "error", listener: ErrorCallback): void;
  function subscribe(type: "connection", listener: ConnectionCallback): void;
  function subscribe<T extends keyof RoomEventCallbackMap>(
    type: T,
    listener: RoomEventCallbackMap[T]
  ) {
    if (!isValidRoomEventType(type)) {
      throw new Error(`"${type}" is not a valid event name`);
    }
    (state.listeners[type] as RoomEventCallbackMap[T][]).push(listener);
  }

  function unsubscribe<T extends Presence>(
    type: "my-presence",
    listener: MyPresenceCallback<T>
  ): void;
  function unsubscribe<T extends Presence>(
    type: "others",
    listener: OthersEventCallback<T>
  ): void;
  function unsubscribe(type: "event", listener: EventCallback): void;
  function unsubscribe(type: "error", listener: ErrorCallback): void;
  function unsubscribe(type: "connection", listener: ConnectionCallback): void;
  function unsubscribe<T extends keyof RoomEventCallbackMap>(
    event: T,
    callback: RoomEventCallbackMap[T]
  ) {
    if (!isValidRoomEventType(event)) {
      throw new Error(`"${event}" is not a valid event name`);
    }
    const callbacks = state.listeners[event] as RoomEventCallbackMap[T][];
    remove(callbacks, callback);
  }

  function getConnectionState() {
    return state.connection.state;
  }

  function getSelf<
    TPresence extends Presence = Presence
  >(): User<TPresence> | null {
    return state.connection.state === "open" ||
      state.connection.state === "connecting"
      ? {
          connectionId: state.connection.id,
          id: state.connection.userId,
          info: state.connection.userInfo,
          presence: getPresence() as TPresence,
        }
      : null;
  }

  function connect() {
    if (typeof window === "undefined") {
      return;
    }

    if (
      state.connection.state !== "closed" &&
      state.connection.state !== "unavailable"
    ) {
      return null;
    }

    updateConnection({ state: "authenticating" });
    effects.authenticate();
  }

  function updatePresence<T extends Presence>(overrides: Partial<T>) {
    const newPresence = { ...state.me, ...overrides };

    if (state.flushData.presence == null) {
      state.flushData.presence = overrides as Presence;
    } else {
      for (const key in overrides) {
        state.flushData.presence[key] = overrides[key] as any;
      }
    }

    state.me = newPresence;

    tryFlushing();

    for (const listener of state.listeners["my-presence"]) {
      listener(state.me);
    }
  }

  function authenticationSuccess(
    token: AuthenticationToken,
    socket: WebSocket
  ) {
    updateConnection({
      state: "connecting",
      id: token.actor,
      userInfo: token.info,
      userId: token.id,
    });
    state.idFactory = makeIdFactory(token.actor);
    state.socket = socket;
  }

  function authenticationFailure(error: Error) {
    console.error(error);
    updateConnection({ state: "unavailable" });
    state.numberOfRetry++;
    state.timeoutHandles.reconnect = effects.scheduleReconnect(getRetryDelay());
  }

  function onVisibilityChange(visibilityState: VisibilityState) {
    if (visibilityState === "visible" && state.connection.state === "open") {
      log("Heartbeat after visibility change");
      heartbeat();
    }
  }

  function onUpdatePresenceMessage(message: UpdatePresenceMessage) {
    const user = state.users[message.actor];
    if (user == null) {
      state.users[message.actor] = {
        connectionId: message.actor,
        presence: message.data,
      };
    } else {
      state.users[message.actor] = {
        id: user.id,
        info: user.info,
        connectionId: message.actor,
        presence: {
          ...user.presence,
          ...message.data,
        },
      };
    }
    updateUsers({
      type: "update",
      updates: message.data,
      user: state.users[message.actor],
    });
  }

  function updateUsers(event: OthersEvent) {
    state.others = makeOthers(state.users);

    for (const listener of state.listeners["others"]) {
      listener(state.others, event);
    }
  }

  function onUserLeftMessage(message: UserLeftMessage) {
    const userLeftMessage: UserLeftMessage = message;
    const user = state.users[userLeftMessage.actor];
    if (user) {
      delete state.users[userLeftMessage.actor];
      updateUsers({ type: "leave", user });
    }
  }

  function onRoomStateMessage(message: RoomStateMessage) {
    const newUsers: { [connectionId: number]: User } = {};
    for (const key in message.users) {
      const connectionId = Number.parseInt(key);
      const user = message.users[key];
      newUsers[connectionId] = {
        connectionId,
        info: user.info,
        id: user.id,
      };
    }
    state.users = newUsers;
    updateUsers({ type: "reset" });
  }

  function onNavigatorOnline() {
    if (state.connection.state === "unavailable") {
      log("Try to reconnect after connectivity change");
      reconnect();
    }
  }

  function onEvent(message: EventMessage) {
    for (const listener of state.listeners.event) {
      listener({ connectionId: message.actor, event: message.event });
    }
  }

  function onUserJoinedMessage(message: UserJoinMessage) {
    state.users[message.actor] = {
      connectionId: message.actor,
      info: message.info,
      id: message.id,
    };
    updateUsers({ type: "enter", user: state.users[message.actor] });

    if (state.me) {
      // Send current presence to new user
      // TODO: Consider storing it on the backend
      state.flushData.messages.push({
        type: ClientMessageType.UpdatePresence,
        data: state.me!,
        targetActor: message.actor,
      });
      tryFlushing();
    }
  }

  function onMessage(event: MessageEvent) {
    if (event.data === "pong") {
      clearTimeout(state.timeoutHandles.pongTimeout);
      return;
    }

    const message = JSON.parse(event.data);
    switch (message.type) {
      case ServerMessageType.UserJoined: {
        onUserJoinedMessage(message as UserJoinMessage);
        break;
      }
      case ServerMessageType.UpdatePresence: {
        onUpdatePresenceMessage(message as UpdatePresenceMessage);
        break;
      }
      case ServerMessageType.Event: {
        onEvent(message);
        break;
      }
      case ServerMessageType.UserLeft: {
        onUserLeftMessage(message as UserLeftMessage);
        break;
      }
      case ServerMessageType.RoomState: {
        onRoomStateMessage(message as RoomStateMessage);
        break;
      }
    }

    storage.onMessage(message);
  }

  // function onWakeUp() {
  //   // Sometimes, the browser can put the webpage on pause (computer is on sleep mode for example)
  //   // The client will not know that the server has probably close the connection even if the readyState is Open
  //   // One way to detect this kind of pause is to ensure that a setInterval is not taking more than the delay it was configured with
  //   if (state.connection.state === "open") {
  //     log("Try to reconnect after laptop wake up");
  //     reconnect();
  //   }
  // }

  function onClose(event: { code: number; wasClean: boolean; reason: any }) {
    state.socket = null;

    clearTimeout(state.timeoutHandles.pongTimeout);
    clearInterval(state.intervalHandles.heartbeat);
    if (state.timeoutHandles.flush) {
      clearTimeout(state.timeoutHandles.flush);
    }
    clearTimeout(state.timeoutHandles.reconnect);

    state.users = {};
    updateUsers({ type: "reset" });

    if (event.code >= 4000 && event.code <= 4100) {
      updateConnection({ state: "failed" });

      const error = new LiveblocksError(event.reason, event.code);
      for (const listener of state.listeners.error) {
        listener(error);
      }
    } else if (event.wasClean === false) {
      updateConnection({ state: "unavailable" });
      state.numberOfRetry++;
      state.timeoutHandles.reconnect = effects.scheduleReconnect(
        getRetryDelay()
      );
    } else {
      updateConnection({ state: "closed" });
    }
  }

  function updateConnection(connection: Connection) {
    state.connection = connection;
    for (const listener of state.listeners.connection) {
      listener(connection.state);
    }
  }

  function getRetryDelay() {
    return BACKOFF_RETRY_DELAYS[
      state.numberOfRetry < BACKOFF_RETRY_DELAYS.length
        ? state.numberOfRetry
        : BACKOFF_RETRY_DELAYS.length - 1
    ];
  }

  function onError() {}

  function onOpen() {
    clearInterval(state.intervalHandles.heartbeat);

    state.intervalHandles.heartbeat = effects.startHeartbeatInterval();

    if (state.connection.state === "connecting") {
      updateConnection({ ...state.connection, state: "open" });
      state.numberOfRetry = 0;
      tryFlushing();
    } else {
      // TODO
    }
  }

  function heartbeat() {
    if (state.socket == null) {
      // Should never happen, because we clear the pong timeout when the connection is dropped explictly
      return;
    }

    clearTimeout(state.timeoutHandles.pongTimeout);
    state.timeoutHandles.pongTimeout = effects.schedulePongTimeout();

    if (state.socket.readyState === WebSocket.OPEN) {
      state.socket.send("ping");
    }
  }

  function pongTimeout() {
    log("Pong timeout. Trying to reconnect.");
    reconnect();
  }

  function reconnect() {
    if (state.socket) {
      state.socket.removeEventListener("open", onOpen);
      state.socket.removeEventListener("message", onMessage);
      state.socket.removeEventListener("close", onClose);
      state.socket.removeEventListener("error", onError);
      state.socket.close();
      state.socket = null;
    }

    updateConnection({ state: "unavailable" });
    clearTimeout(state.timeoutHandles.pongTimeout);
    if (state.timeoutHandles.flush) {
      clearTimeout(state.timeoutHandles.flush);
    }
    clearTimeout(state.timeoutHandles.reconnect);
    clearInterval(state.intervalHandles.heartbeat);
    connect();
  }

  function tryFlushing() {
    if (state.socket == null) {
      return;
    }

    if (state.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = Date.now();

    const elapsedTime = now - state.lastFlushTime;

    if (elapsedTime > context.throttleDelay) {
      const messages = flushDataToMessages(state);
      if (messages.length === 0) {
        return;
      }
      effects.send(messages);
      state.flushData = {
        messages: [],
        storageOperations: [],
        presence: null,
      };
      state.lastFlushTime = now;
    } else {
      if (state.timeoutHandles.flush != null) {
        clearTimeout(state.timeoutHandles.flush);
      }

      state.timeoutHandles.flush = effects.delayFlush(
        context.throttleDelay - (now - state.lastFlushTime)
      );
    }
  }

  function flushDataToMessages(state: State) {
    const messages: ClientMessage[] = [];
    if (state.flushData.presence) {
      messages.push({
        type: ClientMessageType.UpdatePresence,
        data: state.flushData.presence,
      });
    }
    for (const event of state.flushData.messages) {
      messages.push(event);
    }
    if (state.flushData.storageOperations.length > 0) {
      messages.push({
        type: ClientMessageType.UpdateStorage,
        ops: state.flushData.storageOperations,
      });
    }
    return messages;
  }

  function disconnect() {
    if (state.socket) {
      state.socket.removeEventListener("open", onOpen);
      state.socket.removeEventListener("message", onMessage);
      state.socket.removeEventListener("close", onClose);
      state.socket.removeEventListener("error", onError);
      state.socket.close();
      state.socket = null;
    }
    updateConnection({ state: "closed" });
    if (state.timeoutHandles.flush) {
      clearTimeout(state.timeoutHandles.flush);
    }
    clearTimeout(state.timeoutHandles.reconnect);
    clearTimeout(state.timeoutHandles.pongTimeout);
    clearInterval(state.intervalHandles.heartbeat);
    state.users = {};
    updateUsers({ type: "reset" });
    clearListeners();
  }

  function clearListeners() {
    for (const key in state.listeners) {
      state.listeners[key as keyof State["listeners"]] = [];
    }
  }

  function getPresence<T extends Presence>(): T {
    return state.me as T;
  }

  function getOthers<T extends Presence>(): Others<T> {
    return state.others as Others<T>;
  }

  function broadcastEvent(event: any) {
    if (state.socket == null) {
      return;
    }

    state.flushData.messages.push({
      type: ClientMessageType.ClientEvent,
      event,
    });
    tryFlushing();
  }

  function dispatch(ops: Op[]) {
    state.flushData.storageOperations.push(...ops);
    tryFlushing();
  }

  const storage = new Storage({
    fetchStorage: () => {
      state.flushData.messages.push({ type: ClientMessageType.FetchStorage });
      tryFlushing();
    },
    dispatch,
    getConnectionId: () => {
      const me = getSelf();

      if (me) {
        return me.connectionId;
      }

      throw new Error("Unexpected");
    },
    defaultRoot: state.defaultStorageRoot!,
  });

  async function getStorage<TRoot>() {
    const doc = await storage.getDocument<TRoot>();
    return {
      root: doc.root,
    };
  }

  return {
    // Internal
    onOpen,
    onClose,
    onMessage,
    authenticationSuccess,
    heartbeat,
    onNavigatorOnline,
    // onWakeUp,
    onVisibilityChange,

    // Core
    connect,
    disconnect,
    subscribe,
    unsubscribe,

    // Presence
    updatePresence,
    broadcastEvent,

    getStorage,

    selectors: {
      // Core
      getConnectionState,
      getSelf,

      // Presence
      getPresence,
      getOthers,
    },
  };
}

export function defaultState(
  me?: Presence,
  defaultStorageRoot?: { [key: string]: any }
): State {
  return {
    connection: { state: "closed" },
    socket: null,
    listeners: {
      event: [],
      others: [],
      "my-presence": [],
      error: [],
      connection: [],
    },
    numberOfRetry: 0,
    lastFlushTime: 0,
    timeoutHandles: {
      flush: null,
      reconnect: 0,
      pongTimeout: 0,
    },
    flushData: {
      presence: me == null ? {} : me,
      messages: [],
      storageOperations: [],
    },
    intervalHandles: {
      heartbeat: 0,
    },
    me: me == null ? {} : me,
    users: {},
    others: makeOthers({}),
    defaultStorageRoot,
    idFactory: null,
  };
}

export type InternalRoom = {
  room: Room;
  connect: () => void;
  disconnect: () => void;
  onNavigatorOnline: () => void;
  onVisibilityChange: (visibilityState: VisibilityState) => void;
};

export function createRoom(
  name: string,
  options: ClientOptions & {
    defaultPresence?: Presence;
    defaultStorageRoot?: Record<string, any>;
  }
): InternalRoom {
  const throttleDelay = options.throttle || 100;
  const liveblocksServer: string =
    (options as any).liveblocksServer || "wss://liveblocks.net/v2";
  const authEndpoint: AuthEndpoint = options.authEndpoint;

  const state = defaultState(
    options.defaultPresence,
    options.defaultStorageRoot
  );

  const machine = makeStateMachine(state, {
    throttleDelay,
    liveblocksServer,
    authEndpoint,
    room: name,
  });

  const room: Room = {
    /////////////
    // Core    //
    /////////////
    getConnectionState: machine.selectors.getConnectionState,
    getSelf: machine.selectors.getSelf,
    subscribe: machine.subscribe,
    unsubscribe: machine.unsubscribe,

    //////////////
    // Presence //
    //////////////
    getPresence: machine.selectors.getPresence,
    updatePresence: machine.updatePresence,
    getOthers: machine.selectors.getOthers,
    broadcastEvent: machine.broadcastEvent,

    getStorage: machine.getStorage,
  };

  return {
    connect: machine.connect,
    disconnect: machine.disconnect,
    onNavigatorOnline: machine.onNavigatorOnline,
    onVisibilityChange: machine.onVisibilityChange,
    room,
  };
}

class LiveblocksError extends Error {
  constructor(message: string, public code: number) {
    super(message);
  }
}
