import type { DocumentVisibilityState } from "./compat/DocumentVisibilityState";
import type { ApplyResult, ManagedPool } from "./crdts/AbstractCrdt";
import { OpSource } from "./crdts/AbstractCrdt";
import {
  getTreesDiffOperations,
  isLiveList,
  isLiveNode,
  isSameNodeOrChildOf,
  mergeStorageUpdates,
} from "./crdts/liveblocks-helpers";
import { LiveObject } from "./crdts/LiveObject";
import type { LiveNode, LiveStructure, LsonObject } from "./crdts/Lson";
import type { StorageCallback, StorageUpdate } from "./crdts/StorageUpdates";
import { assertNever, nn } from "./lib/assert";
import type { Callback, Observable } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import * as console from "./lib/fancy-console";
import type { Json, JsonObject } from "./lib/Json";
import { isJsonArray, isJsonObject } from "./lib/Json";
import type { Resolve } from "./lib/Resolve";
import { compact, isPlainObject, tryParseJson } from "./lib/utils";
import type { Authentication } from "./protocol/Authentication";
import type { RoomAuthToken } from "./protocol/AuthToken";
import {
  isTokenExpired,
  parseRoomAuthToken,
  RoomScope,
} from "./protocol/AuthToken";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { ClientMsg } from "./protocol/ClientMsg";
import { ClientMsgCode } from "./protocol/ClientMsg";
import type { Op } from "./protocol/Op";
import { OpCode } from "./protocol/Op";
import type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedRootObject,
} from "./protocol/SerializedCrdt";
import { isRootCrdt } from "./protocol/SerializedCrdt";
import type {
  InitialDocumentStateServerMsg,
  RoomStateServerMsg,
  ServerMsg,
  UpdatePresenceServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
} from "./protocol/ServerMsg";
import { ServerMsgCode } from "./protocol/ServerMsg";
import { MeRef } from "./refs/MeRef";
import { OthersRef } from "./refs/OthersRef";
import { DerivedRef, ValueRef } from "./refs/ValueRef";
import type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap";
import type { Others, OthersEvent } from "./types/Others";
import type { User } from "./types/User";
import { WebsocketCloseCodes } from "./types/WebsocketCloseCodes";

type CustomEvent<TRoomEvent extends Json> = {
  connectionId: number;
  event: TRoomEvent;
};

type AuthCallback = (room: string) => Promise<{ token: string }>;

export type Connection =
  /* The initial state, before connecting */
  | { state: "closed" }
  /* Authentication has started, but not finished yet */
  | { state: "authenticating" }
  /* Authentication succeeded, now attempting to connect to a room */
  | {
      state: "connecting";
      id: number;
      userId?: string;
      userInfo?: Json;
      isReadOnly: boolean;
    }
  /* Successful room connection, on the happy path */
  | {
      state: "open";
      id: number;
      userId?: string;
      userInfo?: Json;
      isReadOnly: boolean;
    }
  /* Connection lost unexpectedly, considered a temporary hiccup, will retry */
  | { state: "unavailable" }
  /* Connection failed due to known reason (e.g. rejected). Will throw error, then immediately jump to "unavailable" state, to attempt to reconnect */
  | { state: "failed" };

export type ConnectionState = Connection["state"];

type RoomEventCallbackMap<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  event: Callback<CustomEvent<TRoomEvent>>;
  "my-presence": Callback<TPresence>;
  //
  // NOTE: OthersEventCallback is the only one not taking a Callback<T> shape,
  // since this API historically has taken _two_ callback arguments instead of
  // just one.
  others: (
    others: Others<TPresence, TUserMeta>,
    event: OthersEvent<TPresence, TUserMeta>
  ) => void;
  error: Callback<Error>;
  connection: Callback<ConnectionState>;
  history: Callback<HistoryEvent>;
};

export interface History {
  /**
   * Undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xx" }
   */
  undo: () => void;

  /**
   * Redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xx" }
   * room.history.redo();
   * // room.getPresence() equals { selectedId: "yy" }
   */
  redo: () => void;

  /**
   * Returns whether there are any operations to undo.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * // room.history.canUndo() is true
   * room.history.undo();
   * // room.history.canUndo() is false
   */
  canUndo: () => boolean;

  /**
   * Returns whether there are any operations to redo.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.history.undo();
   * // room.history.canRedo() is true
   * room.history.redo();
   * // room.history.canRedo() is false
   */
  canRedo: () => boolean;

  /**
   * All future modifications made on the Room will be merged together to create a single history item until resume is called.
   *
   * @example
   * room.updatePresence({ cursor: { x: 0, y: 0 } }, { addToHistory: true });
   * room.history.pause();
   * room.updatePresence({ cursor: { x: 1, y: 1 } }, { addToHistory: true });
   * room.updatePresence({ cursor: { x: 2, y: 2 } }, { addToHistory: true });
   * room.history.resume();
   * room.history.undo();
   * // room.getPresence() equals { cursor: { x: 0, y: 0 } }
   */
  pause: () => void;

  /**
   * Resumes history. Modifications made on the Room are not merged into a single history item anymore.
   *
   * @example
   * room.updatePresence({ cursor: { x: 0, y: 0 } }, { addToHistory: true });
   * room.history.pause();
   * room.updatePresence({ cursor: { x: 1, y: 1 } }, { addToHistory: true });
   * room.updatePresence({ cursor: { x: 2, y: 2 } }, { addToHistory: true });
   * room.history.resume();
   * room.history.undo();
   * // room.getPresence() equals { cursor: { x: 0, y: 0 } }
   */
  resume: () => void;
}

export interface HistoryEvent {
  canUndo: boolean;
  canRedo: boolean;
}

export type RoomEventName = Extract<
  keyof RoomEventCallbackMap<never, never, never>,
  string
>;

export type RoomEventCallbackFor<
  E extends RoomEventName,
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = RoomEventCallbackMap<TPresence, TUserMeta, TRoomEvent>[E];

export type RoomEventCallback = RoomEventCallbackFor<
  RoomEventName,
  JsonObject,
  BaseUserMeta,
  Json
>;

export type BroadcastOptions = {
  /**
   * Whether or not event is queued if the connection is currently closed.
   *
   * ❗ We are not sure if we want to support this option in the future so it might be deprecated to be replaced by something else
   */
  shouldQueueEventIfNotReady: boolean;
};

