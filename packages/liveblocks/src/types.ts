import { RecordData, Record, List } from "./doc";

export type StorageCallback<T extends RecordData = RecordData> = (
  storage: LiveStorage<T>
) => void;
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
  storage: StorageCallback;
  "my-presence": MyPresenceCallback;
  others: OthersEventCallback;
  event: EventCallback;
  error: ErrorCallback;
  connection: ConnectionCallback;
};

export type CreateRecord = Room["createRecord"];
export type CreateList = Room["createList"];

export type InitialStorageFactory<TRoot = RecordData> = (factories: {
  createRecord: CreateRecord;
  createList: CreateList;
}) => TRoot;

export type Client = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId - The id of the room
   */
  getRoom(roomId: string): Room | null;

  /**
   * Enters a room and returns it.
   * @param roomId - The id of the room
   * @param defaultPresence - Optional. Should be serializable to JSON. If omitted, an empty object will be used.
   */
  enter(roomId: string, defaultPresence?: Presence): Room;

  /**
   * Leaves a room.
   * @param roomId - The id of the room
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

export type Presence = Serializable;
export type SerializablePrimitive = boolean | string | number | null;
export type Serializable = {
  [key: string]: SerializablePrimitive | Serializable | SerializablePrimitive[];
};

type AuthEndpointCallback = (room: string) => Promise<{ token: string }>;

export type AuthEndpoint = string | AuthEndpointCallback;

export type ClientOptions = {
  /**
   * The authentication endpoint that is called to ensure that the current user has access to a room.
   * Can be an url or a callback if you need to add additional headers.
   */
  authEndpoint: AuthEndpoint;
  throttle?: number;
};

export type AuthorizeResponse = {
  token: string;
};

export enum LiveStorageState {
  NotInitialized = 0,
  Loading = 1,
  Loaded = 2,
}

