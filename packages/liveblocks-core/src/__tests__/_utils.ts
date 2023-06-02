import type { LiveObject } from "..";
import type { Delegates } from "../connection";
import type { LsonObject } from "../crdts/Lson";
import type { ToImmutable } from "../crdts/utils";
import type { EventSource, Observable } from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";
import { withTimeout } from "../lib/fsm";
import type { Json, JsonObject } from "../lib/Json";
import { makePosition } from "../lib/position";
import type { Authentication } from "../protocol/Authentication";
import type { RichToken, RoomAuthToken } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { ClientMsg } from "../protocol/ClientMsg";
import { ClientMsgCode } from "../protocol/ClientMsg";
import type { Op } from "../protocol/Op";
import type {
  IdTuple,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import type { ServerMsg } from "../protocol/ServerMsg";
import { ServerMsgCode } from "../protocol/ServerMsg";
import type { Room } from "../room";
import { createRoom } from "../room";
import type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketMessageEvent,
} from "../types/IWebSocket";
import { WebsocketCloseCodes } from "../types/IWebSocket";
import {
  ALWAYS_AUTH_AS,
  AUTO_OPEN_SOCKETS,
  defineBehavior,
} from "./_behaviors";
import type { JsonStorageUpdate } from "./_updatesUtils";
import { serializeUpdateToJson } from "./_updatesUtils";

export function makeRoomToken(actor: number, scopes: string[]): RoomAuthToken {
  return {
    appId: "my-app",
    roomId: "my-room",
    id: "user1",
    actor,
    scopes,
  };
}

/**
 * Deep-clones a JSON-serializable value.
 *
 * NOTE: We should be able to replace `deepClone` by `structuredClone` once
 * we've upgraded to Node 18.
 */
function deepClone<T extends Json>(items: T): T {
  // NOTE: In this case, the combination of JSON.parse() and JSON.stringify
  // won't lead to type unsafety, so this use case is okay.
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(JSON.stringify(items)) as T;
}

// NOTE: we have some instability with opIds in the undo/redo stack and this should be investigated
function deepCloneWithoutOpId<T>(item: T) {
  return JSON.parse(
    JSON.stringify(item),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (key, value) => (key === "opId" ? undefined : value)
  ) as T;
}

type Listener = (ev: IWebSocketEvent) => void;
type CloseListener = (ev: IWebSocketCloseEvent) => void;
type MessageListener = (ev: IWebSocketMessageEvent) => void;

type ServerEvents = {
  onOpen: Observable<IWebSocketEvent>;
  onClose: Observable<IWebSocketCloseEvent>;
  onMessage: Observable<IWebSocketMessageEvent>;
  onError: Observable<IWebSocketEvent>;
};

type Emitters = {
  onOpen: EventSource<IWebSocketEvent>;
  onClose: EventSource<IWebSocketCloseEvent>;
  onMessage: EventSource<IWebSocketMessageEvent>;
  onError: EventSource<IWebSocketEvent>;
};

/**
 * The server side socket of the two-sided connection. It's the opposite end of
 * the client side socket (aka the MockWebSocket instance).
 */
type ServerSocket = {
  /** Inspect the messages the server end has received as the result of the client side sending it messages. */
  receivedMessagesRaw: readonly string[];
  receive(message: string): void;
  /** Accept the socket from the server side. The client will receive an "open" event. */
  accept(): void;
  /** Close the socket from the server side. */
  close(event: IWebSocketCloseEvent): void;
  /** Send a message from the server side to the client side. */
  send(event: IWebSocketMessageEvent): void;
  /** Send an error event from the server side to the client side. */
  error(event: IWebSocketEvent): void;
};

type Connection = {
  client: MockWebSocket;
  server: ServerSocket;
};

export class MockWebSocketServer {
  private newConnectionCallbacks = makeEventSource<Connection>();
  public current: MockWebSocket | undefined;
  public connections: Map<MockWebSocket, Emitters> = new Map();

  public onReceive = makeEventSource<string>();
  public receivedMessagesRaw: string[] = [];

