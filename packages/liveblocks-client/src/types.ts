import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";
import { Json, JsonObject } from "./json";
import { Lson, LsonObject } from "./lson";

export type MyPresenceCallback<TPresence extends JsonObject = JsonObject> = (
  me: TPresence
) => void;

export type OthersEventCallback<TPresence extends JsonObject = JsonObject> = (
  others: Others<TPresence>,
  event: OthersEvent<TPresence>
) => void;

export type EventCallback = ({
  connectionId,
  event,
}: {
  connectionId: number;
  event: Json;
}) => void;

export type ErrorCallback = (error: Error) => void;

export type ConnectionCallback = (state: ConnectionState) => void;

export type RoomEventCallbackMap<TPresence extends JsonObject> = {
  "my-presence": MyPresenceCallback<TPresence>;
  others: OthersEventCallback<TPresence>;
  event: EventCallback;
  error: ErrorCallback;
  connection: ConnectionCallback;
};

export type RoomEventName = keyof RoomEventCallbackMap<JsonObject>;

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
      item: any; // Serializable Or LiveStructure
      type: "insert";
    }
  | {
      index: number;
      type: "delete";
    }
  | {
      index: number;
      previousIndex: number;
      item: any; // Serializable Or LiveStructure
      type: "move";
    }
  | {
      index: number;
      item: any; // Serializable Or LiveStructure
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

export type Client<
  TPresence extends JsonObject,
  TStorageRoot extends LsonObject
> = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId The id of the room
   */
  getRoom(roomId: string): Room<TPresence, TStorageRoot> | null;

  /**
   * Enters a room and returns it.
   * @param roomId The id of the room
   * @param defaultPresence Optional. Should be serializable to JSON. If omitted, an empty object will be used.
   */
  enter(
    roomId: string,
    options?: {
      defaultPresence?: TPresence;
      defaultStorageRoot?: TStorageRoot;
    }
  ): Room<TPresence, TStorageRoot>;

  /**
   * Leaves a room.
   * @param roomId The id of the room
   */
  leave(roomId: string): void;
};

export type AuthenticationToken = {
  actor: number;
  id?: string;
  info?: Json;
};

/**
 * Represents all the other users connected in the room. Treated as immutable.
 */
export interface Others<TPresence extends JsonObject = JsonObject> {
  /**
   * Number of other users in the room.
   */
  readonly count: number;
  /**
   * Returns a new Iterator object that contains the users.
   */
  [Symbol.iterator](): IterableIterator<User<TPresence>>;
  /**
   * Returns the array of connected users in room.
   */
  toArray(): User<TPresence>[];
  /**
   * This function let you map over the connected users in the room.
   */
  map<U>(callback: (user: User<TPresence>) => U): U[];
}

/**
 * Represents a user connected in a room. Treated as immutable.
 */
export type User<TPresence extends JsonObject = JsonObject> = {
  /**
   * The connection id of the user. It is unique and increment at every new connection.
   */
  readonly connectionId: number;
  /**
   * The id of the user that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  readonly id?: string;
  /**
   * Additional user information that has been set in the authentication endpoint.
   */
  readonly info?: any;
  /**
   * The user presence.
   */
  readonly presence?: TPresence;

  /**
   * @internal
   */
  _hasReceivedInitialPresence?: boolean;
};

// FIXME: Restore to remain backward-compatible!!!!!!
// export type Presence = Record<string, unknown>;

type AuthEndpointCallback = (room: string) => Promise<{ token: string }>;