export type LiveStorage<T extends RecordData = RecordData> =
  | {
      state: LiveStorageState.Loading | LiveStorageState.NotInitialized;
    }
  | {
      state: LiveStorageState.Loaded;
      root: Record<T>;
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
     * @param listener - the callback that is called everytime the current user presence is updated with {@link Room.updatePresence}.
     *
     * ### Example
     * ``` typescript
     * room.subscribe("my-presence", (presence) => {
     *   // Do something
     * });
     * ```
     */
    <T extends Presence>(
      type: "my-presence",
      listener: MyPresenceCallback<T>
    ): void;
    /**
     * Subscribe to the other users updates.
     *
     * @param listener - the callback that is called when a user enters or leaves the room or when a user update its presence.
     *
     * ### Example
     * ``` typescript
     * room.subscribe("others", (others) => {
     *   // Do something
     * });
     * ```
     */
    <T extends Presence>(
      type: "others",
      listener: OthersEventCallback<T>
    ): void;
    /**
     * Subscribe to events broadcasted by {@link Room.broadcastEvent}
     *
     * @param listener - the callback that is called when a user calls {@link Room.broadcastEvent}
     *
     * ### Example
     * ``` typescript
     * room.subscribe("event", ({ event, connectionId }) => {
     *   // Do something
     * });
     * ```
     */
    (type: "event", listener: EventCallback): void;
    <T extends RecordData>(type: "storage", listener: StorageCallback<T>): void;
    /**
     * Subscribe to errors thrown in the room.
     */
    (type: "error", listener: ErrorCallback): void;
    /**
     * Subscribe to connection state updates.
     */
    (type: "connection", listener: ConnectionCallback): void;
  };
  unsubscribe: {
    /**
     * Unsubscribe to the current user presence updates.
     *
     * @param listener - the callback that has been used with {@link Room.subscribe}("my-presence").
     *
     * ### Example
     * ``` typescript
     * const onPresenceChange = (presence) => { };
     * room.subscribe("my-presence", onPresenceChange);
     * room.unsubscribe("my-presence", onPresenceChange);
     * ```
     */
    <T extends Presence>(
      type: "my-presence",
      listener: MyPresenceCallback<T>
    ): void;
    /**
     * Unsubscribe to the other users updates.
     *
     * @param listener - the callback that has been used with {@link Room.subscribe}("others").
     *
     * ### Example
     * ``` typescript
     * const onOthersChange = (presence) => { };
     * room.subscribe("others", onOthersChange);
     * room.unsubscribe("others", onOthersChange);
     * ```
     */
    <T extends Presence>(
      type: "others",
      listener: OthersEventCallback<T>
    ): void;
    /**
     * Unsubscribe to events broadcasted by {@link Room.broadcastEvent}
     *
     * @param listener - the callback that has been used with {@link Room.unsubscribe}("event").
     *
     * ### Example
     * ``` typescript
     * const onEvent = ({ event, connectionId }) => { };
     * room.subscribe("event", onEvent);
     * room.unsubscribe("event", onEvent);
     * ```
     */
    (type: "event", listener: EventCallback): void;
    <T extends RecordData>(type: "storage", listener: StorageCallback<T>): void;
    /**
     * Unsubscribe to errors thrown in the room.
     */
    (type: "error", listener: ErrorCallback): void;
    /**
     * Unsubscribe to connection state updates.
     */
    (type: "connection", listener: ConnectionCallback): void;
  };

  /**
   * Gets the current user.
   *
   * ### Example
   * ``` typescript
   * const user = room.getCurrentUser();
   * ```
   */
  getCurrentUser<
    TPresence extends Presence = Presence
  >(): User<TPresence> | null;

  /**
   * Gets the presence of the current user.
   *
   * ### Example
   * ``` typescript
   * const presence = room.getPresence();
   * ```
   */
  getPresence: <T extends Presence>() => T;

  /**
   * Gets all the other users in the room.
   *
   * ### Example
   * ``` typescript
   * const others = room.getOthers();
   * ```
   */
  getOthers: <T extends Presence>() => Others<T>;

  /**
   * Updates the presence of the current user. Only pass the properties you want to update. No need to send the full presence.
   * @param {Partial<T>} overrides A partial object that contains the properties you want to update.
   *
   * ### Example
   * ``` typescript
   * room.updatePresence({ x: 0 });
   * room.updatePresence({ y: 0 });
   *
   * const presence = room.getPresence();
   * // presence is equivalent to { x: 0, y: 0 }
   * ```
   */
  updatePresence: <T extends Presence>(overrides: Partial<T>) => void;

  /**
   * Broadcast an event to other users in the room. Event broadcasted to the room can be listened with {@link Room.subscribe}("event").
   * @param {any} event the event to broadcast. Should be serializable to JSON
   *
   * ### Example
   * ``` typescript
   *
   * // On client A
   * room.broadcastEvent({ type: "EMOJI", emoji: "🔥" });
   *
   * // On client B
   * room.subscribe("event", ({ event }) => {
   *   if(event.type === "EMOJI") {
   *     // Do something
   *   }
   * });
   * ```
   */
  broadcastEvent: (event: any) => void;

  getStorage: () => LiveStorage;
  fetchStorage(initialStorageFactory: InitialStorageFactory): void;
  createRecord: <T extends RecordData>(data: T) => Record<T>;
  createList: <T extends RecordData>() => List<Record<T>>;
  updateRecord<T extends RecordData>(
    record: Record<T>,
    overrides: Partial<T>
  ): void;
  pushItem<T extends RecordData>(list: List<Record<T>>, item: Record<T>): void;
  deleteItem<T extends RecordData>(list: List<Record<T>>, index: number): void;
  deleteItemById<T extends RecordData>(
    list: List<Record<T>>,
    itemId: string
  ): void;
  moveItem<T extends RecordData>(
    list: List<Record<T>>,
    index: number,
    targetIndex: number
  ): void;
};