  /**
   * The server socket of the last connection that has been established to the
   * server.
   */
  get last(): ServerSocket {
    if (this.current === undefined) {
      throw new Error("No socket instantiated yet");
    }
    return this.current.server;
  }

  /**
   * In 99.9% of cases, the server messages are going to be JSON-serialized
   * values. If you need to look at the raw message (the 0.1% case), you can
   * use this.receivedMessagesRaw for that.
   */
  public get receivedMessages(): Json[] {
    return this.receivedMessagesRaw.map((raw) => {
      try {
        return JSON.parse(raw) as Json;
      } catch {
        return "<non-JSON value>";
      }
    });
  }

  getEmitters(socket: MockWebSocket): Emitters {
    const emitters = this.connections.get(socket);
    if (emitters === undefined) {
      throw new Error("Unknown socket");
    }
    return emitters;
  }

  accept(socket: MockWebSocket) {
    this.getEmitters(socket).onOpen.notify(new Event("open"));
  }

  close(socket: MockWebSocket, event: IWebSocketCloseEvent) {
    this.getEmitters(socket).onClose.notify(event);
  }

  message(socket: MockWebSocket, event: IWebSocketMessageEvent) {
    this.getEmitters(socket).onMessage.notify(event);
  }

  error(socket: MockWebSocket, event: IWebSocketEvent) {
    this.getEmitters(socket).onError.notify(event);
  }

  /**
   * Create a new socket connection instance this server.
   */
  public newSocket(initFn?: (socket: MockWebSocket) => void): MockWebSocket {
    const serverEvents = {
      onOpen: makeEventSource<IWebSocketEvent>(),
      onClose: makeEventSource<IWebSocketCloseEvent>(),
      onMessage: makeEventSource<IWebSocketMessageEvent>(),
      onError: makeEventSource<IWebSocketEvent>(),
    };

    const serverSocket: ServerSocket = {
      receivedMessagesRaw: this.receivedMessagesRaw,
      receive: (message: string) => {
        this.receivedMessagesRaw.push(message);
        this.onReceive.notify(message);
      },

      accept: () => serverEvents.onOpen.notify(new Event("open")),
      close: serverEvents.onClose.notify,
      send: serverEvents.onMessage.notify,
      error: serverEvents.onError.notify,
    };

    const clientSocket = new MockWebSocket();
    clientSocket.linkToServerSocket(serverSocket, serverEvents);
    this.connections.set(clientSocket, serverEvents);
    this.current = clientSocket;

    // Run the callback in the next tick. This is important, because we first
    // need to return the socket.
    setTimeout(() => {
      // Call the provided callback once, for this connection only.
      initFn?.(clientSocket);

      // ...then proceed to call the rest of the callbacks, which will be
      // executed on every new connection
      this.newConnectionCallbacks.notify({
        client: clientSocket,
        server: serverSocket,
      });
    }, 0);

    return clientSocket;
  }

  /**
   * Set a new behavior to execute when a new server connection is made.
   * Replaces an existing "onConnection" behavior if any exists. It won't stack
   * those behaviors.
   */
  public onConnection(callback: (conn: Connection) => void): void {
    this.newConnectionCallbacks.clear();
    this.newConnectionCallbacks.subscribe(callback);
  }

  /**
   * Pauses test execution until a message has been received.
   */
  public async waitUntilMessageReceived(): Promise<void> {
    await withTimeout(
      this.onReceive.waitUntil(),
      1000,
      "Server did not receive a message within 1s"
    );
  }
}

export class MockWebSocket {
  /**
   * Control/simulate server-side behavior for this socket connection only.
   * This is a convenience accessor if you're only interested in controlling
   * behavior for this particular client/server socket pair.
   */
  private _serverSocket: ServerSocket | undefined;

  private _listeners: ServerEvents | undefined;
  private unsubs: {
    open: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    close: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    message: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    error: WeakMap<Listener | MessageListener | CloseListener, () => void>;
  };

  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  readonly url: string;

  #readyState: number;

