import {
  Others,
  Presence,
  Room,
  MyPresenceCallback,
  OthersEventCallback,
  RoomEventCallbackMap,
  RoomEventName,
  EventCallback,
  User,
  Connection,
  ErrorCallback,
  OthersEvent,
  AuthenticationToken,
  ConnectionCallback,
  StorageCallback,
  StorageUpdate,
  BroadcastOptions,
  AuthorizeResponse,
  Authentication,
} from "./types";
import { Json, JsonObject, isJsonObject, isJsonArray, parseJson } from "./json";
import { Lson, LsonObject } from "./lson";
import {
  compact,
  getTreesDiffOperations,
  isSameNodeOrChildOf,
  remove,
  mergeStorageUpdates,
  isTokenValid,
} from "./utils";
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
  ServerMessage,
  SerializedCrdt,
  WebsocketCloseCodes,
} from "./live";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { LiveList } from "./LiveList";
import { AbstractCrdt, ApplyResult } from "./AbstractCrdt";

const BACKOFF_RETRY_DELAYS = [250, 500, 1000, 2000, 4000, 8000, 10000];
const BACKOFF_RETRY_DELAYS_SLOW = [2000, 30000, 60000, 300000];

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

function makeOthers<T extends Presence>(userMap: {
  [key: number]: User<T>;
}): Others<T> {
  const users = Object.values(userMap).map((user) => {
    const { _hasReceivedInitialPresence, ...publicKeys } = user;
    return publicKeys;
  });

  return {
    get count() {
      return users.length;
    },
    [Symbol.iterator]() {
      return users[Symbol.iterator]();
    },
    map(callback) {
      return users.map(callback);
    },
    toArray() {
      return users;
    },
  };
}

function log(..._params: unknown[]) {
  // console.log(...params, new Date().toString());
  return;
}

type HistoryItem = Array<Op | { type: "presence"; data: Presence }>;

type IdFactory = () => string;

export type State = {
  connection: Connection;
  token: string | null;
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
  defaultStorageRoot?: JsonObject;

  clock: number;
  opClock: number;
  items: Map<string, AbstractCrdt>;
  root: LiveObject<LsonObject> | undefined;
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
      storageUpdates: Map<string, StorageUpdate>;
    };
  };
  offlineOperations: Map<string, Op>;
};

export type Effects = {
  authenticate(
    auth: (room: string) => Promise<AuthorizeResponse>,
    createWebSocket: (token: string) => WebSocket
  ): void;
  send(messages: ClientMessage[]): void;
  delayFlush(delay: number): number;
  startHeartbeatInterval(): number;
  schedulePongTimeout(): number;
  scheduleReconnect(delay: number): number;
};

type Context = {
  roomId: string;
  throttleDelay: number;
  fetchPolyfill?: typeof fetch;
  WebSocketPolyfill?: typeof WebSocket;
  authentication: Authentication;
  liveblocksServer: string;
};

