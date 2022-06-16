import type { LiveObject } from "../src";
import type { RoomAuthToken } from "../src/AuthToken";
import { lsonToJson, patchImmutableObject } from "../src/immutable";
import { makePosition } from "../src/position";
import type { Effects, Machine } from "../src/room";
import { defaultState, makeStateMachine } from "../src/room";
import type {
  Authentication,
  ClientMsg,
  IdTuple,
  Json,
  JsonObject,
  LsonObject,
  Op,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
  ServerMsg,
  ToJson,
  UserMetadata,
} from "../src/types";
import { ClientMsgCode, CrdtType, ServerMsgCode } from "../src/types";
import { remove } from "../src/utils";
import type { JsonStorageUpdate } from "./updatesUtils";
import { serializeUpdateToJson } from "./updatesUtils";

function makeRoomToken(actor: number): RoomAuthToken {
  return {
    appId: "my-app",
    roomId: "my-room",
    actor,
    scopes: [],
  };
}

/**
 * Deep-clones a JSON-serializable value.
 */
function deepClone<T extends Json>(items: T): T {
  // NOTE: In this case, the combination of JSON.parse() and JSON.stringify
  // won't lead to type unsafety, so this use case is okay.
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(JSON.stringify(items));
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
    this.readyState = this.CLOSED;
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

const defaultContext = {
  roomId: "room-id",
  throttleDelay: -1, // No throttle for standard storage test
  liveblocksServer: "wss://live.liveblocks.io/v6",
  authentication: {
    type: "private",
    url: "/api/auth",
  } as Authentication,
  polyfills: {
    WebSocket: MockWebSocket as any,
  },
};

async function prepareRoomWithStorage<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends UserMetadata,
  TEvent extends Json
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  onSend: (messages: ClientMsg<TPresence, TEvent>[]) => void = () => {},
  defaultStorage?: TStorage
) {
  const effects = mockEffects();
  (effects.send as jest.MockedFunction<any>).mockImplementation(onSend);

  const state = defaultState<TPresence, TStorage, TUserMeta, TEvent>(
    {} as TPresence,
    defaultStorage || ({} as TStorage)
  );
  const machine = makeStateMachine<TPresence, TStorage, TUserMeta, TEvent>(
    state,
    defaultContext,
    effects
  );
  const ws = new MockWebSocket("");

  machine.connect();
  machine.authenticationSuccess(makeRoomToken(actor), ws as any);
  ws.open();

  const getStoragePromise = machine.getStorage();

  const clonedItems = deepClone(items);
  machine.onMessage(
    serverMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: clonedItems,
    })
  );

  const storage = await getStoragePromise;

  return {
    storage,
    machine,
    ws,
  };
}