  /**
   * Don't call this constructor directly. Obtain a MockWebSocket instance by
   * instantiating a MockWebSocketServer, and calling .newSocket() on it. That
   * way, you can control and observe this socket's exact behavior by using the
   * server.
   */
  constructor(url: string = "ws://ignored") {
    this.unsubs = {
      open: new WeakMap(),
      close: new WeakMap(),
      message: new WeakMap(),
      error: new WeakMap(),
    };
    this.url = url;
    this.#readyState = this.CONNECTING;
  }

  public linkToServerSocket(
    serverSocket: ServerSocket,
    listeners: ServerEvents
  ) {
    this._serverSocket = serverSocket;
    this._listeners = listeners;

    // onOpen (from server)
    listeners.onOpen.subscribeOnce(() => {
      if (this.readyState > this.CONNECTING) {
        throw new Error(
          "Cannot open a WebSocket that has already advanced beyond the CONNECTING state"
        );
      }

      this.#readyState = this.OPEN;
    });

    // onClose (from server)
    listeners.onClose.subscribe(() => {
      this.#readyState = this.CLOSED;
    });

    // onSend (from server)
    listeners.onMessage.subscribe(() => {
      if (this.readyState < this.OPEN) {
        throw new Error("Socket hasn't been opened yet");
      }
    });
  }

  /**
   * Returns the server-side socket on the opposite end of the connection.
   */
  public get server(): ServerSocket {
    if (this._serverSocket === undefined) {
      throw new Error("No server attached yet");
    }
    return this._serverSocket;
  }

  private get listeners(): ServerEvents {
    if (this._listeners === undefined) {
      throw new Error("No server attached yet");
    }
    return this._listeners;
  }

  //
  // WEBSOCKET API
  //

  public get readyState(): number {
    return this.#readyState;
  }

  addEventListener(type: "message", listener: MessageListener): void; // prettier-ignore
  addEventListener(type: "close", listener: CloseListener): void; // prettier-ignore
  addEventListener(type: "open" | "error", listener: Listener): void; // prettier-ignore
  // prettier-ignore
  addEventListener(type: "open" | "close" | "message" | "error", listener: Listener | MessageListener | CloseListener): void {
    let unsub: (() => void) | undefined;
    if (type === "open") {
      unsub = this.listeners.onOpen.subscribe(listener as Listener);
    } else if (type === "close") {
      unsub = this.listeners.onClose.subscribe(listener as CloseListener);
    } else if (type === "message") {
      unsub = this.listeners.onMessage.subscribe(listener as MessageListener);
    } else if (type === "error") {
      unsub = this.listeners.onError.subscribe(listener as Listener);
    }

    if (unsub) {
      this.unsubs[type].set(listener, unsub);
    }
  }

  removeEventListener(type: "message", listener: MessageListener): void; // prettier-ignore
  removeEventListener(type: "close", listener: CloseListener): void; // prettier-ignore
  removeEventListener(type: "open" | "error", listener: Listener): void; // prettier-ignore
  // prettier-ignore
  removeEventListener(type: "open" | "close" | "message" | "error", listener: Listener | MessageListener | CloseListener): void {
    const unsub = this.unsubs[type].get(listener);
    if (unsub !== undefined) {
      unsub();
    }
  }

  /**
   * Send a message from the client to the WebSocket server.
   */
  public send(message: string) {
    if (this.readyState === this.OPEN) {
      this.server.receive(message);
    }
  }

  /**
   * Close the socket from the client side.
   */
  public close(_code?: number, _reason?: string): void {
    this.#readyState = this.CLOSED;
  }
}

// ------------------------------------------------------------------------
// This little line will ensure that the MockWebSocket class is and remains
// assignable to IWebSocket in TypeScript (because "implementing it" is
// impossible).
((): IWebSocket => MockWebSocket)(); // Do not remove this check
// ------------------------------------------------------------------------