export type Room<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  /**
   * The id of the room.
   */
  readonly id: string;
  /**
   * A client is considered "self aware" if it knows its own
   * metadata and connection ID (from the auth server).
   */
  isSelfAware(): boolean;
  getConnectionState(): ConnectionState;
  readonly subscribe: {
    /**
     * Subscribe to the current user presence updates.
     *
     * @param listener the callback that is called every time the current user presence is updated with {@link Room.updatePresence}.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * room.subscribe("my-presence", (presence) => {
     *   // Do something
     * });
     */
    (type: "my-presence", listener: Callback<TPresence>): () => void;

    /**
     * Subscribe to the other users updates.
     *
     * @param listener the callback that is called when a user enters or leaves the room or when a user update its presence.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * room.subscribe("others", (others) => {
     *   // Do something
     * });
     *
     */
    (
      type: "others",
      listener: (
        others: Others<TPresence, TUserMeta>,
        event: OthersEvent<TPresence, TUserMeta>
      ) => void
    ): () => void;

    /**
     * Subscribe to events broadcasted by {@link Room.broadcastEvent}
     *
     * @param listener the callback that is called when a user calls {@link Room.broadcastEvent}
     *
     * @returns Unsubscribe function.
     *
     * @example
     * room.subscribe("event", ({ event, connectionId }) => {
     *   // Do something
     * });
     *
     */
    (type: "event", listener: Callback<CustomEvent<TRoomEvent>>): () => void;

    /**
     * Subscribe to errors thrown in the room.
     *
     * @returns Unsubscribe function.
     *
     */
    (type: "error", listener: ErrorCallback): () => void;

    /**
     * Subscribe to connection state updates.
     *
     * @returns Unsubscribe function.
     *
     */
    (type: "connection", listener: Callback<ConnectionState>): () => void;

    /**
     * Subscribes to changes made on a Live structure. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the Live structure.
     *
     * @param callback The callback this called when the Live structure changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveMap = new LiveMap();  // Could also be LiveList or LiveObject
     * const unsubscribe = room.subscribe(liveMap, (liveMap) => { });
     * unsubscribe();
     */
    <L extends LiveStructure>(
      liveStructure: L,
      callback: (node: L) => void
    ): () => void;

    /**
     * Subscribes to changes made on a Live structure and all the nested data
     * structures. Returns an unsubscribe function. In a future version, we
     * will also expose what exactly changed in the Live structure.
     *
     * @param callback The callback this called when the Live structure, or any
     * of its nested values, changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveMap = new LiveMap();  // Could also be LiveList or LiveObject
     * const unsubscribe = room.subscribe(liveMap, (updates) => { }, { isDeep: true });
     * unsubscribe();
     */
    <L extends LiveStructure>(
      liveStructure: L,
      callback: StorageCallback,
      options: { isDeep: true }
    ): () => void;

    /**
     * Subscribe to the current user's history changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * room.subscribe("history", ({ canUndo, canRedo }) => {
     *   // Do something
     * });
     *
     */
    (type: "history", listener: Callback<HistoryEvent>): () => void;
  };

  /**
   * Room's history contains functions that let you undo and redo operation made on by the current client on the presence and storage.
   */
  readonly history: History;

  /**
   * Gets the current user.
   * Returns null if not it is not yet connected to the room.
   *
   * @example
   * const user = room.getSelf();
   */
  getSelf(): User<TPresence, TUserMeta> | null;

  /**
   * Gets the presence of the current user.
   *
   * @example
   * const presence = room.getPresence();
   */
  getPresence(): TPresence;

  /**
   * Gets all the other users in the room.
   *
   * @example
   * const others = room.getOthers();
   */
  getOthers(): Others<TPresence, TUserMeta>;

  /**
   * Updates the presence of the current user. Only pass the properties you want to update. No need to send the full presence.
   * @param patch A partial object that contains the properties you want to update.
   * @param options Optional object to configure the behavior of updatePresence.
   *
   * @example
   * room.updatePresence({ x: 0 });
   * room.updatePresence({ y: 0 });
   *
   * const presence = room.getPresence();
   * // presence is equivalent to { x: 0, y: 0 }
   */
  updatePresence(
    patch: Partial<TPresence>,
    options?: {
      /**
       * Whether or not the presence should have an impact on the undo/redo history.
       */
      addToHistory: boolean;
    }
  ): void;

  /**
   * Broadcasts an event to other users in the room. Event broadcasted to the room can be listened with {@link Room.subscribe}("event").
   * @param {any} event the event to broadcast. Should be serializable to JSON
   *
   * @example
   * // On client A
   * room.broadcastEvent({ type: "EMOJI", emoji: "🔥" });
   *
   * // On client B
   * room.subscribe("event", ({ event }) => {
   *   if(event.type === "EMOJI") {
   *     // Do something
   *   }
   * });
   */
  broadcastEvent(event: TRoomEvent, options?: BroadcastOptions): void;

  /**
   * Get the room's storage asynchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const { root } = await room.getStorage();
   */
  getStorage(): Promise<{
    root: LiveObject<TStorage>;
  }>;

  /**
   * Get the room's storage synchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const root = room.getStorageSnapshot();
   */
  getStorageSnapshot(): LiveObject<TStorage> | null;

  readonly events: {
    customEvent: Observable<{ connectionId: number; event: TRoomEvent }>;
    me: Observable<TPresence>;
    others: Observable<{
      others: Others<TPresence, TUserMeta>;
      event: OthersEvent<TPresence, TUserMeta>;
    }>;
    error: Observable<Error>;
    connection: Observable<ConnectionState>;
    storage: Observable<StorageUpdate[]>;
    history: Observable<HistoryEvent>;
    /**
     * Subscribe to the storage loaded event. Will fire at most once during the
     * lifetime of a Room.
     */
    storageDidLoad: Observable<void>;
  };

  /**
   * Batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the subscribers are called only after the batch is over.
   * All the modifications are merged in a single history item (undo/redo).
   *
   * @example
   * const { root } = await room.getStorage();
   * room.batch(() => {
   *   root.set("x", 0);
   *   room.updatePresence({ cursor: { x: 100, y: 100 }});
   * });
   */
  batch<T>(fn: () => T): T;

  /**
   * @internal Utilities only used for unit testing.
   */
  __INTERNAL_DO_NOT_USE: {
    simulateCloseWebsocket(): void;
    simulateSendCloseEvent(event: {
      code: number;
      wasClean: boolean;
      reason: string;
    }): void;
  };
};

export function isRoomEventName(value: string): value is RoomEventName {
  return (
    value === "my-presence" ||
    value === "others" ||
    value === "event" ||
    value === "error" ||
    value === "connection" ||
    value === "history"
  );
}

type Machine<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  // Internal
  onClose(event: { code: number; wasClean: boolean; reason: string }): void;
  onMessage(event: MessageEvent<string>): void;
  authenticationSuccess(token: RoomAuthToken, socket: WebSocket): void;
  heartbeat(): void;
  onNavigatorOnline(): void;

  // Internal dev tools
  simulateSocketClose(): void;
  simulateSendCloseEvent(event: {
    code: number;
    wasClean: boolean;
    reason: string;
  }): void;

  // onWakeUp,
  onVisibilityChange(visibilityState: DocumentVisibilityState): void;
  getUndoStack(): HistoryOp<TPresence>[][];
  getItemsCount(): number;

  // Core
  connect(): void;
  disconnect(): void;

  // Generic storage callbacks
  subscribe(callback: StorageCallback): () => void;

  // Storage callbacks filtered by Live structure
  subscribe<L extends LiveStructure>(liveStructure: L, callback: (node: L) => void): () => void; // prettier-ignore
  subscribe(node: LiveStructure, callback: StorageCallback, options: { isDeep: true }): () => void; // prettier-ignore

  // Room event callbacks
  subscribe<E extends RoomEventName>(type: E, listener: RoomEventCallbackFor<E, TPresence, TUserMeta, TRoomEvent>): () => void; // prettier-ignore

  // Presence
  updatePresence(
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ): void;
  broadcastEvent(event: TRoomEvent, options?: BroadcastOptions): void;

  batch<T>(callback: () => T): T;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  pauseHistory(): void;
  resumeHistory(): void;

  getStorage(): Promise<{
    root: LiveObject<TStorage>;
  }>;
  getStorageSnapshot(): LiveObject<TStorage> | null;

  readonly events: {
    readonly customEvent: Observable<CustomEvent<TRoomEvent>>;
    readonly me: Observable<TPresence>;
    readonly others: Observable<{
      others: Others<TPresence, TUserMeta>;
      event: OthersEvent<TPresence, TUserMeta>;
    }>;
    readonly error: Observable<Error>;
    readonly connection: Observable<ConnectionState>;
    readonly storage: Observable<StorageUpdate[]>;
    readonly history: Observable<HistoryEvent>;
    readonly storageDidLoad: Observable<void>;
  };

  // Core
  isSelfAware(): boolean;
  getConnectionState(): ConnectionState;
  getSelf(): User<TPresence, TUserMeta> | null;

  // Presence
  getPresence(): Readonly<TPresence>;
  getOthers(): Others<TPresence, TUserMeta>;
};

