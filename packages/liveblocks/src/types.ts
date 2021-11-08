import { AbstractCrdt } from "./AbstractCrdt";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";

export type MyPresenceCallback<T extends Presence = Presence> = (me: T) => void;
export type OthersEventCallback<T extends Presence = Presence> = (
  others: Others<T>,
  event: OthersEvent<T>
) => void;
export type EventCallback = ({
  connectionId,
  event,
}: {
  connectionId: number;
  event: any;
}) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectionCallback = (state: ConnectionState) => void;

export type RoomEventCallbackMap = {
  "my-presence": MyPresenceCallback;
  others: OthersEventCallback;
  event: EventCallback;
  error: ErrorCallback;
  connection: ConnectionCallback;
};

export type LiveMapUpdates<TKey extends string = string, TValue = any> = {
  type: "LiveMap";
  node: LiveMap<TKey, TValue>;
};

export type LiveObjectUpdates<TData = any> = {
  type: "LiveObject";
  node: LiveObject<TData>;
};

export type LiveListUpdates<TItem = any> = {
  type: "LiveList";
  node: LiveList<TItem>;
};

export type StorageUpdate =
  | LiveMapUpdates
  | LiveObjectUpdates
  | LiveListUpdates;

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type Client = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId The id of the room
   */
  getRoom(roomId: string): Room | null;

  /**
   * Enters a room and returns it.
   * @param roomId The id of the room
   * @param defaultPresence Optional. Should be serializable to JSON. If omitted, an empty object will be used.
   */
  enter<TStorageRoot extends Record<string, any> = Record<string, any>>(
    roomId: string,
    options?: {
      defaultPresence?: Presence;
      defaultStorageRoot?: TStorageRoot;
    }
  ): Room;

  /**
   * Leaves a room.
   * @param roomId The id of the room
   */
  leave(roomId: string): void;
};

export type AuthenticationToken = {
  actor: number;
  id?: string;
  info?: any;
};

/**
 * Represents all the other users connected in the room. Treated as immutable.
 */
export interface Others<TPresence extends Presence = Presence> {
  /**
   * Number of other users in the room.
   */
  readonly count: number;
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
export type User<TPresence extends Presence = Presence> = {
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
};

export type Presence = {
  [key: string]: any;
};

type AuthEndpointCallback = (room: string) => Promise<{ token: string }>;

export type AuthEndpoint = string | AuthEndpointCallback;

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions = {
  throttle?: number;
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);

export type AuthorizeResponse = {
  token: string;
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

export type OthersEvent<T extends Presence = Presence> =
  | {
      type: "leave";
      user: User<T>;
    }
  | {
      type: "enter";
      user: User<T>;
    }
  | {
      type: "update";
      user: User<T>;
      updates: Partial<T>;
    }
  | {
      type: "reset";
    };

export type Room = {
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
    <T extends Presence>(
      type: "my-presence",
      listener: MyPresenceCallback<T>
    ): () => void;
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
    <T extends Presence>(
      type: "others",
      listener: OthersEventCallback<T>
    ): () => void;
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
    <TKey extends string, TValue>(
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
    <TData>(
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
    <TItem>(
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
    <TKey extends string, TValue>(
      liveMap: LiveMap<TKey, TValue>,
      callback: (updates: StorageUpdate[]) => void,
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
    <TData>(
      liveObject: LiveObject<TData>,
      callback: (updates: StorageUpdate[]) => void,
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
    <TItem>(
      liveList: LiveList<TItem>,
      callback: (updates: StorageUpdate[]) => void,
      options: { isDeep: true }
    ): () => void;
  };

  /**
   * Gets the current user.
   * Returns null if not it is not yet connected to the room.
   *
   * @example
   * const user = room.getSelf();
   */
  getSelf<TPresence extends Presence = Presence>(): User<TPresence> | null;

  /**
   * Gets the presence of the current user.
   *
   * @example
   * const presence = room.getPresence();
   */
  getPresence: <T extends Presence>() => T;

  /**
   * Gets all the other users in the room.
   *
   * @example
   * const others = room.getOthers();
   */
  getOthers: <T extends Presence>() => Others<T>;

  /**
   * Updates the presence of the current user. Only pass the properties you want to update. No need to send the full presence.
   * @param {Partial<T>} overrides A partial object that contains the properties you want to update.
   *
   * @example
   * room.updatePresence({ x: 0 });
   * room.updatePresence({ y: 0 });
   *
   * const presence = room.getPresence();
   * // presence is equivalent to { x: 0, y: 0 }
   */
  updatePresence: <T extends Presence>(overrides: Partial<T>) => void;

  /**
   * Broadcast an event to other users in the room. Event broadcasted to the room can be listened with {@link Room.subscribe}("event").
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
  broadcastEvent: (event: any) => void;

  getStorage: <TRoot>() => Promise<{
    root: LiveObject<TRoot>;
  }>;

  undo: () => void;
  redo: () => void;
};