export function makeStateMachine(
  state: State,
  context: Context,
  mockedEffects?: Effects
) {
  const effects: Effects = mockedEffects || {
    authenticate(
      auth: (room: string) => Promise<AuthorizeResponse>,
      createWebSocket: (token: string) => WebSocket
    ) {
      const token = state.token;
      if (token && isTokenValid(token)) {
        const parsedToken = parseToken(token);
        const socket = createWebSocket(token);
        authenticationSuccess(parsedToken, socket);
      } else {
        return auth(context.roomId)
          .then(({ token }) => {
            if (state.connection.state !== "authenticating") {
              return;
            }
            const parsedToken = parseToken(token);
            const socket = createWebSocket(token);
            authenticationSuccess(parsedToken, socket);
            state.token = token;
          })
          .catch((er: any) => authenticationFailure(er));
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

  function updateRoot(items: SerializedCrdtWithId[]) {
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

  function load(items: SerializedCrdtWithId[]): LiveObject<LsonObject> {
    const [root, parentToChildren] = buildRootAndParentToChildren(items);

    return LiveObject._deserialize(root, parentToChildren, {
      getItem,
      addItem,
      deleteItem,
      generateId,
      generateOpId,
      dispatch: storageDispatch,
      roomId: context.roomId,
    });
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

  function storageDispatch(
    ops: Op[],
    reverse: Op[],
    storageUpdates: Map<string, StorageUpdate>
  ) {
    if (state.isBatching) {
      state.batch.ops.push(...ops);
      storageUpdates.forEach((value, key) => {
        state.batch.updates.storageUpdates.set(
          key,
          mergeStorageUpdates(
            state.batch.updates.storageUpdates.get(key) as any, // FIXME
            value
          )
        );
      });
      state.batch.reverseOps.push(...reverse);
    } else {
      addToUndoStack(reverse);
      state.redoStack = [];
      dispatch(ops);
      notify({ storageUpdates: storageUpdates });
    }
  }

  function notify({
    storageUpdates = new Map<string, StorageUpdate>(),
    presence = false,
    others: otherEvents = [],
  }: {
    storageUpdates?: Map<string, StorageUpdate>;
    presence?: boolean;
    others?: OthersEvent[];
  }) {
    if (otherEvents.length > 0) {
      state.others = makeOthers(state.users);

      for (const event of otherEvents) {
        for (const listener of state.listeners.others) {
          listener(state.others, event);
        }
      }
    }

    if (presence) {
      for (const listener of state.listeners["my-presence"]) {
        listener(state.me);
      }
    }

    if (storageUpdates.size > 0) {
      for (const subscriber of state.listeners.storage) {
        subscriber(Array.from(storageUpdates.values()));
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
    updates: {
      storageUpdates: Map<string, StorageUpdate>;
      presence: boolean;
    };
  } {
    const result = {
      reverse: [] as HistoryItem,
      updates: {
        storageUpdates: new Map<string, StorageUpdate>(),
        presence: false,
      },
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
            state.buffer.presence[key] = op.data[key];
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
          result.updates.storageUpdates.set(
            applyOpResult.modified.node._id!,
            mergeStorageUpdates(
              result.updates.storageUpdates.get(
                applyOpResult.modified.node._id!
              ) as any, // FIXME
              applyOpResult.modified
            )
          );
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
          if (previousKey === op.parentKey) {
            return { modified: false };
          } else {
            return item._parent._setChildKey(op.parentKey, item, previousKey);
          }
        }
        return { modified: false };
      }
      case OpType.CreateObject:
      case OpType.CreateList:
      case OpType.CreateMap:
      case OpType.CreateRegister: {
        const parent = state.items.get(op.parentId!);
        if (parent == null) {
          return { modified: false };
        }
        return parent._attachChild(op, isLocal);
      }
    }

    return { modified: false };
  }

  function subscribe(callback: (updates: StorageUpdate) => void): () => void;
  function subscribe<TKey extends string, TValue extends Lson>(
    liveMap: LiveMap<TKey, TValue>,
    callback: (liveMap: LiveMap<TKey, TValue>) => void
  ): () => void;
  function subscribe<TData extends LsonObject>(
    liveObject: LiveObject<TData>,
    callback: (liveObject: LiveObject<TData>) => void
  ): () => void;
  function subscribe<TItem extends Lson>(
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
  function subscribe<K extends RoomEventName>(
    firstParam: K | AbstractCrdt | ((updates: StorageUpdate[]) => void),
    listener?: RoomEventCallbackMap[K] | any,
    options?: { isDeep: boolean }
  ): () => void {
    if (firstParam instanceof AbstractCrdt) {
      return crdtSubscribe(firstParam, listener, options);
    } else if (typeof firstParam === "function") {
      return genericSubscribe(firstParam);
    } else if (!isValidRoomEventType(firstParam)) {
      throw new Error(`"${firstParam}" is not a valid event name`);
    }

    (state.listeners[firstParam] as RoomEventCallbackMap[K][]).push(listener);

    return () => {
      const callbacks = state.listeners[
        firstParam
      ] as RoomEventCallbackMap[K][];
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
  function unsubscribe<K extends RoomEventName>(
    event: K,
    callback: RoomEventCallbackMap[K]
  ) {
    console.warn(`unsubscribe is depreacted and will be removed in a future version.
use the callback returned by subscribe instead.
See v0.13 release notes for more information.
`);
    if (!isValidRoomEventType(event)) {
      throw new Error(`"${event}" is not a valid event name`);
    }
    const callbacks = state.listeners[event] as RoomEventCallbackMap[K][];
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
    if (
      state.connection.state !== "closed" &&
      state.connection.state !== "unavailable"
    ) {
      return null;
    }

    const auth = prepareAuthEndpoint(
      context.authentication,
      context.fetchPolyfill
    );
    const createWebSocket = prepareCreateWebSocket(
      context.liveblocksServer,
      context.WebSocketPolyfill
    );

    updateConnection({ state: "authenticating" });
    effects.authenticate(auth, createWebSocket);
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
    socket.addEventListener("message", onMessage);
    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);

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
    state.token = null;
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
  ): OthersEvent | undefined {
    const user = state.users[message.actor];
    // If the other user initial presence hasn't been received yet, we discard the presence update.
    // The initial presence update message contains the property "targetActor".
    if (
      message.targetActor === undefined &&
      user != null &&
      !user._hasReceivedInitialPresence
    ) {
      return undefined;
    }

    if (user == null) {
      state.users[message.actor] = {
        connectionId: message.actor,
        presence: message.data,
        _hasReceivedInitialPresence: true,
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
        _hasReceivedInitialPresence: true,
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
      _hasReceivedInitialPresence: true,
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

  function parseServerMessage(data: Json): ServerMessage | null {
    if (!isJsonObject(data)) {
      return null;
    }

    return data as ServerMessage;
    //          ^^^^^^^^^^^^^^^^ FIXME: Properly validate incoming external data instead!
  }

  function parseServerMessages(text: string): ServerMessage[] | null {
    const data: Json | undefined = parseJson(text);
    if (data === undefined) {
      return null;
    } else if (isJsonArray(data)) {
      return compact(data.map((item) => parseServerMessage(item)));
    } else {
      return compact([parseServerMessage(data)]);
    }
  }

  function onMessage(event: MessageEvent<string>) {
    if (event.data === "pong") {
      clearTimeout(state.timeoutHandles.pongTimeout);
      return;
    }

    const messages: ServerMessage[] | null = parseServerMessages(event.data);
    if (messages === null || messages.length === 0) {
      // Unknown incoming message... ignore it
      return;
    }

    const updates = {
      storageUpdates: new Map<string, StorageUpdate>(),
      others: [] as OthersEvent[],
    };

    for (const message of messages) {
      switch (message.type) {
        case ServerMessageType.UserJoined: {
          updates.others.push(onUserJoinedMessage(message));
          break;
        }
        case ServerMessageType.UpdatePresence: {
          const othersPresenceUpdate = onUpdatePresenceMessage(message);
          if (othersPresenceUpdate) {
            updates.others.push(othersPresenceUpdate);
          }
          break;
        }
        case ServerMessageType.Event: {
          onEvent(message);
          break;
        }
        case ServerMessageType.UserLeft: {
          const event = onUserLeftMessage(message);
          if (event) {
            updates.others.push(event);
          }
          break;
        }
        case ServerMessageType.RoomState: {
          updates.others.push(onRoomStateMessage(message));
          break;
        }
        case ServerMessageType.InitialStorageState: {
          // createOrUpdateRootFromMessage function could add ops to offlineOperations.
          // Client shouldn't resend these ops as part of the offline ops sending after reconnect.
          const offlineOps = new Map(state.offlineOperations);
          createOrUpdateRootFromMessage(message);
          applyAndSendOfflineOps(offlineOps);
          _getInitialStateResolver?.();
          break;
        }
        case ServerMessageType.UpdateStorage: {
          const applyResult = apply(message.ops, false);
          applyResult.updates.storageUpdates.forEach((value, key) => {
            updates.storageUpdates.set(
              key,
              mergeStorageUpdates(
                updates.storageUpdates.get(key) as any, // FIXME
                value
              )
            );
          });

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

  function onClose(event: { code: number; wasClean: boolean; reason: string }) {
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
        listener(error);
      }

      const delay = getRetryDelay(true);
      state.numberOfRetry++;

      if (process.env.NODE_ENV !== "production") {
        console.error(
          `Connection to Liveblocks websocket server closed. Reason: ${error.message} (code: ${error.code}). Retrying in ${delay}ms.`
        );
      }

      updateConnection({ state: "unavailable" });
      state.timeoutHandles.reconnect = effects.scheduleReconnect(delay);
    } else if (event.code === WebsocketCloseCodes.CLOSE_WITHOUT_RETRY) {
      updateConnection({ state: "closed" });
    } else {
      const delay = getRetryDelay();
      state.numberOfRetry++;

      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `Connection to Liveblocks websocket server closed (code: ${event.code}). Retrying in ${delay}ms.`
        );
      }
      updateConnection({ state: "unavailable" });
      state.timeoutHandles.reconnect = effects.scheduleReconnect(delay);
    }
  }

  function updateConnection(connection: Connection) {
    state.connection = connection;
    for (const listener of state.listeners.connection) {
      listener(connection.state);
    }
  }

  function getRetryDelay(slow: boolean = false) {
    if (slow) {
      return BACKOFF_RETRY_DELAYS_SLOW[
        state.numberOfRetry < BACKOFF_RETRY_DELAYS_SLOW.length
          ? state.numberOfRetry
          : BACKOFF_RETRY_DELAYS_SLOW.length - 1
      ];
    }
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

      // Re-broadcast the user presence during a reconnect.
      if (state.lastConnectionId !== undefined) {
        state.buffer.presence = state.me;
        tryFlushing();
      }

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

    if (state.socket.readyState === state.socket.OPEN) {
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

  function applyAndSendOfflineOps(offlineOps: Map<string, Op>) {
    if (offlineOps.size === 0) {
      return;
    }

    const messages: ClientMessage[] = [];

    const ops = Array.from(offlineOps.values());

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

    if (state.socket == null || state.socket.readyState !== state.socket.OPEN) {
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
    event: Json,
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

  function getStorage<TRoot extends LsonObject>(): Promise<{
    root: LiveObject<TRoot>;
  }> {
    if (state.root) {
      return new Promise((resolve) =>
        resolve({
          root: state.root as LiveObject<TRoot>,
        })
      );
    }

    if (_getInitialStatePromise == null) {
      state.buffer.messages.push({ type: ClientMessageType.FetchStorage });
      tryFlushing();
      _getInitialStatePromise = new Promise(
        (resolve) => (_getInitialStateResolver = resolve)
      );
    }

    return _getInitialStatePromise.then(() => {
      return {
        root: state.root! as LiveObject<TRoot>,
      };
    });
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

      if (state.batch.ops.length > 0) {
        // Only clear the redo stack if something has changed during a batch
        // Clear the redo stack because batch is always called from a local operation
        state.redoStack = [];
      }

      if (state.batch.ops.length > 0) {
        dispatch(state.batch.ops);
      }

      notify(state.batch.updates);
      state.batch = {
        ops: [],
        reverseOps: [],
        updates: {
          others: [],
          storageUpdates: new Map(),
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
    reason: string;
  }) {
    if (state.socket) {
      onClose(event);
    }
  }

  return {
    // Internal
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
  defaultStorageRoot?: JsonObject
): State {
  return {
    connection: { state: "closed" },
    token: null,
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
      updates: {
        storageUpdates: new Map<string, StorageUpdate>(),
        presence: false,
        others: [],
      },
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
  options: {
    defaultPresence?: Presence;
    defaultStorageRoot?: Record<string, any>;
  },
  context: Context
): InternalRoom {
  const state = defaultState(
    options.defaultPresence,
    options.defaultStorageRoot
  );

  const machine = makeStateMachine(state, context);

  const room: Room = {
    id: context.roomId,
    /////////////
    // Core    //
    /////////////
    getConnectionState: machine.selectors.getConnectionState,
    getSelf: machine.selectors.getSelf,

    // FIXME: There's a type issue here. The types of subscribe and
    // machine.subscribe are incompatible somewhere.
    // TODO: Figure out exactly what's wrong here!
    subscribe: machine.subscribe as any, // FIXME!
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

function parseToken(token: string): AuthenticationToken {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new Error(
      `Authentication error. Liveblocks could not parse the response of your authentication endpoint`
    );
  }

  const data = parseJson(atob(tokenParts[1]));
  if (
    data !== undefined &&
    isJsonObject(data) &&
    typeof data.actor === "number" &&
    (data.id === undefined || typeof data.id === "string")
  ) {
    return {
      actor: data.actor,
      id: data.id,
      info: data.info,
    };
  }

  throw new Error(
    `Authentication error. Liveblocks could not parse the response of your authentication endpoint`
  );
}

function prepareCreateWebSocket(
  liveblocksServer: string,
  WebSocketPolyfill?: typeof WebSocket
) {
  if (typeof window === "undefined" && WebSocketPolyfill == null) {
    throw new Error(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );
  }

  const ws = WebSocketPolyfill || WebSocket;

  return (token: string): WebSocket => {
    return new ws(`${liveblocksServer}/?token=${token}`);
  };
}

function prepareAuthEndpoint(
  authentication: Authentication,
  fetchPolyfill?: typeof window.fetch
): (room: string) => Promise<AuthorizeResponse> {
  if (authentication.type === "public") {
    if (typeof window === "undefined" && fetchPolyfill == null) {
      throw new Error(
        "To use Liveblocks client in a non-dom environment with a publicApiKey, you need to provide a fetch polyfill."
      );
    }

    return (room: string) =>
      fetchAuthEndpoint(fetchPolyfill || fetch, authentication.url, {
        room,
        publicApiKey: authentication.publicApiKey,
      });
  }

  if (authentication.type === "private") {
    if (typeof window === "undefined" && fetchPolyfill == null) {
      throw new Error(
        "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
      );
    }

    return (room: string) =>
      fetchAuthEndpoint(fetchPolyfill || fetch, authentication.url, {
        room,
      });
  }

  if (authentication.type === "custom") {
    return authentication.callback;
  }

  throw new Error("Internal error. Unexpected authentication type");
}

function fetchAuthEndpoint(
  fetch: typeof window.fetch,
  endpoint: string,
  body: {
    room: string;
    publicApiKey?: string;
  }
): Promise<any> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) {
        throw new AuthenticationError(
          `Expected a status 200 but got ${res.status} when doing a POST request on "${endpoint}"`
        );
      }

      return res.json().catch((er) => {
        throw new AuthenticationError(
          `Expected a json when doing a POST request on "${endpoint}". ${er}`
        );
      });
    })
    .then((authResponse) => {
      if (typeof authResponse.token !== "string") {
        throw new AuthenticationError(
          `Expected a json with a string token when doing a POST request on "${endpoint}", but got ${JSON.stringify(
            authResponse
          )}`
        );
      }

      return authResponse;
    });
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}