const BACKOFF_RETRY_DELAYS = [250, 500, 1000, 2000, 4000, 8000, 10000];
const BACKOFF_RETRY_DELAYS_SLOW = [2000, 30000, 60000, 300000];

const HEARTBEAT_INTERVAL = 30000;
// const WAKE_UP_CHECK_INTERVAL = 2000;
const PONG_TIMEOUT = 2000;

function makeIdFactory(connectionId: number): IdFactory {
  let count = 0;
  return () => `${connectionId}:${count++}`;
}

function log(..._params: unknown[]) {
  // console.log(...params, new Date().toString());
  return;
}

function isConnectionSelfAware(
  connection: Connection
): connection is typeof connection & { state: "open" | "connecting" } {
  return connection.state === "open" || connection.state === "connecting";
}

type HistoryOp<TPresence extends JsonObject> =
  | Op
  | {
      readonly type: "presence";
      readonly data: TPresence;
    };

type IdFactory = () => string;

type State<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  token: string | null;
  lastConnectionId: number | null; // TODO: Move into Connection type members?
  socket: WebSocket | null;
  lastFlushTime: number;
  buffer: {
    // Queued-up "my presence" updates to be flushed at the earliest convenience
    me:
      | { type: "partial"; data: Partial<TPresence> }
      | { type: "full"; data: TPresence }
      | null;
    messages: ClientMsg<TPresence, TRoomEvent>[];
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

  readonly connection: ValueRef<Connection>;
  readonly me: MeRef<TPresence>;
  readonly others: OthersRef<TPresence, TUserMeta>;

  idFactory: IdFactory | null;
  numberOfRetry: number;
  initialStorage?: TStorage;

  clock: number;
  opClock: number;
  nodes: Map<string, LiveNode>;
  root: LiveObject<TStorage> | undefined;

  undoStack: HistoryOp<TPresence>[][];
  redoStack: HistoryOp<TPresence>[][];

  /**
   * When history is paused, all operations will get queued up here. When
   * history is resumed, these operations get "committed" to the undo stack.
   */
  pausedHistory: null | HistoryOp<TPresence>[];

  /**
   * Place to collect all mutations during a batch. Ops will be sent over the
   * wire after the batch is ended.
   */
  activeBatch: null | {
    ops: Op[];
    reverseOps: HistoryOp<TPresence>[];
    updates: {
      others: [];
      presence: boolean;
      storageUpdates: Map<string, StorageUpdate>;
    };
  };

  offlineOperations: Map<string, Op>;
};

type Effects<TPresence extends JsonObject, TRoomEvent extends Json> = {
  authenticate(
    auth: AuthCallback,
    createWebSocket: (token: string) => WebSocket
  ): void;
  send(messages: ClientMsg<TPresence, TRoomEvent>[]): void;
  delayFlush(delay: number): number;
  startHeartbeatInterval(): number;
  schedulePongTimeout(): number;
  scheduleReconnect(delay: number): number;
};

export type Polyfills = {
  atob?: (data: string) => string;
  fetch?: typeof fetch;
  WebSocket?: any;
};

export type RoomInitializers<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = Resolve<{
  /**
   * The initial Presence to use and announce when you enter the Room. The
   * Presence is available on all users in the Room (me & others).
   */
  initialPresence: TPresence | ((roomId: string) => TPresence);
  /**
   * The initial Storage to use when entering a new Room.
   */
  initialStorage?: TStorage | ((roomId: string) => TStorage);
  /**
   * Whether or not the room connects to Liveblock servers. Default is true.
   *
   * Usually set to false when the client is used from the server to not call
   * the authentication endpoint or connect via WebSocket.
   */
  shouldInitiallyConnect?: boolean;
}>;

type Config = {
  roomId: string;
  throttleDelay: number;
  authentication: Authentication;
  liveblocksServer: string;

  polyfills?: Polyfills;

  /**
   * Only necessary when you’re using Liveblocks with React v17 or lower.
   *
   * If so, pass in a reference to `ReactDOM.unstable_batchedUpdates` here.
   * This will allow Liveblocks to circumvent the so-called "zombie child
   * problem". To learn more, see
   * https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child
   */
  unstable_batchedUpdates?: (cb: () => void) => void;

  /**
   * Backward-compatible way to set `polyfills.fetch`.
   */
  fetchPolyfill?: Polyfills["fetch"];

  /**
   * Backward-compatible way to set `polyfills.WebSocket`.
   */
  WebSocketPolyfill?: Polyfills["WebSocket"];
};

