import type { LiveObject } from "..";
import type { LsonObject } from "../crdts/Lson";
import type { ToImmutable } from "../crdts/ToImmutable";
import type { Json, JsonObject } from "../lib/Json";
import { makePosition } from "../lib/position";
import { remove } from "../lib/utils";
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
import { createRoom, makeClassicSubscribeFn } from "../room";
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

export class MockWebSocket implements WebSocket {
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  static instances: MockWebSocket[] = [];

  isMock = true;

  callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  sentMessages: string[] = [];
  readyState: number;

  constructor(
    public url: string,
    private onSend: (message: string) => void = () => {}
  ) {
    this.readyState = this.CONNECTING;
    MockWebSocket.instances.push(this);
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = this.CLOSED;
  }

  addEventListener<T extends "open" | "close" | "error" | "message">(
    event: T,
    callback: (event: WebSocketEventMap[T]) => void
  ) {
    this.callbacks[event].push(callback as any);
  }

  removeEventListener<T extends "open" | "close" | "error" | "message">(
    event: T,
    callback: (event: WebSocketEventMap[T]) => void
  ) {
    remove(this.callbacks[event], callback as any);
  }

  send(message: string) {
    this.sentMessages.push(message);
    this.onSend(message);
  }

  open() {
    this.readyState = this.OPEN;
    for (const callback of this.callbacks.open) {
      callback();
    }
  }

  closeFromBackend(event?: CloseEvent) {
    this.readyState = this.CLOSED;
    for (const callback of this.callbacks.close) {
      callback(event);
    }
  }

  // Fields and methods below are not implemented

  binaryType: BinaryType = "blob";
  bufferedAmount: number = 0;
  extensions: string = "";
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = () => {
    throw new Error("NOT IMPLEMENTED");
  };
  onerror: ((this: WebSocket, ev: Event) => any) | null = () => {
    throw new Error("NOT IMPLEMENTED");
  };
  onmessage: ((this: WebSocket, ev: MessageEvent<any>) => any) | null = () => {
    throw new Error("NOT IMPLEMENTED");
  };
  onopen: ((this: WebSocket, ev: Event) => any) | null = () => {
    throw new Error("NOT IMPLEMENTED");
  };
  protocol: string = "";
  dispatchEvent(_event: Event): boolean {
    throw new Error("Method not implemented.");
  }
}

export const FIRST_POSITION = makePosition();
export const SECOND_POSITION = makePosition(FIRST_POSITION);
export const THIRD_POSITION = makePosition(SECOND_POSITION);
export const FOURTH_POSITION = makePosition(THIRD_POSITION);
export const FIFTH_POSITION = makePosition(FOURTH_POSITION);

function makeMachineConfig<
  TPresence extends JsonObject,
  TRoomEvent extends Json
>(mockedEffects: Effects<TPresence, TRoomEvent>) {
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
    makeMachineConfig(effects)
  );
  const ws = new MockWebSocket("");

  room.__internal.connect();
  room.__internal.authenticationSuccess(makeRoomToken(actor, scopes), ws);
  ws.open();

  // Start getting the storage, but don't await the promise just yet!
  const getStoragePromise = room.getStorage();

  const clonedItems = deepClone(items);
  room.__internal.onMessage(
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
    subscribe: makeClassicSubscribeFn(room.events),
    undo: room.history.undo,
    redo: room.history.redo,
    ws,
    expectStorage: (data: ToImmutable<TStorage>) =>
      expect(storage.root.toImmutable()).toEqual(data),
    expectMessagesSent: (messages: ClientMsg<JsonObject, Json>[]) => {
      expect(messagesSent).toEqual(messages);
    },
    applyRemoteOperations: (ops: Op[]) =>
      room.__internal.onMessage(
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

          refRoom.__internal.onMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_STORAGE,
              ops: message.ops,
            })
          );
          room.__internal.onMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_STORAGE,
              ops: message.ops,
            })
          );
        } else if (message.type === ClientMsgCode.UPDATE_PRESENCE) {
          refRoom.__internal.onMessage(
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
  room.__internal.onMessage(
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
  refRoom.__internal.onMessage(
    serverMessage({
      type: ServerMsgCode.ROOM_STATE,
      users: { [currentActor]: { scopes: [] } },
    })
  );

  const states: ToImmutable<TStorage>[] = [];

  function expectBothClientStoragesToEqual(data: ToImmutable<TStorage>) {
    expect(storage.root.toImmutable()).toEqual(data);
    expect(refStorage.root.toImmutable()).toEqual(data);
    expect(room.__internal.getItemsCount()).toBe(
      refRoom.__internal.getItemsCount()
    );
  }

  function expectStorage(data: ToImmutable<TStorage>) {
    states.push(data);
    expectBothClientStoragesToEqual(data);
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      room.history.undo();
      expectBothClientStoragesToEqual(states[states.length - 2 - i]);
    }

    for (let i = 0; i < states.length - 1; i++) {
      room.history.redo();
      expectBothClientStoragesToEqual(states[i + 1]);
    }

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
    const ws = new MockWebSocket("");
    room.__internal.connect();
    room.__internal.authenticationSuccess(makeRoomToken(actor, []), ws);
    ws.open();

    // Mock server messages for Presence.
    // Other user in the room (refRoom) recieves a "USER_JOINED" message.
    refRoom.__internal.onMessage(
      serverMessage({
        type: ServerMsgCode.USER_JOINED,
        actor,
        id: undefined,
        info: undefined,
        scopes: [],
      })
    );

    if (newItems) {
      room.__internal.onMessage(
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
    subscribe: makeClassicSubscribeFn(room.events),
    operations,
    storage,
    refStorage,
    expectStorage,
    assertUndoRedo,
    updatePresence: room.updatePresence,
    getUndoStack: room.__internal.getUndoStack,
    getItemsCount: room.__internal.getItemsCount,
    batch: room.batch,
    undo: room.history.undo,
    redo: room.history.redo,
    canUndo: room.history.canUndo,
    canRedo: room.history.canRedo,
    applyRemoteOperations: (ops: Op[]) =>
      room.__internal.onMessage(
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
  batch: (fn: () => void) => void;
  root: LiveObject<TStorage>;
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
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
        refRoom.__internal.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        room.__internal.onMessage(
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
    batch: room.batch,
    root: storage.root,
    room,
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
  batch: (fn: () => void) => void;
  root: LiveObject<TStorage>;
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  expectUpdates: (updates: JsonStorageUpdate[][]) => void;
}> {
  const { storage, room } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >(items, -1);

  const receivedUpdates: JsonStorageUpdate[][] = [];

  const subscribe = makeClassicSubscribeFn(room.events);
  subscribe(
    storage.root,
    (updates) => receivedUpdates.push(updates.map(serializeUpdateToJson)),
    { isDeep: true }
  );

  function expectUpdates(updates: JsonStorageUpdate[][]) {
    expect(receivedUpdates).toEqual(updates);
  }

  return {
    batch: room.batch,
    root: storage.root,
    room,
    expectUpdates,
  };
}

export async function reconnect<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
  actor: number,
  newItems: IdTuple<SerializedCrdt>[]
) {
  const ws = new MockWebSocket("");
  room.__internal.connect();
  room.__internal.authenticationSuccess(makeRoomToken(actor, []), ws);
  ws.open();

  room.__internal.onMessage(
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
    authenticate: jest.fn(),
    send: jest.fn(),
    scheduleFlush: jest.fn(),
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