export type AuthEndpoint = string | AuthEndpointCallback;

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions = {
  throttle?: number;
  fetchPolyfill?: any;
  WebSocketPolyfill?: any;
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

type ConnectionState =
  | "closed"
  | "authenticating"
  | "unavailable"
  | "failed"
  | "open"
  | "connecting";

export type Connection =
  | {
      state: "closed" | "authenticating" | "unavailable" | "failed";
    }
  | {
      state: "open" | "connecting";
      id: number;
      userId?: string;
      userInfo?: any;
    };

export type OthersEvent<TPresence extends JsonObject = JsonObject> =
  | {
      type: "leave";
      user: User<TPresence>;
    }
  | {
      type: "enter";
      user: User<TPresence>;
    }
  | {
      type: "update";
      user: User<TPresence>;
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
   * room.updatePresence({ selectedId: "xxx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yyy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xxx" }
   */
  undo: () => void;

  /**
   * Redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   *
   * @example
   * room.updatePresence({ selectedId: "xxx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yyy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xxx" }
   * room.history.redo();
   * // room.getPresence() equals { selectedId: "yyy" }
   */
  redo: () => void;

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

export type Room<
  TPresence extends JsonObject,
  TStorageRoot extends LsonObject
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
     * @example
     * room.subscribe("others", (others) => {
     *   // Do something
     * });
     */
    (type: "others", listener: OthersEventCallback<TPresence>): () => void;
    /**
     * Subscribe to events broadcasted by {@link Room.broadcastEvent}
     *
     * @param listener the callback that is called when a user calls {@link Room.broadcastEvent}
     *
     * @example
     * room.subscribe("event", ({ event, connectionId }) => {
     *   // Do something
     * });
     */
    (type: "event", listener: EventCallback): () => void;
    /**
     * Subscribe to errors thrown in the room.
     */
    (type: "error", listener: ErrorCallback): () => void;
    /**
     * Subscribe to connection state updates.
     */
    (type: "connection", listener: ConnectionCallback): () => void;
    /**
     * Subscribes to changes made on a {@link LiveMap}. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveMap}.
     *
     * @param listener the callback this called when the {@link LiveMap} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveMap = new LiveMap();
     * const unsubscribe = room.subscribe(liveMap, (liveMap) => { });
     * unsubscribe();
     */
    <TKey extends string, TValue extends Lson>(
      liveMap: LiveMap<TKey, TValue>,
      listener: (liveMap: LiveMap<TKey, TValue>) => void
    ): () => void;
    /**
     * Subscribes to changes made on a {@link LiveObject}. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveObject}.
     *
     * @param listener the callback this called when the {@link LiveObject} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveObject = new LiveObject();
     * const unsubscribe = room.subscribe(liveObject, (liveObject) => { });
     * unsubscribe();
     */
    <TData extends JsonObject>(
      liveObject: LiveObject<TData>,
      callback: (liveObject: LiveObject<TData>) => void
    ): () => void;
    /**
     * Subscribes to changes made on a {@link LiveList}. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveList}.
     *
     * @param listener the callback this called when the {@link LiveList} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveList = new LiveList();
     * const unsubscribe = room.subscribe(liveList, (liveList) => { });
     * unsubscribe();
     */
    <TItem extends Lson>(
      liveList: LiveList<TItem>,
      callback: (liveList: LiveList<TItem>) => void
    ): () => void;

    /**
     * Subscribes to changes made on a {@link LiveMap} and all the nested data structures. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveMap}.
     *
     * @param listener the callback this called when the {@link LiveMap} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveMap = new LiveMap();
     * const unsubscribe = room.subscribe(liveMap, (liveMap) => { }, { isDeep: true });
     * unsubscribe();
     */
    <TKey extends string, TValue extends Lson>(
      liveMap: LiveMap<TKey, TValue>,
      callback: (updates: LiveMapUpdates<TKey, TValue>[]) => void,
      options: { isDeep: true }
    ): () => void;

    /**
     * Subscribes to changes made on a {@link LiveObject} and all the nested data structures. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveObject}.
     *
     * @param listener the callback this called when the {@link LiveObject} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveObject = new LiveObject();
     * const unsubscribe = room.subscribe(liveObject, (liveObject) => { }, { isDeep: true });
     * unsubscribe();
     */
    <TData extends LsonObject>(
      liveObject: LiveObject<TData>,
      callback: (updates: LiveObjectUpdates<TData>[]) => void,
      options: { isDeep: true }
    ): () => void;

    /**
     * Subscribes to changes made on a {@link LiveList} and all the nested data structures. Returns an unsubscribe function.
     * In a future version, we will also expose what exactly changed in the {@link LiveList}.
     *
     * @param listener the callback this called when the {@link LiveList} changes.
     *
     * @returns Unsubscribe function.
     *
     * @example
     * const liveList = new LiveList();
     * const unsubscribe = room.subscribe(liveList, (liveList) => { }, { isDeep: true });
     * unsubscribe();
     */
    <TItem extends Lson>(
      liveList: LiveList<TItem>,
      callback: (updates: LiveListUpdates<TItem>[]) => void,
      options: { isDeep: true }
    ): () => void;
  };

  /**
   * Room's history contains functions that let you undo and redo operation made on by the current client on the presence and storage.
   */
  history: History;

  /**
   * @deprecated use the callback returned by subscribe instead.
   * See v0.13 release notes for more information.
   * Will be removed in a future version.
   */
  unsubscribe: {
    /**
     * @deprecated use the callback returned by subscribe instead.
     * See v0.13 release notes for more information.
     * Will be removed in a future version.
     */
    (type: "my-presence", listener: MyPresenceCallback<TPresence>): void;
    /**
     * @deprecated use the callback returned by subscribe instead.
     * See v0.13 release notes for more information.
     * Will be removed in a future version.
     */
    (type: "others", listener: OthersEventCallback<TPresence>): void;
    /**
     * @deprecated use the callback returned by subscribe instead.
     * See v0.13 release notes for more information.
     * Will be removed in a future version.
     */
    (type: "event", listener: EventCallback): void;
    /**
     * @deprecated use the callback returned by subscribe instead.
     * See v0.13 release notes for more information.
     * Will be removed in a future version.
     */
    (type: "error", listener: ErrorCallback): void;
    /**
     * @deprecated use the callback returned by subscribe instead.
     * See v0.13 release notes for more information.
     * Will be removed in a future version.
     */
    (type: "connection", listener: ConnectionCallback): void;
  };

  /**
   * Gets the current user.
   * Returns null if not it is not yet connected to the room.
   *
   * @example
   * const user = room.getSelf();
   */
  getSelf(): User<TPresence> | null;

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
  getOthers: () => Others<TPresence>;

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
  broadcastEvent: (event: JsonObject, options?: BroadcastOptions) => void;

  /**
   * Get the room's storage asynchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const { root } = await room.getStorage();
   */
  getStorage: () => Promise<{
    root: LiveObject<TStorageRoot>;
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
};
