import type { Callback, Observable } from "../lib/EventSource";
import type { LiveObject } from "../LiveObject";
import type { BaseUserMeta } from "./BaseUserMeta";
import type { Json, JsonObject } from "./Json";
import type { LiveStructure, LsonObject } from "./Lson";
import type { Others, OthersEvent } from "./Others";
import type { StorageCallback, StorageUpdate } from "./StorageUpdates";
import type { User } from "./User";

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
