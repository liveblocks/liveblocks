import type { LiveObject } from "..";
import type { LsonObject } from "../crdts/Lson";
import type { ToImmutable } from "../crdts/utils";
import type { EventSource, Observable } from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";
import type { Json, JsonObject } from "../lib/Json";
import { makePosition } from "../lib/position";
import type { Authentication } from "../protocol/Authentication";
import type { RoomAuthToken } from "../protocol/AuthToken";
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
import type { _private_Effects as Effects, Room } from "../room";
import { createRoom } from "../room";
import type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketMessageEvent,
} from "../types/IWebSocket";
import type { JsonStorageUpdate } from "./_updatesUtils";
import { serializeUpdateToJson } from "./_updatesUtils";

function makeRoomToken(actor: number, scopes: string[]): RoomAuthToken {
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
  receivedMessagesRaw: string[];
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
        return JSON.parse(raw);
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

  public onConnection(callback: (conn: Connection) => void): void {
    this.newConnectionCallbacks.subscribe(callback);
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
      this.server.receivedMessagesRaw.push(message);
    }
  }

  /**
   * Close the socket from the client side.
   */
  public close(_code?: number, _reason?: string): void {
    this.#readyState = this.CLOSED;
  }
}

/**
 * Makes a simple mocked WebSocket client that is connected to a mocked
 * WebSocket server.
 */
export function makeControllableWebSocket(): MockWebSocket {
  const server = new MockWebSocketServer();
  return server.newSocket();
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

function makeRoomConfig<TPresence extends JsonObject, TRoomEvent extends Json>(
  mockedEffects: Effects<TPresence, TRoomEvent>
) {
  return {
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
    mockedEffects,
  };
}

export async function prepareRoomWithStorage<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  onSend: (messages: ClientMsg<TPresence, TRoomEvent>[]) => void = () => {},
  defaultStorage?: TStorage,
  scopes: string[] = []
) {
  const effects = mockEffects();
  (effects.send as jest.MockedFunction<any>).mockImplementation(onSend);

  const room = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
    {
      initialPresence: {} as TPresence,
      initialStorage: defaultStorage || ({} as TStorage),
    },
    makeRoomConfig(effects)
  );
  const ws = makeControllableWebSocket();

  room.__internal.send.connect();
  room.__internal.send.authSuccess(makeRoomToken(actor, scopes), ws);
  ws.server.accept();

  // Start getting the storage, but don't await the promise just yet!
  const getStoragePromise = room.getStorage();

  const clonedItems = deepClone(items);
  room.__internal.send.incomingMessage(
    serverMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: clonedItems,
    })
  );

  const storage = await getStoragePromise;
  return { storage, room, ws };
}