export const FIRST_POSITION = makePosition();
export const SECOND_POSITION = makePosition(FIRST_POSITION);
export const THIRD_POSITION = makePosition(SECOND_POSITION);
export const FOURTH_POSITION = makePosition(THIRD_POSITION);
export const FIFTH_POSITION = makePosition(FOURTH_POSITION);

function makeRoomConfig(mockedDelegates: Delegates<RichToken>) {
  return {
    delegates: mockedDelegates,
    roomId: "room-id",
    throttleDelay: -1, // No throttle for standard storage test
    liveblocksServer: "wss://live.liveblocks.io/v6",
    authentication: {
      type: "private",
      url: "/api/auth",
    } as Authentication,
    polyfills: {
      WebSocket: MockWebSocket,
    },
  };
}

/**
 * Sets up a Room instance that auto-connects to a server. It will receive the
 * given initial storage items from the server. It awaits until storage has
 * loaded.
 */
export async function prepareRoomWithStorage<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  onSend_DEPRECATED:
    | ((messages: ClientMsg<TPresence, TRoomEvent>[]) => void)
    | undefined = undefined,
  defaultStorage?: TStorage,
  scopes: string[] = []
) {
  if (onSend_DEPRECATED !== undefined) {
    throw new Error(
      "Can no longer use `onSend` effect, please rewrite unit test"
    );
  }

  const { wss, delegates } = defineBehavior(
    ALWAYS_AUTH_AS(actor, scopes),
    AUTO_OPEN_SOCKETS
  );

  const clonedItems = deepClone(items);
  wss.onConnection((conn) => {
    conn.server.send(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: clonedItems,
      })
    );
  });

  const room = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
    {
      initialPresence: {} as TPresence,
      initialStorage: defaultStorage || ({} as TStorage),
    },
    makeRoomConfig(delegates)
  );

  room.connect();

  const storage = await room.getStorage();
  return { storage, room, wss };
}

/**
 * Sets up a Room instance that auto-connects to a server. It will receive the
 * given initial storage items from the server. It awaits until storage has
 * loaded.
 *
 * The `expectStorage`, `expectMessagesSent`, and `applyRemoteOperations`
 * helpers can be used to make assertions easier to express.
 */
export async function prepareIsolatedStorageTest<TStorage extends LsonObject>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: TStorage
) {
  const { room, storage, wss } = await prepareRoomWithStorage<
    never,
    TStorage,
    never,
    never
  >(items, actor, undefined, defaultStorage || ({} as TStorage));

  return {
    root: storage.root,
    room,
    wss,

    expectStorage: (data: ToImmutable<TStorage>) =>
      expect(storage.root.toImmutable()).toEqual(data),

    expectMessagesSent: (
      messages: (ClientMsg<JsonObject, Json> | ClientMsg<JsonObject, Json>[])[]
    ) => {
      expect(wss.receivedMessages).toEqual(messages);
    },

    applyRemoteOperations: (ops: Op[]) =>
      wss.last.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_STORAGE,
          ops,
        })
      ),
  };
}

/**
 * Create 2 rooms with a loaded storage
 * All operations made on the main room are forwarded to the other room
 * Assertion on the storage validate both rooms
 */
export async function prepareStorageTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends BaseUserMeta = never,
  TRoomEvent extends Json = never