function makeStateMachine<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  state: State<TPresence, TStorage, TUserMeta, TRoomEvent>,
  config: Config,
  mockedEffects?: Effects<TPresence, TRoomEvent>
): Machine<TPresence, TStorage, TUserMeta, TRoomEvent> {
  const doNotBatchUpdates = (cb: () => void): void => cb();
  const batchUpdates = config.unstable_batchedUpdates ?? doNotBatchUpdates;

  const pool: ManagedPool = {
    roomId: config.roomId,

    getNode: (id: string) => state.nodes.get(id),
    addNode: (id: string, node: LiveNode) => void state.nodes.set(id, node),
    deleteNode: (id: string) => void state.nodes.delete(id),

    generateId: () => `${getConnectionId()}:${state.clock++}`,
    generateOpId: () => `${getConnectionId()}:${state.opClock++}`,

    dispatch(
      ops: Op[],
      reverse: Op[],
      storageUpdates: Map<string, StorageUpdate>
    ) {
      const activeBatch = state.activeBatch;

      if (activeBatch) {
        activeBatch.ops.push(...ops);
        storageUpdates.forEach((value, key) => {
          activeBatch.updates.storageUpdates.set(
            key,
            mergeStorageUpdates(
              activeBatch.updates.storageUpdates.get(key) as any, // FIXME
              value
            )
          );
        });
        activeBatch.reverseOps.push(...reverse);
      } else {
        batchUpdates(() => {
          addToUndoStack(reverse, doNotBatchUpdates);
          state.redoStack = [];
          dispatchOps(ops);
          notify({ storageUpdates }, doNotBatchUpdates);
        });
      }
    },

    assertStorageIsWritable: () => {
      if (
        isConnectionSelfAware(state.connection.current) &&
        state.connection.current.isReadOnly
      ) {
        throw new Error(
          "Cannot write to storage with a read only user, please ensure the user has write permissions"
        );
      }
    },
  };

  const eventHub = {
    customEvent: makeEventSource<CustomEvent<TRoomEvent>>(),
    me: makeEventSource<TPresence>(),
    others: makeEventSource<{
      others: Others<TPresence, TUserMeta>;
      event: OthersEvent<TPresence, TUserMeta>;
    }>(),
    error: makeEventSource<Error>(),
    connection: makeEventSource<ConnectionState>(),
    storage: makeEventSource<StorageUpdate[]>(),
    history: makeEventSource<HistoryEvent>(),
    storageDidLoad: makeEventSource<void>(),
  };

  const effects: Effects<TPresence, TRoomEvent> = mockedEffects || {
    authenticate(
      auth: AuthCallback,
      createWebSocket: (token: string) => WebSocket
    ) {
      const rawToken = state.token;
      const parsedToken = rawToken !== null && parseRoomAuthToken(rawToken);
      if (parsedToken && !isTokenExpired(parsedToken)) {
        const socket = createWebSocket(rawToken);
        authenticationSuccess(parsedToken, socket);
        return undefined;
      } else {
        return auth(config.roomId)
          .then(({ token }) => {
            if (state.connection.current.state !== "authenticating") {
              return;
            }
            const parsedToken = parseRoomAuthToken(token);
            const socket = createWebSocket(token);
            authenticationSuccess(parsedToken, socket);
            state.token = token;
          })
          .catch((er: unknown) =>
            authenticationFailure(
              er instanceof Error ? er : new Error(String(er))
            )
          );
      }
    },
    send(
      messageOrMessages:
        | ClientMsg<TPresence, TRoomEvent>
        | ClientMsg<TPresence, TRoomEvent>[]
    ) {
      if (state.socket === null) {
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

  const self = new DerivedRef(
    state.connection,
    state.me,
    (conn, me): User<TPresence, TUserMeta> | null =>
      isConnectionSelfAware(conn)
        ? {
            connectionId: conn.id,
            id: conn.userId,
            info: conn.userInfo,
            presence: me,
            isReadOnly: conn.isReadOnly,
          }
        : null
  );

  function createOrUpdateRootFromMessage(
    message: InitialDocumentStateServerMsg,
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (message.items.length === 0) {
      throw new Error("Internal error: cannot load storage without items");
    }

    if (state.root) {
      updateRoot(message.items, batchedUpdatesWrapper);
    } else {
      // TODO: For now, we'll assume the happy path, but reading this data from
      // the central storage server, it may very well turn out to not match the
      // manual type annotation. This will require runtime type validations!
      state.root = load(message.items) as LiveObject<TStorage>;
    }

    for (const key in state.initialStorage) {
      if (state.root.get(key) === undefined) {
        state.root.set(key, state.initialStorage[key]);
      }
    }
  }

  function buildRootAndParentToChildren(
    items: IdTuple<SerializedCrdt>[]
  ): [IdTuple<SerializedRootObject>, ParentToChildNodeMap] {
    const parentToChildren: ParentToChildNodeMap = new Map();
    let root: IdTuple<SerializedRootObject> | null = null;

    for (const [id, crdt] of items) {
      if (isRootCrdt(crdt)) {
        root = [id, crdt];
      } else {
        const tuple: IdTuple<SerializedChild> = [id, crdt];
        const children = parentToChildren.get(crdt.parentId);
        if (children !== undefined) {
          children.push(tuple);
        } else {
          parentToChildren.set(crdt.parentId, [tuple]);
        }
      }
    }

    if (root === null) {
      throw new Error("Root can't be null");
    }

    return [root, parentToChildren];
  }

  function updateRoot(
    items: IdTuple<SerializedCrdt>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (!state.root) {
      return;
    }

    const currentItems: NodeMap = new Map();
    state.nodes.forEach((node, id) => {
      currentItems.set(id, node._serialize());
    });

    // Get operations that represent the diff between 2 states.
    const ops = getTreesDiffOperations(currentItems, new Map(items));

    const result = applyOps(ops, false);

    notify(result.updates, batchedUpdatesWrapper);
  }

  function load(items: IdTuple<SerializedCrdt>[]): LiveObject<LsonObject> {
    // TODO Abstract these details into a LiveObject._fromItems() helper?
    const [root, parentToChildren] = buildRootAndParentToChildren(items);
    return LiveObject._deserialize(root, parentToChildren, pool);
  }

  function _addToRealUndoStack(
    historyOps: HistoryOp<TPresence>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    // If undo stack is too large, we remove the older item
    if (state.undoStack.length >= 50) {
      state.undoStack.shift();
    }

    state.undoStack.push(historyOps);
    onHistoryChange(batchedUpdatesWrapper);
  }

  function addToUndoStack(
    historyOps: HistoryOp<TPresence>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (state.pausedHistory !== null) {
      state.pausedHistory.unshift(...historyOps);
    } else {
      _addToRealUndoStack(historyOps, batchedUpdatesWrapper);
    }
  }

  function notify(
    {
      storageUpdates = new Map<string, StorageUpdate>(),
      presence = false,
      others: otherEvents = [],
    }: {
      storageUpdates?: Map<string, StorageUpdate>;
      presence?: boolean;
      others?: OthersEvent<TPresence, TUserMeta>[];
    },
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    batchedUpdatesWrapper(() => {
      if (otherEvents.length > 0) {
        const others = state.others.current;
        for (const event of otherEvents) {
          eventHub.others.notify({ others, event });
        }
      }

      if (presence) {
        eventHub.me.notify(state.me.current);
      }

      if (storageUpdates.size > 0) {
        const updates = Array.from(storageUpdates.values());
        eventHub.storage.notify(updates);
      }
    });
  }

  function getConnectionId() {
    const conn = state.connection.current;
    if (isConnectionSelfAware(conn)) {
      return conn.id;
    } else if (state.lastConnectionId !== null) {
      return state.lastConnectionId;
    }

    throw new Error(
      "Internal. Tried to get connection id but connection was never open"
    );
  }

  function applyOps<O extends HistoryOp<TPresence>>(
    rawOps: readonly O[],
    isLocal: boolean
  ): {
    // Input Ops can get opIds assigned during application.
    ops: O[];
    reverse: O[];
    updates: {
      storageUpdates: Map<string, StorageUpdate>;
      presence: boolean;
    };
  } {
    const output = {
      reverse: [] as O[],
      storageUpdates: new Map<string, StorageUpdate>(),
      presence: false,
    };

    const createdNodeIds = new Set<string>();

    // Ops applied after undo/redo won't have opIds assigned, yet. Let's do
    // that right now first.
    const ops = rawOps.map((op) => {
      if (op.type !== "presence" && !op.opId) {
        return { ...op, opId: pool.generateOpId() };
      } else {
        return op;
      }
    });

    for (const op of ops) {
      if (op.type === "presence") {
        const reverse = {
          type: "presence" as const,
          data: {} as TPresence,
        };

        for (const key in op.data) {
          reverse.data[key] = state.me.current[key];
        }

        state.me.patch(op.data);

        if (state.buffer.me === null) {
          state.buffer.me = { type: "partial", data: op.data };
        } else {
          // Merge the new fields with whatever is already queued up (doesn't
          // matter whether its a partial or full update)
          for (const key in op.data) {
            state.buffer.me.data[key] = op.data[key];
          }
        }

        output.reverse.unshift(reverse as O);
        output.presence = true;
      } else {
        let source: OpSource;

        if (isLocal) {
          source = OpSource.UNDOREDO_RECONNECT;
        } else {
          const deleted = state.offlineOperations.delete(nn(op.opId));
          source = deleted ? OpSource.ACK : OpSource.REMOTE;
        }

        const applyOpResult = applyOp(op, source);
        if (applyOpResult.modified) {
          const parentId =
            applyOpResult.modified.node.parent.type === "HasParent"
              ? nn(
                  applyOpResult.modified.node.parent.node._id,
                  "Expected parent node to have an ID"
                )
              : undefined;

          // If the parent is the root (undefined) or was created in the same batch, we don't want to notify
          // storage updates for the children.
          if (!parentId || !createdNodeIds.has(parentId)) {
            output.storageUpdates.set(
              nn(applyOpResult.modified.node._id),
              mergeStorageUpdates(
                output.storageUpdates.get(
                  nn(applyOpResult.modified.node._id)
                ) as any, // FIXME
                applyOpResult.modified
              )
            );
            output.reverse.unshift(...(applyOpResult.reverse as O[]));
          }

          if (
            op.type === OpCode.CREATE_LIST ||
            op.type === OpCode.CREATE_MAP ||
            op.type === OpCode.CREATE_OBJECT
          ) {
            createdNodeIds.add(nn(applyOpResult.modified.node._id));
          }
        }
      }
    }

    return {
      ops,
      reverse: output.reverse,
      updates: {
        storageUpdates: output.storageUpdates,
        presence: output.presence,
      },
    };
  }

  function applyOp(op: Op, source: OpSource): ApplyResult {
    switch (op.type) {
      case OpCode.DELETE_OBJECT_KEY:
      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_CRDT: {
        const node = state.nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }

        return node._apply(op, source === OpSource.UNDOREDO_RECONNECT);
      }
      case OpCode.SET_PARENT_KEY: {
        const node = state.nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }

        if (node.parent.type === "HasParent" && isLiveList(node.parent.node)) {
          return node.parent.node._setChildKey(op.parentKey, node, source);
        }
        return { modified: false };
      }
      case OpCode.CREATE_OBJECT:
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER: {
        if (op.parentId === undefined) {
          return { modified: false };
        }

        const parentNode = state.nodes.get(op.parentId);
        if (parentNode === undefined) {
          return { modified: false };
        }

        return parentNode._attachChild(op, source);
      }
    }
  }

  function subscribeToLiveStructureDeeply<L extends LiveStructure>(
    node: L,
    callback: (updates: StorageUpdate[]) => void
  ): () => void {
    return eventHub.storage.subscribe((updates) => {
      const relatedUpdates = updates.filter((update) =>
        isSameNodeOrChildOf(update.node, node)
      );
      if (relatedUpdates.length > 0) {
        callback(relatedUpdates);
      }
    });
  }

  function subscribeToLiveStructureShallowly<L extends LiveStructure>(
    node: L,
    callback: (node: L) => void
  ): () => void {
    return eventHub.storage.subscribe((updates) => {
      for (const update of updates) {
        if (update.node._id === node._id) {
          callback(update.node as L);
        }
      }
    });
  }

  // Generic storage callbacks
  function subscribe(callback: StorageCallback): () => void; // prettier-ignore
  // Storage callbacks filtered by Live structure
  function subscribe<L extends LiveStructure>(liveStructure: L, callback: (node: L) => void): () => void; // prettier-ignore
  function subscribe(node: LiveStructure, callback: StorageCallback, options: { isDeep: true }): () => void; // prettier-ignore
  // Room event callbacks
  function subscribe<E extends RoomEventName>(type: E, listener: RoomEventCallbackFor<E, TPresence, TUserMeta, TRoomEvent>): () => void; // prettier-ignore

  function subscribe<L extends LiveStructure, E extends RoomEventName>(
    first: StorageCallback | L | E,
    second?: ((node: L) => void) | StorageCallback | RoomEventCallback,
    options?: { isDeep: boolean }
  ): () => void {
    if (typeof first === "string" && isRoomEventName(first)) {
      if (typeof second !== "function") {
        throw new Error("Second argument must be a callback function");
      }
      const callback = second;
      switch (first) {
        case "event":
          return eventHub.customEvent.subscribe(
            callback as Callback<CustomEvent<TRoomEvent>>
          );

        case "my-presence":
          return eventHub.me.subscribe(callback as Callback<TPresence>);

        case "others": {
          // NOTE: Others have a different callback structure, where the API
          // exposed on the outside takes _two_ callback arguments!
          const cb = callback as (
            others: Others<TPresence, TUserMeta>,
            event: OthersEvent<TPresence, TUserMeta>
          ) => void;
          return eventHub.others.subscribe(({ others, event }) =>
            cb(others, event)
          );
        }

        case "error":
          return eventHub.error.subscribe(callback as Callback<Error>);

        case "connection":
          return eventHub.connection.subscribe(
            callback as Callback<ConnectionState>
          );

        case "storage":
          return eventHub.storage.subscribe(
            callback as Callback<StorageUpdate[]>
          );

        case "history":
          return eventHub.history.subscribe(callback as Callback<HistoryEvent>);

        // istanbul ignore next
        default:
          return assertNever(first, "Unknown event");
      }
    }

    if (second === undefined || typeof first === "function") {
      if (typeof first === "function") {
        const storageCallback = first;
        return eventHub.storage.subscribe(storageCallback);
      } else {
        // istanbul ignore next
        throw new Error("Please specify a listener callback");
      }
    }

    if (isLiveNode(first)) {
      const node = first;
      if (options?.isDeep) {
        const storageCallback = second as StorageCallback;
        return subscribeToLiveStructureDeeply(node, storageCallback);
      } else {
        const nodeCallback = second as (node: L) => void;
        return subscribeToLiveStructureShallowly(node, nodeCallback);
      }
    }

    throw new Error(`"${first}" is not a valid event name`);
  }

  function getConnectionState() {
    return state.connection.current.state;
  }

  function connect() {
    if (
      state.connection.current.state !== "closed" &&
      state.connection.current.state !== "unavailable"
    ) {
      return;
    }

    const auth = prepareAuthEndpoint(
      config.authentication,
      config.polyfills?.fetch ?? config.fetchPolyfill
    );
    const createWebSocket = prepareCreateWebSocket(
      config.liveblocksServer,
      config.polyfills?.WebSocket ?? config.WebSocketPolyfill
    );

    updateConnection({ state: "authenticating" }, batchUpdates);
    effects.authenticate(auth, createWebSocket);
  }

  function updatePresence(
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) {
    const oldValues = {} as TPresence;

    if (state.buffer.me === null) {
      state.buffer.me = {
        type: "partial",
        data: {},
      };
    }

    for (const key in patch) {
      type K = typeof key;
      const overrideValue: TPresence[K] | undefined = patch[key];
      if (overrideValue === undefined) {
        continue;
      }
      state.buffer.me.data[key] = overrideValue;
      oldValues[key] = state.me.current[key];
    }

    state.me.patch(patch);

    if (state.activeBatch) {
      if (options?.addToHistory) {
        state.activeBatch.reverseOps.push({
          type: "presence",
          data: oldValues,
        });
      }
      state.activeBatch.updates.presence = true;
    } else {
      tryFlushing();
      batchUpdates(() => {
        if (options?.addToHistory) {
          addToUndoStack(
            [{ type: "presence", data: oldValues }],
            doNotBatchUpdates
          );
        }
        notify({ presence: true }, doNotBatchUpdates);
      });
    }
  }

  function isStorageReadOnly(scopes: string[]) {
    return (
      scopes.includes(RoomScope.Read) &&
      scopes.includes(RoomScope.PresenceWrite) &&
      !scopes.includes(RoomScope.Write)
    );
  }

  function authenticationSuccess(token: RoomAuthToken, socket: WebSocket) {
    socket.addEventListener("message", onMessage);
    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);

    updateConnection(
      {
        state: "connecting",
        id: token.actor,
        userInfo: token.info,
        userId: token.id,
        isReadOnly: isStorageReadOnly(token.scopes),
      },
      batchUpdates
    );
    state.idFactory = makeIdFactory(token.actor);
    state.socket = socket;
  }

  function authenticationFailure(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Call to authentication endpoint failed", error);
    }
    state.token = null;
    updateConnection({ state: "unavailable" }, batchUpdates);
    state.numberOfRetry++;
    state.timeoutHandles.reconnect = effects.scheduleReconnect(getRetryDelay());
  }

  function onVisibilityChange(visibilityState: DocumentVisibilityState) {
    if (
      visibilityState === "visible" &&
      state.connection.current.state === "open"
    ) {
      log("Heartbeat after visibility change");
      heartbeat();
    }
  }

  function onUpdatePresenceMessage(
    message: UpdatePresenceServerMsg<TPresence>
  ): OthersEvent<TPresence, TUserMeta> | undefined {
    if (message.targetActor !== undefined) {
      // The incoming message is a full presence update. We are obliged to
      // handle it if `targetActor` matches our own connection ID, but we can
      // use the opportunity to effectively reset the known presence as
      // a "keyframe" update, while we have free access to it.
      const oldUser = state.others.getUser(message.actor);
      state.others.setOther(message.actor, message.data);

      const newUser = state.others.getUser(message.actor);
      if (oldUser === undefined && newUser !== undefined) {
        // The user just became "visible" due to this update, so fire the
        // "enter" event
        return { type: "enter", user: newUser };
      }
    } else {
      // The incoming message is a partial presence update
      state.others.patchOther(message.actor, message.data), message;
    }

    const user = state.others.getUser(message.actor);
    if (user) {
      return {
        type: "update",
        updates: message.data,
        user,
      };
    } else {
      return undefined;
    }
  }

  function onUserLeftMessage(
    message: UserLeftServerMsg
  ): OthersEvent<TPresence, TUserMeta> | null {
    const user = state.others.getUser(message.actor);
    if (user) {
      state.others.removeConnection(message.actor);
      return { type: "leave", user };
    }
    return null;
  }

  function onRoomStateMessage(
    message: RoomStateServerMsg<TUserMeta>
  ): OthersEvent<TPresence, TUserMeta> {
    for (const key in message.users) {
      const user = message.users[key];
      const connectionId = Number(key);
      state.others.setConnection(
        connectionId,
        user.id,
        user.info,
        isStorageReadOnly(user.scopes)
      );
    }
    return { type: "reset" };
  }

  function onNavigatorOnline() {
    if (state.connection.current.state === "unavailable") {
      log("Try to reconnect after connectivity change");
      reconnect();
    }
  }

  function onHistoryChange(batchedUpdatesWrapper: (cb: () => void) => void) {
    batchedUpdatesWrapper(() => {
      eventHub.history.notify({ canUndo: canUndo(), canRedo: canRedo() });
    });
  }

  function onUserJoinedMessage(
    message: UserJoinServerMsg<TUserMeta>
  ): OthersEvent<TPresence, TUserMeta> | undefined {
    state.others.setConnection(
      message.actor,
      message.id,
      message.info,
      isStorageReadOnly(message.scopes)
    );
    // Send current presence to new user
    // TODO: Consider storing it on the backend
    state.buffer.messages.push({
      type: ClientMsgCode.UPDATE_PRESENCE,
      data: state.me.current,
      targetActor: message.actor,
    });
    tryFlushing();

    // We recorded the connection, but we won't make the new user visible
    // unless we also know their initial presence data at this point.
    const user = state.others.getUser(message.actor);
    return user ? { type: "enter", user } : undefined;
  }

  function parseServerMessage(
    data: Json
  ): ServerMsg<TPresence, TUserMeta, TRoomEvent> | null {
    if (!isJsonObject(data)) {
      return null;
    }

    return data as ServerMsg<TPresence, TUserMeta, TRoomEvent>;
    //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FIXME: Properly validate incoming external data instead!
  }

  function parseServerMessages(
    text: string
  ): ServerMsg<TPresence, TUserMeta, TRoomEvent>[] | null {
    const data: Json | undefined = tryParseJson(text);
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

    const messages = parseServerMessages(event.data);
    if (messages === null || messages.length === 0) {
      // istanbul ignore next: Unknown incoming message
      return;
    }

    const updates = {
      storageUpdates: new Map<string, StorageUpdate>(),
      others: [] as OthersEvent<TPresence, TUserMeta>[],
    };

    batchUpdates(() => {
      for (const message of messages) {
        switch (message.type) {
          case ServerMsgCode.USER_JOINED: {
            const userJoinedUpdate = onUserJoinedMessage(message);
            if (userJoinedUpdate) {
              updates.others.push(userJoinedUpdate);
            }
            break;
          }

          case ServerMsgCode.UPDATE_PRESENCE: {
            const othersPresenceUpdate = onUpdatePresenceMessage(message);
            if (othersPresenceUpdate) {
              updates.others.push(othersPresenceUpdate);
            }
            break;
          }

          case ServerMsgCode.BROADCASTED_EVENT: {
            eventHub.customEvent.notify({
              connectionId: message.actor,
              event: message.event,
            });
            break;
          }

          case ServerMsgCode.USER_LEFT: {
            const event = onUserLeftMessage(message);
            if (event) {
              updates.others.push(event);
            }
            break;
          }

          case ServerMsgCode.ROOM_STATE: {
            updates.others.push(onRoomStateMessage(message));
            break;
          }

          case ServerMsgCode.INITIAL_STORAGE_STATE: {
            // createOrUpdateRootFromMessage function could add ops to offlineOperations.
            // Client shouldn't resend these ops as part of the offline ops sending after reconnect.
            const offlineOps = new Map(state.offlineOperations);
            createOrUpdateRootFromMessage(message, doNotBatchUpdates);
            applyAndSendOfflineOps(offlineOps, doNotBatchUpdates);
            if (_getInitialStateResolver !== null) {
              _getInitialStateResolver();
            }
            eventHub.storageDidLoad.notify();
            break;
          }
          // Write event
          case ServerMsgCode.UPDATE_STORAGE: {
            const applyResult = applyOps(message.ops, false);
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

      notify(updates, doNotBatchUpdates);
    });
  }

  function onClose(event: { code: number; wasClean: boolean; reason: string }) {
    state.socket = null;

    clearTimeout(state.timeoutHandles.pongTimeout);
    clearInterval(state.intervalHandles.heartbeat);
    if (state.timeoutHandles.flush) {
      clearTimeout(state.timeoutHandles.flush);
    }
    clearTimeout(state.timeoutHandles.reconnect);

    state.others.clearOthers();

    batchUpdates(() => {
      notify({ others: [{ type: "reset" }] }, doNotBatchUpdates);

      if (event.code >= 4000 && event.code <= 4100) {
        updateConnection({ state: "failed" }, doNotBatchUpdates);

        const error = new LiveblocksError(event.reason, event.code);
        eventHub.error.notify(error);

        const delay = getRetryDelay(true);
        state.numberOfRetry++;

        if (process.env.NODE_ENV !== "production") {
          console.error(
            `Connection to websocket server closed. Reason: ${error.message} (code: ${error.code}). Retrying in ${delay}ms.`
          );
        }

        updateConnection({ state: "unavailable" }, doNotBatchUpdates);
        state.timeoutHandles.reconnect = effects.scheduleReconnect(delay);
      } else if (event.code === WebsocketCloseCodes.CLOSE_WITHOUT_RETRY) {
        updateConnection({ state: "closed" }, doNotBatchUpdates);
      } else {
        const delay = getRetryDelay();
        state.numberOfRetry++;

        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `Connection to Liveblocks websocket server closed (code: ${event.code}). Retrying in ${delay}ms.`
          );
        }
        updateConnection({ state: "unavailable" }, doNotBatchUpdates);
        state.timeoutHandles.reconnect = effects.scheduleReconnect(delay);
      }
    });
  }

  function updateConnection(
    connection: Connection,
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    state.connection.set(connection);
    batchedUpdatesWrapper(() => {
      eventHub.connection.notify(connection.state);
    });
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

    if (state.connection.current.state === "connecting") {
      updateConnection(
        { ...state.connection.current, state: "open" },
        batchUpdates
      );
      state.numberOfRetry = 0;

      // Re-broadcast the user presence during a reconnect.
      if (state.lastConnectionId !== undefined) {
        state.buffer.me = {
          type: "full",
          data:
            // Because state.me.current is a readonly object, we'll have to
            // make a copy here. Otherwise, type errors happen later when
            // "patching" my presence.
            { ...state.me.current },
        };
        tryFlushing();
      }

      state.lastConnectionId = state.connection.current.id;

      if (state.root) {
        state.buffer.messages.push({ type: ClientMsgCode.FETCH_STORAGE });
      }
      tryFlushing();
    } else {
      // TODO
    }
  }

  function heartbeat() {
    if (state.socket === null) {
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

    updateConnection({ state: "unavailable" }, batchUpdates);
    clearTimeout(state.timeoutHandles.pongTimeout);
    if (state.timeoutHandles.flush) {
      clearTimeout(state.timeoutHandles.flush);
    }
    clearTimeout(state.timeoutHandles.reconnect);
    clearInterval(state.intervalHandles.heartbeat);
    connect();
  }

  function applyAndSendOfflineOps(
    offlineOps: Map<string | undefined, Op>,
    //                       ^^^^^^^^^ NOTE: Bug? Unintended?
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (offlineOps.size === 0) {
      return;
    }

    const messages: ClientMsg<TPresence, TRoomEvent>[] = [];

    const ops = Array.from(offlineOps.values());

    const result = applyOps(ops, true);

    messages.push({
      type: ClientMsgCode.UPDATE_STORAGE,
      ops: result.ops,
    });

    notify(result.updates, batchedUpdatesWrapper);

    effects.send(messages);
  }

  function tryFlushing() {
    const storageOps = state.buffer.storageOperations;

    if (storageOps.length > 0) {
      storageOps.forEach((op) => {
        state.offlineOperations.set(nn(op.opId), op);
      });
    }

    if (
      state.socket === null ||
      state.socket.readyState !== state.socket.OPEN
    ) {
      state.buffer.storageOperations = [];
      return;
    }

    const now = Date.now();

    const elapsedTime = now - state.lastFlushTime;

    if (elapsedTime > config.throttleDelay) {
      const messages = flushDataToMessages(state);

      if (messages.length === 0) {
        return;
      }
      effects.send(messages);
      state.buffer = {
        messages: [],
        storageOperations: [],
        me: null,
      };
      state.lastFlushTime = now;
    } else {
      if (state.timeoutHandles.flush !== null) {
        clearTimeout(state.timeoutHandles.flush);
      }

      state.timeoutHandles.flush = effects.delayFlush(
        config.throttleDelay - (now - state.lastFlushTime)
      );
    }
  }

  function flushDataToMessages(
    state: State<TPresence, TStorage, TUserMeta, TRoomEvent>
  ) {
    const messages: ClientMsg<TPresence, TRoomEvent>[] = [];
    if (state.buffer.me) {
      messages.push(
        state.buffer.me.type === "full"
          ? {
              type: ClientMsgCode.UPDATE_PRESENCE,
              // Populating the `targetActor` field turns this message into
              // a Full Presence™ update message (not a patch), which will get
              // interpreted by other clients as such.
              targetActor: -1,
              data: state.buffer.me.data,
            }
          : {
              type: ClientMsgCode.UPDATE_PRESENCE,
              data: state.buffer.me.data,
            }
      );
    }
    for (const event of state.buffer.messages) {
      messages.push(event);
    }
    if (state.buffer.storageOperations.length > 0) {
      messages.push({
        type: ClientMsgCode.UPDATE_STORAGE,
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

    batchUpdates(() => {
      updateConnection({ state: "closed" }, doNotBatchUpdates);

      if (state.timeoutHandles.flush) {
        clearTimeout(state.timeoutHandles.flush);
      }
      clearTimeout(state.timeoutHandles.reconnect);
      clearTimeout(state.timeoutHandles.pongTimeout);
      clearInterval(state.intervalHandles.heartbeat);

      state.others.clearOthers();
      notify({ others: [{ type: "reset" }] }, doNotBatchUpdates);

      // Clear all event listeners
      Object.values(eventHub).forEach((eventSource) => eventSource.clear());
    });
  }

  function getPresence(): Readonly<TPresence> {
    return state.me.current;
  }

  function getOthers(): Others<TPresence, TUserMeta> {
    return state.others.current;
  }

  function broadcastEvent(
    event: TRoomEvent,
    options: BroadcastOptions = {
      shouldQueueEventIfNotReady: false,
    }
  ) {
    if (state.socket === null && !options.shouldQueueEventIfNotReady) {
      return;
    }

    state.buffer.messages.push({
      type: ClientMsgCode.BROADCAST_EVENT,
      event,
    });
    tryFlushing();
  }

  function dispatchOps(ops: Op[]) {
    state.buffer.storageOperations.push(...ops);
    tryFlushing();
  }

  let _getInitialStatePromise: Promise<void> | null = null;
  let _getInitialStateResolver: (() => void) | null = null;

  function startLoadingStorage(): Promise<void> {
    if (_getInitialStatePromise === null) {
      state.buffer.messages.push({ type: ClientMsgCode.FETCH_STORAGE });
      tryFlushing();
      _getInitialStatePromise = new Promise(
        (resolve) => (_getInitialStateResolver = resolve)
      );
    }
    return _getInitialStatePromise;
  }

  /**
   * Closely related to .getStorage(), but synchronously. Will be `null`
   * initially. When requested for the first time, will kick off the loading of
   * Storage if it hasn't happened yet.
   *
   * Once Storage is loaded, will return a stable reference to the storage
   * root.
   */
  function getStorageSnapshot(): LiveObject<TStorage> | null {
    const root = state.root;
    if (root !== undefined) {
      // Done loading
      return root;
    } else {
      // Not done loading, kick off the loading (will not do anything if already kicked off)
      startLoadingStorage();
      return null;
    }
  }

  async function getStorage(): Promise<{
    root: LiveObject<TStorage>;
  }> {
    if (state.root) {
      // Store has already loaded, so we can resolve it directly
      return Promise.resolve({
        root: state.root as LiveObject<TStorage>,
      });
    }

    await startLoadingStorage();
    return {
      root: nn(state.root) as LiveObject<TStorage>,
    };
  }

  function undo() {
    if (state.activeBatch) {
      throw new Error("undo is not allowed during a batch");
    }
    const historyOps = state.undoStack.pop();
    if (historyOps === undefined) {
      return;
    }

    state.pausedHistory = null;
    const result = applyOps(historyOps, true);

    batchUpdates(() => {
      notify(result.updates, doNotBatchUpdates);
      state.redoStack.push(result.reverse);
      onHistoryChange(doNotBatchUpdates);
    });

    for (const op of result.ops) {
      if (op.type !== "presence") {
        state.buffer.storageOperations.push(op);
      }
    }
    tryFlushing();
  }

  function canUndo() {
    return state.undoStack.length > 0;
  }

  function redo() {
    if (state.activeBatch) {
      throw new Error("redo is not allowed during a batch");
    }

    const historyOps = state.redoStack.pop();
    if (historyOps === undefined) {
      return;
    }

    state.pausedHistory = null;
    const result = applyOps(historyOps, true);

    batchUpdates(() => {
      notify(result.updates, doNotBatchUpdates);
      state.undoStack.push(result.reverse);
      onHistoryChange(doNotBatchUpdates);
    });

    for (const op of result.ops) {
      if (op.type !== "presence") {
        state.buffer.storageOperations.push(op);
      }
    }
    tryFlushing();
  }

  function canRedo() {
    return state.redoStack.length > 0;
  }

  function batch<T>(callback: () => T): T {
    if (state.activeBatch) {
      // If there already is an active batch, we don't have to handle this in
      // any special way. That outer active batch will handle the batch. This
      // nested call can be a no-op.
      return callback();
    }

    let returnValue: T = undefined as unknown as T;

    batchUpdates(() => {
      state.activeBatch = {
        ops: [],
        updates: {
          storageUpdates: new Map(),
          presence: false,
          others: [],
        },
        reverseOps: [],
      };
      try {
        returnValue = callback();
      } finally {
        // "Pop" the current batch of the state, closing the active batch, but
        // handling it separately here
        const currentBatch = state.activeBatch;
        state.activeBatch = null;

        if (currentBatch.reverseOps.length > 0) {
          addToUndoStack(currentBatch.reverseOps, doNotBatchUpdates);
        }

        if (currentBatch.ops.length > 0) {
          // Only clear the redo stack if something has changed during a batch
          // Clear the redo stack because batch is always called from a local operation
          state.redoStack = [];
        }

        if (currentBatch.ops.length > 0) {
          dispatchOps(currentBatch.ops);
        }

        notify(currentBatch.updates, doNotBatchUpdates);
        tryFlushing();
      }
    });

    return returnValue;
  }

  function pauseHistory() {
    state.pausedHistory = [];
  }

  function resumeHistory() {
    const historyOps = state.pausedHistory;
    state.pausedHistory = null;
    if (historyOps !== null && historyOps.length > 0) {
      _addToRealUndoStack(historyOps, batchUpdates);
    }
  }

  function simulateSocketClose() {
    if (state.socket) {
      state.socket = null;
    }
  }

  function simulateSendCloseEvent(event: {
    code: number;
    wasClean: boolean;
    reason: string;
  }) {
    onClose(event);
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
    onVisibilityChange,
    getUndoStack: () => state.undoStack,
    getItemsCount: () => state.nodes.size,

    // Core
    connect,
    disconnect,
    subscribe,

    // Presence
    updatePresence,
    broadcastEvent,

    // Storage
    batch,
    undo,
    redo,
    canUndo,
    canRedo,
    pauseHistory,
    resumeHistory,

    getStorage,
    getStorageSnapshot,

    events: {
      customEvent: eventHub.customEvent.observable,
      others: eventHub.others.observable,
      me: eventHub.me.observable,
      error: eventHub.error.observable,
      connection: eventHub.connection.observable,
      storage: eventHub.storage.observable,
      history: eventHub.history.observable,
      storageDidLoad: eventHub.storageDidLoad.observable,
    },

    // Core
    getConnectionState,
    isSelfAware: () => isConnectionSelfAware(state.connection.current),
    getSelf: () => self.current,

    // Presence
    getPresence,
    getOthers,
  };
}

function defaultState<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  initialPresence: TPresence,
  initialStorage?: TStorage
): State<TPresence, TStorage, TUserMeta, TRoomEvent> {
  const others = new OthersRef<TPresence, TUserMeta>();

  const connection = new ValueRef<Connection>({ state: "closed" });

  return {
    token: null,
    lastConnectionId: null,
    socket: null,
    numberOfRetry: 0,
    lastFlushTime: 0,
    timeoutHandles: {
      flush: null,
      reconnect: 0,
      pongTimeout: 0,
    },
    buffer: {
      me:
        // Queue up the initial presence message as a Full Presence™ update
        {
          type: "full",
          data: initialPresence,
        },
      messages: [],
      storageOperations: [],
    },
    intervalHandles: {
      heartbeat: 0,
    },

    connection,
    me: new MeRef(initialPresence),
    others,

    initialStorage,
    idFactory: null,

    // Storage
    clock: 0,
    opClock: 0,
    nodes: new Map<string, LiveNode>(),
    root: undefined,

    undoStack: [],
    redoStack: [],
    pausedHistory: null,

    activeBatch: null,
    offlineOperations: new Map<string, Op>(),
  };
}

/** @internal */
export type InternalRoom<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  connect: () => void;
  disconnect: () => void;
  onNavigatorOnline: () => void;
  onVisibilityChange: (visibilityState: DocumentVisibilityState) => void;
};

export function createRoom<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  options: RoomInitializers<TPresence, TStorage>,
  config: Config
): InternalRoom<TPresence, TStorage, TUserMeta, TRoomEvent> {
  const { initialPresence, initialStorage } = options;

  const state = defaultState<TPresence, TStorage, TUserMeta, TRoomEvent>(
    typeof initialPresence === "function"
      ? initialPresence(config.roomId)
      : initialPresence,
    typeof initialStorage === "function"
      ? initialStorage(config.roomId)
      : initialStorage
  );

  const machine = makeStateMachine<TPresence, TStorage, TUserMeta, TRoomEvent>(
    state,
    config
  );

  const room: Room<TPresence, TStorage, TUserMeta, TRoomEvent> = {
    id: config.roomId,
    /////////////
    // Core    //
    /////////////
    getConnectionState: machine.getConnectionState,
    isSelfAware: machine.isSelfAware,
    getSelf: machine.getSelf,

    subscribe: machine.subscribe,

    //////////////
    // Presence //
    //////////////
    getPresence: machine.getPresence,
    updatePresence: machine.updatePresence,
    getOthers: machine.getOthers,
    broadcastEvent: machine.broadcastEvent,

    //////////////
    // Storage  //
    //////////////
    getStorage: machine.getStorage,
    getStorageSnapshot: machine.getStorageSnapshot,
    events: machine.events,

    batch: machine.batch,
    history: {
      undo: machine.undo,
      redo: machine.redo,
      canUndo: machine.canUndo,
      canRedo: machine.canRedo,
      pause: machine.pauseHistory,
      resume: machine.resumeHistory,
    },

    __INTERNAL_DO_NOT_USE: {
      simulateCloseWebsocket: machine.simulateSocketClose,
      simulateSendCloseEvent: machine.simulateSendCloseEvent,
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

function prepareCreateWebSocket(
  liveblocksServer: string,
  WebSocketPolyfill?: typeof WebSocket
) {
  if (typeof window === "undefined" && WebSocketPolyfill === undefined) {
    throw new Error(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );
  }

  const ws = WebSocketPolyfill || WebSocket;

  return (token: string): WebSocket => {
    return new ws(
      `${liveblocksServer}/?token=${token}&version=${
        // prettier-ignore
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore (__PACKAGE_VERSION__ will be injected by the build script)
        typeof __PACKAGE_VERSION__ === "string" ? /* istanbul ignore next */ __PACKAGE_VERSION__ : "dev"
      }`
    );
  };
}

function prepareAuthEndpoint(
  authentication: Authentication,
  fetchPolyfill?: typeof window.fetch
): AuthCallback {
  if (authentication.type === "public") {
    if (typeof window === "undefined" && fetchPolyfill === undefined) {
      throw new Error(
        "To use Liveblocks client in a non-dom environment with a publicApiKey, you need to provide a fetch polyfill."
      );
    }

    return (room: string) =>
      fetchAuthEndpoint(
        fetchPolyfill || /* istanbul ignore next */ fetch,
        authentication.url,
        {
          room,
          publicApiKey: authentication.publicApiKey,
        }
      );
  }

  if (authentication.type === "private") {
    if (typeof window === "undefined" && fetchPolyfill === undefined) {
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
    return async (room: string) => {
      const response = await authentication.callback(room);
      if (!response || !response.token) {
        throw new Error(
          'Authentication error. We expect the authentication callback to return a token, but it does not. Hint: the return value should look like: { token: "..." }'
        );
      }
      return response;
    };
  }

  throw new Error("Internal error. Unexpected authentication type");
}

async function fetchAuthEndpoint(
  fetch: typeof window.fetch,
  endpoint: string,
  body: {
    room: string;
    publicApiKey?: string;
  }
): Promise<{ token: string }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AuthenticationError(
      `Expected a status 200 but got ${res.status} when doing a POST request on "${endpoint}"`
    );
  }
  let data: Json;
  try {
    data = await (res.json() as Promise<Json>);
  } catch (er) {
    throw new AuthenticationError(
      `Expected a JSON response when doing a POST request on "${endpoint}". ${er}`
    );
  }
  if (!isPlainObject(data) || typeof data.token !== "string") {
    throw new AuthenticationError(
      `Expected a JSON response of the form \`{ token: "..." }\` when doing a POST request on "${endpoint}", but got ${JSON.stringify(
        data
      )}`
    );
  }
  const { token } = data;
  return { token };
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

//
// These exports are considered private implementation details and only
// exported here to be accessed used in our test suite.
//
export {
  defaultState as _private_defaultState,
  makeStateMachine as _private_makeStateMachine,
};
export type { Effects as _private_Effects, Machine as _private_Machine };
