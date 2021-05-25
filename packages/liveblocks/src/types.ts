import { RecordData, Record, List } from "./doc";

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

type AuthEndpointCallback = (room: string) => Promise<string>;

export type AuthEndpoint = string | AuthEndpointCallback;

export type ClientOptions = {
  /**
   * The authentication endpoint that is called to ensure that the current user has access to a room.
   * Can be an url or a callback if you need to attach additional headers.
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

export type Connection =
  | {
      state: "closed" | "authenticating" | "unavailable" | "failed";
    }
  | {
      state: "open" | "connecting";
      id: number;
    };

export type Room = {
  connect(): void;
  disconnect(): void;
  getConnectionState(): Connection;
  subscribe: {
    <T extends Presence>(
      type: "my-presence",
      listener: MyPresenceCallback<T>
    ): void;
    <T extends Presence>(
      type: "others",
      listener: OthersEventCallback<T>
    ): void;
    (type: "event", listener: EventCallback): void;
    <T extends RecordData>(type: "storage", listener: StorageCallback<T>): void;
    (type: "error", listener: (error: Error) => void): void;
  };
  unsubscribe: {
    <T extends Presence>(
      type: "my-presence",
      listener: MyPresenceCallback<T>
    ): void;
    <T extends Presence>(
      type: "others",
      listener: OthersEventCallback<T>
    ): void;
    (type: "event", listener: EventCallback): void;
    <T extends RecordData>(type: "storage", listener: StorageCallback<T>): void;
    (type: "error", listener: (error: Error) => void): void;
  };

  getPresence: <T extends Presence>() => T;
  getOthers: <T extends Presence>() => Others<T>;
  updatePresence: <T extends Presence>(overrides: Partial<T>) => void;
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
  moveItem<T extends RecordData>(
    list: List<Record<T>>,
    index: number,
    targetIndex: number
  ): void;
};

export type StorageCallback<T extends RecordData = RecordData> = (
  storage: LiveStorage<T>
) => void;
export type MyPresenceCallback<T extends Presence = Presence> = (me: T) => void;
export type OthersEventCallback<T extends Presence = Presence> = (
  others: Others<T>
) => void;
export type EventCallback = ({
  connectionId,
  event,
}: {
  connectionId: number;
  event: any;
}) => void;
export type ErrorCallback = (error: Error) => void;

export type RoomEventCallbackMap = {
  storage: StorageCallback;
  "my-presence": MyPresenceCallback;
  others: OthersEventCallback;
  event: EventCallback;
  error: ErrorCallback;
};

export type CreateRecord = Room["createRecord"];
export type CreateList = Room["createList"];

export type InitialStorageFactory<TRoot = RecordData> = (factories: {
  createRecord: CreateRecord;
  createList: CreateList;
}) => TRoot;

export type Client = {
  getRoom(roomId: string): Room | null;
  enter(roomId: string, defaultPresence?: Presence): Room;
  leave(roomId: string): void;
};