export async function prepareIsolatedStorageTest<TStorage extends LsonObject>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: TStorage
) {
  const messagesSent: ClientMsg<never, never>[] = [];

  const { room, storage, ws } = await prepareRoomWithStorage<
    never,
    TStorage,
    never,
    never
  >(
    items,
    actor,
    (messages: ClientMsg<never, never>[]) => {
      messagesSent.push(...messages);
    },
    defaultStorage || ({} as TStorage)
  );

  return {
    root: storage.root,
    room,
    ws,
    expectStorage: (data: ToImmutable<TStorage>) =>
      expect(storage.root.toImmutable()).toEqual(data),
    expectMessagesSent: (messages: ClientMsg<JsonObject, Json>[]) => {
      expect(messagesSent).toEqual(messages);
    },
    applyRemoteOperations: (ops: Op[]) =>
      room.__internal.send.incomingMessage(
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

  const { room: refRoom, storage: refStorage } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -1, undefined, undefined, scopes);

  const { room, storage, ws } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(
    items,
    currentActor,
    (messages: ClientMsg<TPresence, TRoomEvent>[]) => {
      for (const message of messages) {
        if (message.type === ClientMsgCode.UPDATE_STORAGE) {
          operations.push(...message.ops);

          refRoom.__internal.send.incomingMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_STORAGE,
              ops: message.ops,
            })
          );
          room.__internal.send.incomingMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_STORAGE,
              ops: message.ops,
            })
          );
        } else if (message.type === ClientMsgCode.UPDATE_PRESENCE) {
          refRoom.__internal.send.incomingMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_PRESENCE,
              data: message.data,
              actor: currentActor,
              targetActor: message.targetActor,
            })
          );
        }
      }
    },
    undefined,
    scopes
  );

  // Mock Server messages for Presence

  // Machine is the first user connected to the room, it then receives a server message
  // saying that the refRoom user joined the room.
  room.__internal.send.incomingMessage(
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
  refRoom.__internal.send.incomingMessage(
    serverMessage({
      type: ServerMsgCode.ROOM_STATE,
      users: { [currentActor]: { scopes: [] } },
    })
  );

  const states: ToImmutable<TStorage>[] = [];

  function expectBothClientStoragesToEqual(data: ToImmutable<TStorage>) {
    expect(storage.root.toImmutable()).toEqual(data);
    expect(refStorage.root.toImmutable()).toEqual(data);
    expect(room.__internal.nodeCount).toBe(refRoom.__internal.nodeCount);
  }

  function expectStorage(data: ToImmutable<TStorage>) {
    states.push(data);
    expectBothClientStoragesToEqual(data);
  }

  function assertUndoRedo() {
    // this is what the last undo item looked like before we undo

    const before = deepCloneWithoutOpId(
      room.__internal.undoStack[room.__internal.undoStack.length - 1]
    );

    // this will undo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      room.history.undo();
      expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }

    // this will redo the whole stack
    for (let i = 0; i < states.length - 1; i++) {
      room.history.redo();
      expectBothClientStoragesToEqual(states[i + 1]);
    }

    // this is what the last undo item looks like after redoing everything
    const after = deepCloneWithoutOpId(
      room.__internal.undoStack[room.__internal.undoStack.length - 1]
    );

    // It should be identical before/after
    expect(before).toEqual(after);

    for (let i = 0; i < states.length - 1; i++) {
      room.history.undo();
      expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }
  }

  function reconnect(
    actor: number,
    newItems?: IdTuple<SerializedCrdt>[] | undefined
  ): MockWebSocket {
    currentActor = actor;
    const ws = makeControllableWebSocket();
    room.__internal.send.connect();
    room.__internal.send.authSuccess(makeRoomToken(actor, []), ws);
    ws.server.accept();

    // Mock server messages for Presence.
    // Other user in the room (refRoom) recieves a "USER_JOINED" message.
    refRoom.__internal.send.incomingMessage(
      serverMessage({
        type: ServerMsgCode.USER_JOINED,
        actor,
        id: undefined,
        info: undefined,
        scopes: [],
      })
    );

    if (newItems) {
      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: newItems,
        })
      );
    }
    return ws;
  }

  return {
    room,
    refRoom,
    operations,
    storage,
    refStorage,
    expectStorage,
    assertUndoRedo,
    applyRemoteOperations: (ops: Op[]) =>
      room.__internal.send.incomingMessage(
        serverMessage({
          type: ServerMsgCode.UPDATE_STORAGE,
          ops,
        })
      ),
    reconnect,
    ws,
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
  const { room: refRoom } = await prepareRoomWithStorage(items, -1);
  const { room, storage } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -2, (messages) => {
    for (const message of messages) {
      if (message.type === ClientMsgCode.UPDATE_STORAGE) {
        refRoom.__internal.send.incomingMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        room.__internal.send.incomingMessage(
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

  room.events.storage.subscribe((updates) =>
    jsonUpdates.push(updates.map(serializeUpdateToJson))
  );
  refRoom.events.storage.subscribe((updates) =>
    refJsonUpdates.push(updates.map(serializeUpdateToJson))
  );

  function expectUpdatesInBothClients(updates: JsonStorageUpdate[][]) {
    expect(jsonUpdates).toEqual(updates);
    expect(refJsonUpdates).toEqual(updates);
  }

  return {
    room,
    root: storage.root,
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
>(
  items: IdTuple<SerializedCrdt>[]
): Promise<{
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  root: LiveObject<TStorage>;
  expectUpdates: (updates: JsonStorageUpdate[][]) => void;
}> {
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

export function reconnect<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
  actor: number,
  newItems: IdTuple<SerializedCrdt>[]
) {
  const ws = makeControllableWebSocket();
  room.__internal.send.connect();
  room.__internal.send.authSuccess(makeRoomToken(actor, []), ws);
  ws.server.accept();

  room.__internal.send.incomingMessage(
    serverMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: newItems,
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

export function mockEffects<
  TPresence extends JsonObject,
  TRoomEvent extends Json
>(): Effects<TPresence, TRoomEvent> {
  return {
    authenticateAndConnect: jest.fn(),
    send: jest.fn(),
    scheduleReconnect: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    schedulePongTimeout: jest.fn(),
  };
}

export function serverMessage(
  message: ServerMsg<JsonObject, BaseUserMeta, Json>
) {
  return new MessageEvent("message", {
    data: JSON.stringify(message),
  });
}

export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}

export function withDateNow(now: number, callback: () => void) {
  const realDateNow = Date.now.bind(global.Date);
  global.Date.now = jest.fn(() => now);
  try {
    callback();
  } finally {
    global.Date.now = realDateNow;
  }
}
