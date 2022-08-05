import type { LiveList } from "../LiveList";
import type { LiveMap } from "../LiveMap";
import type { LiveObject } from "../LiveObject";
import type { BaseUserMeta } from "./BaseUserMeta";
import type { Json, JsonObject } from "./Json";
import type { LiveStructure, Lson, LsonObject } from "./Lson";

/**
 * This helper type is effectively a no-op, but will force TypeScript to
 * "evaluate" any named helper types in its definition. This can sometimes make
 * API signatures clearer in IDEs.
 *
 * For example, in:
 *
 *   type Payload<T> = { data: T };
 *
 *   let r1: Payload<string>;
 *   let r2: Resolve<Payload<string>>;
 *
 * The inferred type of `r1` is going to be `Payload<string>` which shows up in
 * editor hints, and it may be unclear what's inside if you don't know the
 * definition of `Payload`.
 *
 * The inferred type of `r2` is going to be `{ data: string }`, which may be
 * more helpful.
 *
 * This trick comes from:
 * https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Resolve<T> = T extends (...args: unknown[]) => unknown
  ? T
  : { [K in keyof T]: T[K] };

export type MyPresenceCallback<TPresence extends JsonObject> = (
  me: TPresence
) => void;

export type OthersEventCallback<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = (
  others: Others<TPresence, TUserMeta>,
  event: OthersEvent<TPresence, TUserMeta>
) => void;

export type EventCallback<TRoomEvent extends Json> = ({
  connectionId,
  event,
}: {
  connectionId: number;
  event: TRoomEvent;
}) => void;

export type ErrorCallback = (error: Error) => void;

export type ConnectionCallback = (state: ConnectionState) => void;

export type HistoryCallback = (event: HistoryEvent) => void;

type RoomEventCallbackMap<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  "my-presence": MyPresenceCallback<TPresence>;
  others: OthersEventCallback<TPresence, TUserMeta>;
  event: EventCallback<TRoomEvent>;
  error: ErrorCallback;
  connection: ConnectionCallback;
  history: HistoryCallback;
};

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

export type UpdateDelta =
  | {
      type: "update";
    }
  | {
      type: "delete";
    };

/**
 * A LiveMap notification that is sent in-client to any subscribers whenever
 * one or more of the values inside the LiveMap instance have changed.
 */
export type LiveMapUpdates<TKey extends string, TValue extends Lson> = {
  type: "LiveMap";
  node: LiveMap<TKey, TValue>;
  updates: { [key: string]: UpdateDelta };
  //               ^^^^^^
  //               FIXME: `string` is not specific enough here. See if we can
  //               improve this type to match TKey!
};

export type LiveObjectUpdateDelta<O extends { [key: string]: unknown }> = {
  [K in keyof O]?: UpdateDelta | undefined;
};

/**
 * A LiveObject notification that is sent in-client to any subscribers whenever
 * one or more of the entries inside the LiveObject instance have changed.
 */
export type LiveObjectUpdates<TData extends LsonObject> = {
  type: "LiveObject";
  node: LiveObject<TData>;
  updates: LiveObjectUpdateDelta<TData>;
};

export type LiveListUpdateDelta =
  | {
      index: number;
      item: Lson;
      type: "insert";
    }
  | {
      index: number;
      type: "delete";
    }
  | {
      index: number;
      previousIndex: number;
      item: Lson;
      type: "move";
    }
  | {
      index: number;
      item: Lson;
      type: "set";
    };

/**
 * A LiveList notification that is sent in-client to any subscribers whenever
 * one or more of the items inside the LiveList instance have changed.
 */
export type LiveListUpdates<TItem extends Lson> = {
  type: "LiveList";
  node: LiveList<TItem>;
  updates: LiveListUpdateDelta[];
};

