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
  StorageCallback,
  StorageUpdate,
  LiveObjectUpdates,
  LiveListUpdates,
  LiveMapUpdates,
  BroadcastOptions,
} from "./types";
import { getTreesDiffOperations, isSameNodeOrChildOf, remove } from "./utils";
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
  SerializedCrdtWithId,
  InitialDocumentStateMessage,
  OpType,
  UpdateStorageMessage,
  ServerMessage,
  SerializedCrdt,
  CrdtType,
} from "./live";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveList } from "./LiveList";
import { AbstractCrdt, ApplyResult } from "./AbstractCrdt";
import { LiveRegister } from "./LiveRegister";

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
    [Symbol.iterator]() {
      return array[Symbol.iterator]();
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

type HistoryItem = Array<Op | { type: "presence"; data: Presence }>;

type IdFactory = () => string;

export type State = {
  connection: Connection;
  lastConnectionId: number | null;
  socket: WebSocket | null;
  lastFlushTime: number;
  buffer: {
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
    storage: StorageCallback[];
  };
  me: Presence;
  others: Others;
  users: {
    [connectionId: number]: User;
  };
  idFactory: IdFactory | null;
  numberOfRetry: number;
  defaultStorageRoot?: { [key: string]: any };

  clock: number;
  opClock: number;
  items: Map<string, AbstractCrdt>;
  root: LiveObject | undefined;
  undoStack: HistoryItem[];
  redoStack: HistoryItem[];

  isHistoryPaused: boolean;
  pausedHistory: HistoryItem;

  isBatching: boolean;
  batch: {
    ops: Op[];
    reverseOps: HistoryItem;
    updates: {
      others: [];
      presence: boolean;
      nodes: Set<AbstractCrdt>;
    };
  };
  offlineOperations: Map<string, Op>;
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
  publicApiKey?: string;
};

export function makeStateMachine(
  state: State,
  context: Context,
  mockedEffects?: Effects
) {
  const effects: Effects = mockedEffects || {
    async authenticate() {
      try {
        const token = await auth(
          context.authEndpoint,
          context.room,
          context.publicApiKey
        );
        const parsedToken = parseToken(token);
        const socket = new WebSocket(
          `${context.liveblocksServer}/?token=${token}`
        );
        socket.addEventListener("message", onMessage);
        socket.addEventListener("open", onOpen);
        socket.addEventListener("close", onClose);
        socket.addEventListener("error", onError);
        authenticationSuccess(parsedToken, socket);
      } catch (er: any) {
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

  function genericSubscribe(callback: StorageCallback) {
    state.listeners.storage.push(callback);
    return () => remove(state.listeners.storage, callback);
  }

  function crdtSubscribe<T extends AbstractCrdt>(
    crdt: T,
    innerCallback: (updates: StorageUpdate[] | AbstractCrdt) => void,
    options?: { isDeep: boolean }
  ) {
    const cb = (updates: StorageUpdate[]) => {
      const relatedUpdates: StorageUpdate[] = [];
      for (const update of updates) {
        if (options?.isDeep && isSameNodeOrChildOf(update.node, crdt)) {
          relatedUpdates.push(update);
        } else if (update.node._id === crdt._id) {
          innerCallback(update.node);
        }
      }

      if (options?.isDeep && relatedUpdates.length > 0) {
        innerCallback(relatedUpdates);
      }
    };

    return genericSubscribe(cb);
  }

  function createOrUpdateRootFromMessage(message: InitialDocumentStateMessage) {
    if (message.items.length === 0) {
      throw new Error("Internal error: cannot load storage without items");
    }

    if (state.root) {
      updateRoot(message.items);
    } else {
      state.root = load(message.items);
    }

    for (const key in state.defaultStorageRoot) {
      if (state.root.get(key) == null) {
        state.root.set(key, state.defaultStorageRoot[key]);
      }
    }
  }

  function buildRootAndParentToChildren(
    items: SerializedCrdtWithId[]
  ): [SerializedCrdtWithId, Map<string, SerializedCrdtWithId[]>] {
    const parentToChildren = new Map<string, SerializedCrdtWithId[]>();
    let root = null;

    for (const tuple of items) {
      const parentId = tuple[1].parentId;
      if (parentId == null) {
        root = tuple;
      } else {
        const children = parentToChildren.get(parentId);
        if (children != null) {
          children.push(tuple);
        } else {
          parentToChildren.set(parentId, [tuple]);
        }
      }
    }

    if (root == null) {
      throw new Error("Root can't be null");
    }

    return [root, parentToChildren];
  }

  function updateRoot<T>(items: SerializedCrdtWithId[]) {
    if (!state.root) {
      return;
    }

    const currentItems = new Map<string, SerializedCrdt>();
    state.items.forEach((liveCrdt, id) => {
      currentItems.set(id, liveCrdt._toSerializedCrdt());
    });

    // Get operations that represent the diff between 2 states.
    const ops = getTreesDiffOperations(currentItems, new Map(items));

    const result = apply(ops, false);

    notify(result.updates);
  }

  function load<T>(items: SerializedCrdtWithId[]): LiveObject<T> {
    const [root, parentToChildren] = buildRootAndParentToChildren(items);

    return LiveObject._deserialize(root, parentToChildren, {
      addItem,
      deleteItem,
      generateId,
      generateOpId,
      dispatch: storageDispatch,
    }) as LiveObject<T>;
  }

  function addItem(id: string, item: AbstractCrdt) {
    state.items.set(id, item);
  }

  function deleteItem(id: string) {
    state.items.delete(id);
  }

  function getItem(id: string) {
    return state.items.get(id);
  }

  function addToUndoStack(historyItem: HistoryItem) {
    // If undo stack is too large, we remove the older item
    if (state.undoStack.length >= 50) {
      state.undoStack.shift();
    }

    if (state.isHistoryPaused) {
      state.pausedHistory.unshift(...historyItem);
    } else {
      state.undoStack.push(historyItem);
    }
  }

  function storageDispatch(ops: Op[], reverse: Op[], modified: AbstractCrdt[]) {
    if (state.isBatching) {
      state.batch.ops.push(...ops);
      for (const item of modified) {
        state.batch.updates.nodes.add(item);
      }
      state.batch.reverseOps.push(...reverse);
    } else {
      addToUndoStack(reverse);
      state.redoStack = [];
      dispatch(ops);
      notify({ nodes: new Set(modified) });
    }
  }

  function notify({
    nodes = new Set(),
    presence = false,
    others = [],
  }: {
    nodes?: Set<AbstractCrdt>;
    presence?: boolean;
    others?: OthersEvent[];
  }) {
    if (others.length > 0) {
      state.others = makeOthers(state.users);

      for (const event of others) {
        for (const listener of state.listeners["others"]) {
          listener(state.others, event);
        }
      }
    }

    if (presence) {
      for (const listener of state.listeners["my-presence"]) {
        listener(state.me);
      }
    }

    if (nodes.size > 0) {
      for (const subscriber of state.listeners.storage) {
        subscriber(
          Array.from(nodes).map((m) => {
            if (m instanceof LiveObject) {
              return {
                type: "LiveObject",
                node: m,
              } as LiveObjectUpdates;
            } else if (m instanceof LiveList) {
              return {
                type: "LiveList",
                node: m,
              } as LiveListUpdates;
            } else {
              return {
                type: "LiveMap",
                node: m,
              } as LiveMapUpdates;
            }
          })
        );
      }
    }
  }

  function getConnectionId() {
    if (
      state.connection.state === "open" ||
      state.connection.state === "connecting"
    ) {
      return state.connection.id;
    } else if (state.lastConnectionId !== null) {
      return state.lastConnectionId;
    }

    throw new Error(
      "Internal. Tried to get connection id but connection was never open"
    );
  }

  function generateId() {
    return `${getConnectionId()}:${state.clock++}`;
  }

  function generateOpId() {
    return `${getConnectionId()}:${state.opClock++}`;
  }

  function apply(
    item: HistoryItem,
    isLocal: boolean
  ): {
    reverse: HistoryItem;
    updates: { nodes: Set<AbstractCrdt>; presence: boolean };
  } {
    const result = {
      reverse: [] as HistoryItem,
      updates: { nodes: new Set<AbstractCrdt>(), presence: false },
    };
    for (const op of item) {
      if (op.type === "presence") {
        const reverse = {
          type: "presence",
          data: {} as Presence,
        };

        for (const key in op.data) {
          reverse.data[key] = state.me[key];
        }

        state.me = { ...state.me, ...op.data };

        if (state.buffer.presence == null) {
          state.buffer.presence = op.data;
        } else {
          for (const key in op.data) {
            state.buffer.presence[key] = op.data;
          }
        }

        result.reverse.unshift(reverse as any);
        result.updates.presence = true;
      } else {
        // Ops applied after undo/redo don't have an opId.
        if (isLocal && !op.opId) {
          op.opId = generateOpId();
        }
        const applyOpResult = applyOp(op, isLocal);
        if (applyOpResult.modified) {
          result.updates.nodes.add(applyOpResult.modified);
          result.reverse.unshift(...applyOpResult.reverse);
        }
      }
    }
    return result;
  }

  function applyOp(op: Op, isLocal: boolean): ApplyResult {
    if (op.opId) {
      state.offlineOperations.delete(op.opId);
    }

    switch (op.type) {
      case OpType.DeleteObjectKey:
      case OpType.UpdateObject:
      case OpType.DeleteCrdt: {
        const item = state.items.get(op.id);

        if (item == null) {
          return { modified: false };
        }

        return item._apply(op, isLocal);
      }
      case OpType.SetParentKey: {
        const item = state.items.get(op.id);

        if (item == null) {
          return { modified: false };
        }

        if (item._parent instanceof LiveList) {
          const previousKey = item._parentKey!;
          item._parent._setChildKey(op.parentKey, item);
          return {
            reverse: [
              {
                type: OpType.SetParentKey,
                id: item._id!,
                parentKey: previousKey,
              },
            ],
            modified: item._parent,
          };
        }
        return { modified: false };
      }
      case OpType.CreateObject: {
        const parent = state.items.get(op.parentId!);
        if (parent == null) {
          return { modified: false };
        }
        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveObject(op.data),
          op.opId!,
          isLocal,
          getItem(op.id) != null
        );
      }
      case OpType.CreateList: {
        const parent = state.items.get(op.parentId);

        if (parent == null) {
          return { modified: false };
        }

        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveList(),
          op.opId!,
          isLocal,
          getItem(op.id) != null
        );
      }
      case OpType.CreateRegister: {
        const parent = state.items.get(op.parentId);

        if (parent == null) {
          return { modified: false };
        }

        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveRegister(op.data),
          op.opId!,
          isLocal,
          getItem(op.id) != null
        );
      }
      case OpType.CreateMap: {
        const parent = state.items.get(op.parentId);

        if (parent == null) {
          return { modified: false };
        }

        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveMap(),
          op.opId!,
          isLocal,
          getItem(op.id) != null
        );
      }
    }

    return { modified: false };
  }

  function subscribe(callback: (updates: StorageUpdate) => void): () => void;
  function subscribe<TKey extends string, TValue>(
    liveMap: LiveMap<TKey, TValue>,
    callback: (liveMap: LiveMap<TKey, TValue>) => void
  ): () => void;
  function subscribe<TData>(
    liveObject: LiveObject<TData>,
    callback: (liveObject: LiveObject<TData>) => void
  ): () => void;
  function subscribe<TItem>(
    liveList: LiveList<TItem>,
    callback: (liveList: LiveList<TItem>) => void
  ): () => void;
  function subscribe<TItem extends AbstractCrdt>(
    node: TItem,
    callback: (updates: StorageUpdate[]) => void,
    options: { isDeep: true }
  ): () => void;
  function subscribe<T extends Presence>(
    type: "my-presence",
    listener: MyPresenceCallback<T>
  ): () => void;
  function subscribe<T extends Presence>(
    type: "others",
    listener: OthersEventCallback<T>
  ): () => void;
  function subscribe(type: "event", listener: EventCallback): () => void;
  function subscribe(type: "error", listener: ErrorCallback): () => void;
  function subscribe(
    type: "connection",
    listener: ConnectionCallback
  ): () => void;
  function subscribe<T extends keyof RoomEventCallbackMap>(
    firstParam: T | AbstractCrdt | ((updates: StorageUpdate[]) => void),
    listener?: RoomEventCallbackMap[T] | any,
    options?: { isDeep: boolean }
  ): () => void {
    if (firstParam instanceof AbstractCrdt) {
      return crdtSubscribe(firstParam, listener, options);
    } else if (typeof firstParam === "function") {
      return genericSubscribe(firstParam);
    } else if (!isValidRoomEventType(firstParam)) {
      throw new Error(`"${firstParam}" is not a valid event name`);
    }

    (state.listeners[firstParam] as RoomEventCallbackMap[T][]).push(listener);

    return () => {
      const callbacks = state.listeners[
        firstParam
      ] as RoomEventCallbackMap[T][];
      remove(callbacks, listener);
    };
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
    console.warn(`unsubscribe is depreacted and will be removed in a future version.
use the callback returned by subscribe instead.
See v0.13 release notes for more information.
`);
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

  function updatePresence<T extends Presence>(
    overrides: Partial<T>,
    options?: { addToHistory: boolean }
  ) {
    const oldValues: Presence = {};

    if (state.buffer.presence == null) {
      state.buffer.presence = {};
    }

    for (const key in overrides) {
      state.buffer.presence[key] = overrides[key] as any;
      oldValues[key] = state.me[key];
    }

    state.me = { ...state.me, ...overrides };

    if (state.isBatching) {
      if (options?.addToHistory) {
        state.batch.reverseOps.push({ type: "presence", data: oldValues });
      }
      state.batch.updates.presence = true;
    } else {
      tryFlushing();
      if (options?.addToHistory) {
        addToUndoStack([{ type: "presence", data: oldValues }]);
      }
      notify({ presence: true });
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
    if (process.env.NODE_ENV !== "production") {
      console.error("Call to authentication endpoint failed", error);
    }
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

  function onUpdatePresenceMessage(
    message: UpdatePresenceMessage
  ): OthersEvent {
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
    return {
      type: "update",
      updates: message.data,
      user: state.users[message.actor],
    };
  }

  function onUserLeftMessage(message: UserLeftMessage): OthersEvent | null {
    const userLeftMessage: UserLeftMessage = message;
    const user = state.users[userLeftMessage.actor];
    if (user) {
      delete state.users[userLeftMessage.actor];
      return { type: "leave", user };
    }
    return null;
  }

  function onRoomStateMessage(message: RoomStateMessage): OthersEvent {
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
    return { type: "reset" };
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

  function onUserJoinedMessage(message: UserJoinMessage): OthersEvent {
    state.users[message.actor] = {
      connectionId: message.actor,
      info: message.info,
      id: message.id,
    };

    if (state.me) {
      // Send current presence to new user
      // TODO: Consider storing it on the backend
      state.buffer.messages.push({
        type: ClientMessageType.UpdatePresence,
        data: state.me!,
        targetActor: message.actor,
      });
      tryFlushing();
    }

    return { type: "enter", user: state.users[message.actor] };
  }

  function onMessage(event: MessageEvent) {
    if (event.data === "pong") {
      clearTimeout(state.timeoutHandles.pongTimeout);
      return;
    }

    const message = JSON.parse(event.data);
    let subMessages: ServerMessage[] = [];

    if (Array.isArray(message)) {
      subMessages = message;
    } else {
      subMessages.push(message);
    }

    const updates = {
      nodes: new Set<AbstractCrdt>(),
      others: [] as OthersEvent[],
    };

    for (const subMessage of subMessages) {
      switch (subMessage.type) {
        case ServerMessageType.UserJoined: {
          updates.others.push(onUserJoinedMessage(message as UserJoinMessage));
          break;
        }
        case ServerMessageType.UpdatePresence: {
          updates.others.push(
            onUpdatePresenceMessage(subMessage as UpdatePresenceMessage)
          );
          break;
        }
        case ServerMessageType.Event: {
          onEvent(subMessage);
          break;
        }
        case ServerMessageType.UserLeft: {
          const event = onUserLeftMessage(subMessage as UserLeftMessage);
          if (event) {
            updates.others.push(event);
          }
          break;
        }
        case ServerMessageType.RoomState: {
          updates.others.push(
            onRoomStateMessage(subMessage as RoomStateMessage)
          );
          break;
        }
        case ServerMessageType.InitialStorageState: {
          createOrUpdateRootFromMessage(subMessage);
          applyAndSendOfflineOps();
          _getInitialStateResolver?.();
          break;
        }
        case ServerMessageType.UpdateStorage: {
          const applyResult = apply(
            (subMessage as UpdateStorageMessage).ops,
            false
          );
          for (const node of applyResult.updates.nodes) {
            updates.nodes.add(node);
          }
          break;
        }
      }
    }

    notify(updates);
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
    notify({ others: [{ type: "reset" }] });

    if (event.code >= 4000 && event.code <= 4100) {
      updateConnection({ state: "failed" });

      const error = new LiveblocksError(event.reason, event.code);
      for (const listener of state.listeners.error) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            `Connection to Liveblocks websocket server closed. Reason: ${error.message} (code: ${error.code})`
          );
        }
        listener(error);
      }
    } else if (event.wasClean === false) {
      state.numberOfRetry++;
      const delay = getRetryDelay();
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `Connection to Liveblocks websocket server closed (code: ${event.code}). Retrying in ${delay}ms.`
        );
      }
      updateConnection({ state: "unavailable" });
      state.timeoutHandles.reconnect = effects.scheduleReconnect(delay);
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
      state.lastConnectionId = state.connection.id;

      if (state.root) {
        state.buffer.messages.push({ type: ClientMessageType.FetchStorage });
      }
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

  function applyAndSendOfflineOps() {
    if (state.offlineOperations.size === 0) {
      return;
    }

    const messages: ClientMessage[] = [];

    const ops = Array.from(state.offlineOperations.values());

    const result = apply(ops, true);

    messages.push({
      type: ClientMessageType.UpdateStorage,
      ops: ops,
    });

    notify(result.updates);

    effects.send(messages);
  }

  function tryFlushing() {
    const storageOps = state.buffer.storageOperations;

    if (storageOps.length > 0) {
      storageOps.forEach((op) => {
        state.offlineOperations.set(op.opId!, op);
      });
    }

    if (state.socket == null || state.socket.readyState !== WebSocket.OPEN) {
      state.buffer.storageOperations = [];
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
      state.buffer = {
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
    if (state.buffer.presence) {
      messages.push({
        type: ClientMessageType.UpdatePresence,
        data: state.buffer.presence,
      });
    }
    for (const event of state.buffer.messages) {
      messages.push(event);
    }
    if (state.buffer.storageOperations.length > 0) {
      messages.push({
        type: ClientMessageType.UpdateStorage,
        ops: state.buffer.storageOperations,
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
    notify({ others: [{ type: "reset" }] });
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

  function broadcastEvent(
    event: any,
    options: BroadcastOptions = {
      shouldQueueEventIfNotReady: false,
    }
  ) {
    if (state.socket == null && options.shouldQueueEventIfNotReady == false) {
      return;
    }

    state.buffer.messages.push({
      type: ClientMessageType.ClientEvent,
      event,
    });
    tryFlushing();
  }

  function dispatch(ops: Op[]) {
    state.buffer.storageOperations.push(...ops);
    tryFlushing();
  }

  let _getInitialStatePromise: Promise<void> | null = null;
  let _getInitialStateResolver: (() => void) | null = null;

  async function getStorage<TRoot>(): Promise<{ root: LiveObject<TRoot> }> {
    if (state.root) {
      return {
        root: state.root as LiveObject<TRoot>,
      };
    }

    if (_getInitialStatePromise == null) {
      state.buffer.messages.push({ type: ClientMessageType.FetchStorage });
      tryFlushing();
      _getInitialStatePromise = new Promise(
        (resolve) => (_getInitialStateResolver = resolve)
      );
    }

    await _getInitialStatePromise;

    return {
      root: state.root! as LiveObject<TRoot>,
    };
  }

  function undo() {
    if (state.isBatching) {
      throw new Error("undo is not allowed during a batch");
    }
    const historyItem = state.undoStack.pop();

    if (historyItem == null) {
      return;
    }

    state.isHistoryPaused = false;
    const result = apply(historyItem, true);

    notify(result.updates);
    state.redoStack.push(result.reverse);

    for (const op of historyItem) {
      if (op.type !== "presence") {
        state.buffer.storageOperations.push(op);
      }
    }
    tryFlushing();
  }

  function redo() {
    if (state.isBatching) {
      throw new Error("redo is not allowed during a batch");
    }

    const historyItem = state.redoStack.pop();

    if (historyItem == null) {
      return;
    }

    state.isHistoryPaused = false;
    const result = apply(historyItem, true);
    notify(result.updates);
    state.undoStack.push(result.reverse);

    for (const op of historyItem) {
      if (op.type !== "presence") {
        state.buffer.storageOperations.push(op);
      }
    }
    tryFlushing();
  }

  function batch(callback: () => void) {
    if (state.isBatching) {
      throw new Error("batch should not be called during a batch");
    }

    state.isBatching = true;

    try {
      callback();
    } finally {
      state.isBatching = false;

      if (state.batch.reverseOps.length > 0) {
        addToUndoStack(state.batch.reverseOps);
      }

      // Clear the redo stack because batch is always called from a local operation
      state.redoStack = [];

      if (state.batch.ops.length > 0) {
        dispatch(state.batch.ops);
      }

      notify(state.batch.updates);
      state.batch = {
        ops: [],
        reverseOps: [],
        updates: {
          others: [],
          nodes: new Set(),
          presence: false,
        },
      };
      tryFlushing();
    }
  }

  function pauseHistory() {
    state.pausedHistory = [];
    state.isHistoryPaused = true;
  }

  function resumeHistory() {
    state.isHistoryPaused = false;
    if (state.pausedHistory.length > 0) {
      addToUndoStack(state.pausedHistory);
    }
    state.pausedHistory = [];
  }

  function simulateSocketClose() {
    if (state.socket) {
      state.socket.close();
    }
  }

  function simulateSendCloseEvent(event: {
    code: number;
    wasClean: boolean;
    reason: any;
  }) {
    if (state.socket) {
      onClose(event);
    }
  }

  return {
    // Internal
    onOpen,
    onClose,
    onMessage,
    authenticationSuccess,
    heartbeat,
    onNavigatorOnline,
    // Internal dev tools
    simulateSocketClose,
    simulateSendCloseEvent,

    // onWakeUp,
    onVisibilityChange,
    getUndoStack: () => state.undoStack,
    getItemsCount: () => state.items.size,

    // Core
    connect,
    disconnect,
    subscribe,
    unsubscribe,

    // Presence
    updatePresence,
    broadcastEvent,

    batch,
    undo,
    redo,
    pauseHistory,
    resumeHistory,

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
    lastConnectionId: null,
    socket: null,
    listeners: {
      event: [],
      others: [],
      "my-presence": [],
      error: [],
      connection: [],
      storage: [],
    },
    numberOfRetry: 0,
    lastFlushTime: 0,
    timeoutHandles: {
      flush: null,
      reconnect: 0,
      pongTimeout: 0,
    },
    buffer: {
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

    // Storage
    clock: 0,
    opClock: 0,
    items: new Map<string, AbstractCrdt>(),
    root: undefined,
    undoStack: [],
    redoStack: [],

    isHistoryPaused: false,
    pausedHistory: [],
    isBatching: false,
    batch: {
      ops: [] as Op[],
      updates: { nodes: new Set<AbstractCrdt>(), presence: false, others: [] },
      reverseOps: [] as Op[],
    },
    offlineOperations: new Map<string, Op>(),
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
    (options as any).liveblocksServer || "wss://liveblocks.net/v5";

  let authEndpoint: AuthEndpoint;
  if (options.authEndpoint) {
    authEndpoint = options.authEndpoint;
  } else {
    const publicAuthorizeEndpoint: string =
      (options as any).publicAuthorizeEndpoint ||
      "https://liveblocks.io/api/public/authorize";

    authEndpoint = publicAuthorizeEndpoint;
  }

  const state = defaultState(
    options.defaultPresence,
    options.defaultStorageRoot
  );

  const machine = makeStateMachine(state, {
    throttleDelay,
    liveblocksServer,
    authEndpoint,
    room: name,
    publicApiKey: options.publicApiKey,
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
    batch: machine.batch,
    history: {
      undo: machine.undo,
      redo: machine.redo,
      pause: machine.pauseHistory,
      resume: machine.resumeHistory,
    },
    // @ts-ignore
    internalDevTools: {
      closeWebsocket: machine.simulateSocketClose,
      sendCloseEvent: machine.simulateSendCloseEvent,
    },
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