>(items: IdTuple<SerializedCrdt>[], actor: number = 0, scopes: string[] = []) {
  let currentActor = actor;
  const operations: Op[] = [];

  const ref = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -1, undefined, undefined, scopes);

  const subject = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, currentActor, undefined, undefined, scopes);

  subject.wss.onReceive.subscribe((data) => {
    const messages = parseAsClientMsgs(data);
    for (const message of messages) {
      if (message.type === ClientMsgCode.UPDATE_STORAGE) {
        operations.push(...message.ops);

        ref.wss.last.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        subject.wss.last.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
      } else if (message.type === ClientMsgCode.UPDATE_PRESENCE) {
        ref.wss.last.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_PRESENCE,
            data: message.data,
            actor: currentActor,
            targetActor: message.targetActor,
          })
        );
      }
    }
  });

  // Mock Server messages for Presence

  // Machine is the first user connected to the room, it then receives a server message
  // saying that the refRoom user joined the room.
  subject.wss.last.send(
    serverMessage({
      type: ServerMsgCode.USER_JOINED,
      actor: -1,
      id: undefined,
      info: undefined,
      scopes: [],
    })
  );

  // RefRoom is the second user connected to the room, it receives a server message
  // ROOM_STATE with the list of users in the room.
  ref.wss.last.send(
    serverMessage({
      type: ServerMsgCode.ROOM_STATE,
      users: { [currentActor]: { scopes: [] } },
    })
  );

  const states: ToImmutable<TStorage>[] = [];

  function expectBothClientStoragesToEqual(data: ToImmutable<TStorage>) {
    expect(subject.storage.root.toImmutable()).toEqual(data);
    expect(ref.storage.root.toImmutable()).toEqual(data);
    expect(subject.room.__internal.nodeCount).toBe(
      ref.room.__internal.nodeCount
    );
  }

  function expectStorage(data: ToImmutable<TStorage>) {
    states.push(data);
    expectBothClientStoragesToEqual(data);
  }

  function assertUndoRedo() {
    // this is what the last undo item looked like before we undo

    const before = deepCloneWithoutOpId(
      subject.room.__internal.undoStack[
        subject.room.__internal.undoStack.length - 1
      ]
    );

    // this will undo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      subject.room.history.undo();
      expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }

    // this will redo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      subject.room.history.redo();
      expectBothClientStoragesToEqual(states[i + 1]);
    }

    // this is what the last undo item looks like after redoing everything
    const after = deepCloneWithoutOpId(
      subject.room.__internal.undoStack[
        subject.room.__internal.undoStack.length - 1
      ]
    );

    // It should be identical before/after
    expect(before).toEqual(after);

    for (let i = 0; i < states.length - 1; i++) {
      subject.room.history.undo();
      expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }
  }

  function reconnect(
    actor: number,
    nextStorageItems?: IdTuple<SerializedCrdt>[] | undefined
  ) {
    currentActor = actor;

    // Next time a client socket connects, send this INITIAL_STORAGE_STATE
    // message
    subject.wss.onConnection((conn) => {
      if (nextStorageItems) {
        conn.server.send(
          serverMessage({
            type: ServerMsgCode.INITIAL_STORAGE_STATE,
            items: nextStorageItems,
          })
        );
      }

      // Other user in the room (refRoom) receives a "USER_JOINED" message.
      ref.wss.last.send(
        serverMessage({
          type: ServerMsgCode.USER_JOINED,
          actor,
          id: undefined,
          info: undefined,
          scopes: [],
        })
      );
    });

    // Send a close from the WebSocket server, triggering an automatic reconnect
    // by the room.
    subject.wss.last.close(
      new CloseEvent("close", {
        code: WebsocketCloseCodes.CLOSE_ABNORMAL,
        wasClean: false,
      })
    );
  }

  return {
    room: subject.room,
    refRoom: ref.room,
    operations,
    storage: subject.storage,
    refStorage: ref.storage,
    expectStorage,
    assertUndoRedo,

    applyRemoteOperations: (ops: Op[]) =>
      subject.wss.last.send(
        serverMessage({
          type: ServerMsgCode.UPDATE_STORAGE,
          ops,
        })
      ),

    reconnect,

    wss: subject.wss,
    refWss: ref.wss,
  };
}

/**
 * Join the same room with 2 different clients and stop sending socket messages when the storage is initialized
 */
export async function prepareStorageUpdateTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends BaseUserMeta = never,
  TRoomEvent extends Json = never