export type BroadcastOptions = {
  /**
   * Whether or not event is queued if the connection is currently closed.
   *
   * ❗ We are not sure if we want to support this option in the future so it might be deprecated to be replaced by something else
   */
  shouldQueueEventIfNotReady: boolean;
};

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 */
export type StorageUpdate =
  | LiveMapUpdates<string, Lson>
  | LiveObjectUpdates<LsonObject>
  | LiveListUpdates<Lson>;

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type RoomInitializers<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = Resolve<{
  /**
   * The initial Presence to use and announce when you enter the Room. The
   * Presence is available on all users in the Room (me & others).
   */
  initialPresence?: TPresence | ((roomId: string) => TPresence);
  /**
   * The initial Storage to use when entering a new Room.
   */
  initialStorage?: TStorage | ((roomId: string) => TStorage);
  /**
   * @deprecated Please use `initialPresence` instead. This property is
   * scheduled for removal in 0.18.
   */
  defaultPresence?: () => TPresence;
  /**
   * @deprecated Please use `initialStorage` instead. This property is
   * scheduled for removal in 0.18.
   */
  defaultStorageRoot?: TStorage;
}>;

export type Client = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId The id of the room
   */
  getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(
    roomId: string
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;

  /**
   * Enters a room and returns it.
   * @param roomId The id of the room
   * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
   */
  enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(
    roomId: string,
    options?: RoomInitializers<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Leaves a room.
   * @param roomId The id of the room
   */
  leave(roomId: string): void;
};

/**
 * Represents all the other users connected in the room. Treated as immutable.
 */
export interface Others<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> {
  /**
   * Number of other users in the room.
   */
  readonly count: number;
  /**
   * Returns a new Iterator object that contains the users.
   */
  [Symbol.iterator](): IterableIterator<User<TPresence, TUserMeta>>;
  /**
   * Returns the array of connected users in room.
   */
  toArray(): User<TPresence, TUserMeta>[];
  /**
   * This function let you map over the connected users in the room.
   */
  map<U>(callback: (user: User<TPresence, TUserMeta>) => U): U[];
}

/**
 * Represents a user connected in a room. Treated as immutable.
 */
export type User<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = {
  /**
   * The connection id of the user. It is unique and increment at every new connection.
   */
  readonly connectionId: number;
  /**
   * The id of the user that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  readonly id: TUserMeta["id"];
  /**
   * Additional user information that has been set in the authentication endpoint.
   */
  readonly info: TUserMeta["info"];
  /**
   * The user presence.
   */
  readonly presence?: TPresence;
  /** @internal */
  _hasReceivedInitialPresence?: boolean;
};

/**
 * @deprecated Whatever you want to store as presence is app-specific. Please
 * define your own Presence type instead of importing it from
 * `@liveblocks/client`, for example:
 *
 *    type Presence = {
 *      name: string,
 *      cursor: {
 *        x: number,
 *        y: number,
 *      } | null,
 *    }
 *
 * As long as it only contains JSON-serializable values, you're good!
 */
export type Presence = JsonObject;

type AuthEndpointCallback = (room: string) => Promise<{ token: string }>;

export type AuthEndpoint = string | AuthEndpointCallback;

export type Polyfills = {
  atob?: (data: string) => string;
  fetch?: typeof fetch;
  WebSocket?: any;
};

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions = {
  throttle?: number;
  polyfills?: Polyfills;

  /**
   * Backward-compatible way to set `polyfills.fetch`.
   */
  fetchPolyfill?: Polyfills["fetch"];

  /**
   * Backward-compatible way to set `polyfills.WebSocket`.
   */
  WebSocketPolyfill?: Polyfills["WebSocket"];
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);

export type AuthorizeResponse = {
  token: string;
};

export type Authentication =
  | {
      type: "public";
      publicApiKey: string;
      url: string;
    }
  | {
      type: "private";
      url: string;
    }
  | {
      type: "custom";
      callback: (room: string) => Promise<AuthorizeResponse>;
    };

export type Connection =
  | {
      state: "closed" | "authenticating" | "unavailable" | "failed";
    }
  | {
      state: "open" | "connecting";
      id: number;
      userId?: string;
      userInfo?: Json;
    };

export type ConnectionState = Connection["state"];

export type OthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> =
  | {
      type: "leave";
      user: User<TPresence, TUserMeta>;
    }
  | {
      type: "enter";
      user: User<TPresence, TUserMeta>;
    }
  | {
      type: "update";
      user: User<TPresence, TUserMeta>;
      updates: Partial<TPresence>;
    }
  | {
      type: "reset";
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
  getConnectionState(): ConnectionState;
  subscribe: {
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
    (type: "my-presence", listener: MyPresenceCallback<TPresence>): () => void;

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
     */
    (
      type: "others",
      listener: OthersEventCallback<TPresence, TUserMeta>
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
     */
    (type: "event", listener: EventCallback<TRoomEvent>): () => void;

    /**
     * Subscribe to errors thrown in the room.
     *
     * @returns Unsubscribe function.
     */
    (type: "error", listener: ErrorCallback): () => void;

    /**
     * Subscribe to connection state updates.
     *
     * @returns Unsubscribe function.
     */
    (type: "connection", listener: ConnectionCallback): () => void;

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
     */
    (type: "history", listener: HistoryCallback): () => void;
  };

  /**
   * Room's history contains functions that let you undo and redo operation made on by the current client on the presence and storage.
   */
  history: History;

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
  getPresence: () => TPresence;

  /**
   * Gets all the other users in the room.
   *
   * @example
   * const others = room.getOthers();
   */
  getOthers: () => Others<TPresence, TUserMeta>;

  /**
   * Updates the presence of the current user. Only pass the properties you want to update. No need to send the full presence.
   * @param overrides A partial object that contains the properties you want to update.
   * @param overrides Optional object to configure the behavior of updatePresence.
   *
   * @example
   * room.updatePresence({ x: 0 });
   * room.updatePresence({ y: 0 });
   *
   * const presence = room.getPresence();
   * // presence is equivalent to { x: 0, y: 0 }
   */
  updatePresence: (
    overrides: Partial<TPresence>,
    options?: {
      /**
       * Whether or not the presence should have an impact on the undo/redo history.
       */
      addToHistory: boolean;
    }
  ) => void;

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
  broadcastEvent: (event: TRoomEvent, options?: BroadcastOptions) => void;

  /**
   * Get the room's storage asynchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const { root } = await room.getStorage();
   */
  getStorage: () => Promise<{
    root: LiveObject<TStorage>;
  }>;

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
  batch: (fn: () => void) => void;

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

export enum WebsocketCloseCodes {
  CLOSE_ABNORMAL = 1006,

  INVALID_MESSAGE_FORMAT = 4000,
  NOT_ALLOWED = 4001,
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,
  CLOSE_WITHOUT_RETRY = 4999,
}

export type { BaseUserMeta } from "./BaseUserMeta";
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  FetchStorageClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
} from "./ClientMsg";
export { ClientMsgCode } from "./ClientMsg";
export type { Json, JsonObject } from "./Json";
export type { LiveNode, LiveStructure, Lson, LsonObject, ToJson } from "./Lson";
export type { NodeMap, ParentToChildNodeMap } from "./NodeMap";
export type {
  CreateChildOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  CreateRootObjectOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  Op,
  SetParentKeyOp,
  UpdateObjectOp,
} from "./Op";
export { OpCode } from "./Op";
export type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "./SerializedCrdt";
export { CrdtType } from "./SerializedCrdt";
export type {
  BroadcastedEventServerMsg,
  InitialDocumentStateServerMsg,
  RoomStateServerMsg,
  ServerMsg,
  UpdatePresenceServerMsg,
  UpdateStorageServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
} from "./ServerMsg";
export { ServerMsgCode } from "./ServerMsg";