export async function prepareIsolatedStorageTest<TStorage extends LsonObject>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: TStorage
) {
  const messagesSent: ClientMsg<never, never>[] = [];

  const { machine, storage, ws } = await prepareRoomWithStorage<
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
    machine,
    subscribe: machine.subscribe,
    undo: machine.undo,
    redo: machine.redo,
    ws,
    assert: (data: ToJson<TStorage>) =>
      expect(lsonToJson(storage.root)).toEqual(data),
    assertMessagesSent: (messages: ClientMsg<JsonObject, Json>[]) => {
      expect(messagesSent).toEqual(messages);
    },
    applyRemoteOperations: (ops: Op[]) =>
      machine.onMessage(
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
  TUserMeta extends UserMetadata = never,
  TEvent extends Json = never
>(items: IdTuple<SerializedCrdt>[], actor: number = 0) {
  let currentActor = actor;
  const operations: Op[] = [];

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<TPresence, TStorage, TUserMeta, TEvent>(
      items,
      -1
    );

  const { machine, storage, ws } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TEvent
  >(items, currentActor, (messages: ClientMsg<TPresence, TEvent>[]) => {
    for (const message of messages) {
      if (message.type === ClientMsgCode.UPDATE_STORAGE) {
        operations.push(...message.ops);

        refMachine.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        machine.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
      } else if (message.type === ClientMsgCode.UPDATE_PRESENCE) {
        refMachine.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_PRESENCE,
            data: message.data,
            actor: currentActor,
          })
        );
      }
    }
  });

  const states: ToJson<LsonObject>[] = [];

  function assertState(data: ToJson<LsonObject>) {
    const json = lsonToJson(storage.root);
    expect(json).toEqual(data);
    expect(lsonToJson(refStorage.root)).toEqual(data);
    expect(machine.getItemsCount()).toBe(refMachine.getItemsCount());
  }

  function assert(data: ToJson<LsonObject>) {
    states.push(data);
    assertState(data);
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assertState(states[states.length - 2 - i]);
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.redo();
      assertState(states[i + 1]);
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assertState(states[states.length - 2 - i]);
    }
  }

  function reconnect(
    actor: number,
    newItems?: IdTuple<SerializedCrdt>[] | undefined
  ): MockWebSocket {
    currentActor = actor;
    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess(makeRoomToken(actor), ws as any);
    ws.open();

    if (newItems) {
      machine.onMessage(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: newItems,
        })
      );
    }
    return ws;
  }

  return {
    machine,
    refMachine,
    operations,
    storage,
    refStorage,
    assert,
    assertUndoRedo,
    updatePresence: machine.updatePresence,
    getUndoStack: machine.getUndoStack,
    getItemsCount: machine.getItemsCount,
    subscribe: machine.subscribe,
    refSubscribe: refMachine.subscribe,
    batch: machine.batch,
    undo: machine.undo,
    redo: machine.redo,
    applyRemoteOperations: (ops: Op[]) =>
      machine.onMessage(
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
export function prepareStorageUpdateTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends UserMetadata = never,
  TEvent extends Json = never
>(
  items: IdTuple<SerializedCrdt>[],
  callback: (args: {
    root: LiveObject<TStorage>;
    machine: Machine<TPresence, TStorage, TUserMeta, TEvent>;
    assert: (updates: JsonStorageUpdate[][]) => void;
  }) => Promise<void>
): () => Promise<void> {
  return async () => {
    const { storage: refStorage, machine: refMachine } =
      await prepareRoomWithStorage(items, 1);

    const { storage, machine } = await prepareRoomWithStorage<
      TPresence,
      TStorage,
      TUserMeta,
      TEvent
    >(items, 0, (messages) => {
      for (const message of messages) {
        if (message.type === ClientMsgCode.UPDATE_STORAGE) {
          refMachine.onMessage(
            serverMessage({
              type: ServerMsgCode.UPDATE_STORAGE,
              ops: message.ops,
            })
          );
          machine.onMessage(
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

    machine.subscribe(
      storage.root,
      (updates) => jsonUpdates.push(updates.map(serializeUpdateToJson)),
      { isDeep: true }
    );
    refMachine.subscribe(
      refStorage.root,
      (updates) => refJsonUpdates.push(updates.map(serializeUpdateToJson)),
      { isDeep: true }
    );

    function assert(updates: JsonStorageUpdate[][]) {
      expect(jsonUpdates).toEqual(updates);
      expect(refJsonUpdates).toEqual(updates);
    }

    await callback({ root: storage.root, machine, assert });
  };
}

export async function reconnect<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends UserMetadata,
  TEvent extends Json
>(
  machine: Machine<TPresence, TStorage, TUserMeta, TEvent>,
  actor: number,
  newItems: IdTuple<SerializedCrdt>[]
) {
  const ws = new MockWebSocket("");
  machine.connect();
  machine.authenticationSuccess(makeRoomToken(actor), ws);
  ws.open();

  machine.onMessage(
    serverMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: newItems,
    })
  );
}

export async function prepareStorageImmutableTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never,
  TUserMeta extends UserMetadata = never,
  TEvent extends Json = never
>(items: IdTuple<SerializedCrdt>[], actor: number = 0) {
  let state = {} as ToJson<TStorage>;
  let refState = {} as ToJson<TStorage>;

  let totalStorageOps = 0;

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<TPresence, TStorage, TUserMeta, TEvent>(
      items,
      -1
    );

  const { machine, storage } = await prepareRoomWithStorage<
    TPresence,
    TStorage,
    TUserMeta,
    TEvent
  >(items, actor, (messages: ClientMsg<TPresence, TEvent>[]) => {
    for (const message of messages) {
      if (message.type === ClientMsgCode.UPDATE_STORAGE) {
        totalStorageOps += message.ops.length;
        refMachine.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
        machine.onMessage(
          serverMessage({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: message.ops,
          })
        );
      }
    }
  });

  state = lsonToJson(storage.root) as ToJson<TStorage>;
  refState = lsonToJson(refStorage.root) as ToJson<TStorage>;

  const root = refStorage.root;
  refMachine.subscribe(
    root,
    (updates) => {
      refState = patchImmutableObject(refState, updates);
    },
    { isDeep: true }
  );

  function assert(
    data: ToJson<TStorage>,
    itemsCount?: number,
    storageOpsCount?: number
  ) {
    assertStorage(data);

    if (itemsCount) {
      expect(machine.getItemsCount()).toBe(itemsCount);
    }
    expect(state).toEqual(refState);
    expect(state).toEqual(data);

    if (storageOpsCount) {
      expect(totalStorageOps).toEqual(storageOpsCount);
    }
  }

  function assertStorage(data: ToJson<TStorage>) {
    const json = lsonToJson(storage.root);
    expect(json).toEqual(data);
    expect(lsonToJson(refStorage.root)).toEqual(data);
  }

  return {
    storage,
    refStorage,
    assert,
    assertStorage,
    subscribe: machine.subscribe,
    refSubscribe: refMachine.subscribe,
    state,
  };
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
  TEvent extends Json
>(): Effects<TPresence, TEvent> {
  return {
    authenticate: jest.fn(),
    delayFlush: jest.fn(),
    send: jest.fn(),
    schedulePongTimeout: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    scheduleReconnect: jest.fn(),
  };
}

export function serverMessage(
  message: ServerMsg<JsonObject, UserMetadata, Json>
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