>(
  items: IdTuple<SerializedCrdt>[]
): Promise<{
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  root: LiveObject<TStorage>;
  expectUpdates: (updates: JsonStorageUpdate[][]) => void;
}> {
  const ref = await prepareRoomWithStorage(items, -1);
  const subject = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -2);

  subject.wss.onReceive.subscribe((data) => {
    const messages = parseAsClientMsgs(data);
    for (const message of messages) {
      if (message.type === ClientMsgCode.UPDATE_STORAGE) {
        ref.wss.last.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        subject.wss.last.send(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
      }
    }
  });

  const jsonUpdates: JsonStorageUpdate[][] = [];
  const refJsonUpdates: JsonStorageUpdate[][] = [];

  subject.room.events.storage.subscribe((updates) =>
    jsonUpdates.push(updates.map(serializeUpdateToJson))
  );
  ref.room.events.storage.subscribe((updates) =>
    refJsonUpdates.push(updates.map(serializeUpdateToJson))
  );

  function expectUpdatesInBothClients(updates: JsonStorageUpdate[][]) {
    expect(jsonUpdates).toEqual(updates);
    expect(refJsonUpdates).toEqual(updates);
  }

  return {
    room: subject.room,
    root: subject.storage.root,
    expectUpdates: expectUpdatesInBothClients,
  };
}

/**
 * Create a room, join with the client but sync local storage changes with the server
 */
export async function prepareDisconnectedStorageUpdateTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends BaseUserMeta = never,
  TRoomEvent extends Json = never
>(items: IdTuple<SerializedCrdt>[]) {
  const { storage, room } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -1);

  const receivedUpdates: JsonStorageUpdate[][] = [];

  room.subscribe(
    storage.root,
    (updates) => receivedUpdates.push(updates.map(serializeUpdateToJson)),
    { isDeep: true }
  );

  function expectUpdates(updates: JsonStorageUpdate[][]) {
    expect(receivedUpdates).toEqual(updates);
  }

  return {
    room,
    root: storage.root,
    expectUpdates,
  };
}

export function replaceRemoteStorageAndReconnect(
  wss: MockWebSocketServer,
  nextStorageItems: IdTuple<SerializedCrdt>[]
) {
  // Next time a client socket connects, send this INITIAL_STORAGE_STATE
  // message
  wss.onConnection((conn) =>
    conn.server.send(
      serverMessage({
        type: ServerMsgCode.INITIAL_STORAGE_STATE,
        items: nextStorageItems,
      })
    )
  );

  // Send a close from the WebSocket server, triggering an automatic reconnect
  // by the room.
  wss.last.close(
    new CloseEvent("close", {
      code: WebsocketCloseCodes.CLOSE_ABNORMAL,
      wasClean: false,
    })
  );
}

export function createSerializedObject(
  id: string,
  data: JsonObject,
  parentId: string,
  parentKey: string
): IdTuple<SerializedObject>;
export function createSerializedObject(
  id: string,
  data: JsonObject
): IdTuple<SerializedRootObject>;
export function createSerializedObject(
  id: string,
  data: JsonObject,
  parentId?: string,
  parentKey?: string
): IdTuple<SerializedObject | SerializedRootObject> {
  return [
    id,
    parentId !== undefined && parentKey !== undefined
      ? // Normal case
        { type: CrdtType.OBJECT, data, parentId, parentKey }
      : // Root object
        { type: CrdtType.OBJECT, data },
  ];
}

export function createSerializedList(
  id: string,
  parentId: string,
  parentKey: string
): IdTuple<SerializedList> {
  return [id, { type: CrdtType.LIST, parentId, parentKey }];
}

export function createSerializedMap(
  id: string,
  parentId: string,
  parentKey: string
): IdTuple<SerializedMap> {
  return [id, { type: CrdtType.MAP, parentId, parentKey }];
}

export function createSerializedRegister(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): IdTuple<SerializedRegister> {
  return [id, { type: CrdtType.REGISTER, parentId, parentKey, data }];
}

export function parseAsClientMsgs(data: string) {
  const json = JSON.parse(data) as
    | ClientMsg<JsonObject, Json>
    | ClientMsg<JsonObject, Json>[];
  return Array.isArray(json) ? json : [json];
}

export function serverMessage(
  message: ServerMsg<JsonObject, BaseUserMeta, Json>
) {
  return new MessageEvent("message", {
    data: JSON.stringify(message),
  });
}
