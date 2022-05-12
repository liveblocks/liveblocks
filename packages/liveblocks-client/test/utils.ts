import type { AbstractCrdt } from "../src/AbstractCrdt";
import { lsonToJson, patchImmutableObject } from "../src/immutable";
import {
  ClientMessage,
  ClientMessageType,
  CrdtType,
  Op,
  SerializedCrdtWithId,
  ServerMessage,
  ServerMessageType,
} from "../src/live";
import type { Json, JsonObject } from "../src/json";
import type { LsonObject, ToJson } from "../src/lson";
import { makePosition } from "../src/position";
import { defaultState, makeStateMachine } from "../src/room";
import type { Effects, Machine } from "../src/room";
import type {
  Authentication,
  LiveListUpdates,
  LiveObjectUpdateDelta,
  StorageUpdate,
  UpdateDelta,
} from "../src/types";
import { remove } from "../src/utils";

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
  liveblocksServer: "wss://live.liveblocks.io/v5",
  authentication: {
    type: "private",
    url: "/api/auth",
  } as Authentication,
  WebSocketPolyfill: MockWebSocket as any,
};

async function prepareRoomWithStorage<
  TPresence extends JsonObject,
  TStorage extends LsonObject
>(
  items: SerializedCrdtWithId[],
  actor: number = 0,
  onSend: (messages: ClientMessage<TPresence>[]) => void = () => {},
  defaultStorage = {}
) {
  const effects = mockEffects();
  (effects.send as jest.MockedFunction<any>).mockImplementation(onSend);

  const state = defaultState({}, defaultStorage);
  const machine = makeStateMachine(state, defaultContext, effects);
  const ws = new MockWebSocket("");

  machine.connect();
  machine.authenticationSuccess({ actor }, ws as any);
  ws.open();

  const getStoragePromise = machine.getStorage<TStorage>();

  const clonedItems = deepClone(items);
  machine.onMessage(
    serverMessage({
      type: ServerMessageType.InitialStorageState,
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
  items: SerializedCrdtWithId[],
  actor: number = 0,
  defaultStorage = {}
) {
  const messagesSent: ClientMessage<never>[] = [];

  const { machine, storage, ws } = await prepareRoomWithStorage<
    never,
    TStorage
  >(
    items,
    actor,
    (messages: ClientMessage<never>[]) => {
      messagesSent.push(...messages);
    },
    defaultStorage
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
    assertMessagesSent: (messages: ClientMessage<JsonObject>[]) => {
      expect(messagesSent).toEqual(messages);
    },
    applyRemoteOperations: (ops: Op[]) =>
      machine.onMessage(
        serverMessage({
          type: ServerMessageType.UpdateStorage,
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
export async function prepareStorageTest<TStorage extends LsonObject>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  let currentActor = actor;
  const operations: Op[] = [];

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<never, TStorage>(items, -1);

  const { machine, storage, ws } = await prepareRoomWithStorage<
    never,
    TStorage
  >(items, currentActor, (messages: ClientMessage<never>[]) => {
    for (const message of messages) {
      if (message.type === ClientMessageType.UpdateStorage) {
        operations.push(...message.ops);

        refMachine.onMessage(
          serverMessage({
            type: ServerMessageType.UpdateStorage,
            ops: message.ops,
          })
        );
        machine.onMessage(
          serverMessage({
            type: ServerMessageType.UpdateStorage,
            ops: message.ops,
          })
        );
      } else if (message.type === ClientMessageType.UpdatePresence) {
        refMachine.onMessage(
          serverMessage({
            type: ServerMessageType.UpdatePresence,
            data: message.data,
            actor: currentActor,
          })
        );
      }
    }
  });

  const states: ToJson<LsonObject>[] = [];
  const expectedUpdates: JsonStorageUpdate[][] = [];
  const expectedUndoUpdates: JsonStorageUpdate[][] = [];
  const listOfUpdates: JsonStorageUpdate[][] = [];
  const refListOfUpdates: JsonStorageUpdate[][] = [];

  function assertState(data: ToJson<LsonObject>) {
    const json = lsonToJson(storage.root);
    expect(json).toEqual(data);
    expect(lsonToJson(refStorage.root)).toEqual(data);
    expect(machine.getItemsCount()).toBe(refMachine.getItemsCount());
  }

  function assertLastUpdates(updates: JsonStorageUpdate[]) {
    expect(updates).toEqual(listOfUpdates[listOfUpdates.length - 1]);
    expect(updates).toEqual(refListOfUpdates[refListOfUpdates.length - 1]);
  }

  function assert(
    data: ToJson<LsonObject>,
    options?: {
      updates?: JsonStorageUpdate[];
      undoUpdates?: JsonStorageUpdate[];
    }
  ) {
    states.push(data);

    if (options?.updates) {
      expectedUpdates.push(options.updates);
    }
    if (options?.undoUpdates) {
      expectedUndoUpdates.push(options.undoUpdates);
    }

    assertState(data);

    if (options?.updates) {
      assertLastUpdates(options.updates);
    }
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assertState(states[states.length - 2 - i]);
      if (expectedUndoUpdates.length > 0)
        assertLastUpdates(
          expectedUndoUpdates[expectedUndoUpdates.length - 1 - i]
        );
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.redo();
      assertState(states[i + 1]);
      if (expectedUpdates.length > 0) assertLastUpdates(expectedUpdates[i]);
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assertState(states[states.length - 2 - i]);
      if (expectedUndoUpdates.length > 0)
        assertLastUpdates(
          expectedUndoUpdates[expectedUndoUpdates.length - 1 - i]
        );
    }
  }

  machine.subscribe(
    storage.root,
    (updates) => listOfUpdates.push(updates.map(serializeUpdateToJson)),
    {
      isDeep: true,
    }
  );

  refMachine.subscribe(
    refStorage.root,
    (updates) => refListOfUpdates.push(updates.map(serializeUpdateToJson)),
    {
      isDeep: true,
    }
  );

  function reconnect(
    actor: number,
    newItems?: SerializedCrdtWithId[] | undefined
  ): MockWebSocket {
    currentActor = actor;
    const ws = new MockWebSocket("");
    machine.connect();
    machine.authenticationSuccess({ actor: actor }, ws as any);
    ws.open();

    if (newItems) {
      machine.onMessage(
        serverMessage({
          type: ServerMessageType.InitialStorageState,
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
          type: ServerMessageType.UpdateStorage,
          ops,
        })
      ),
    reconnect,
    ws,
  };
}

type JsonStorageUpdate =
  | JsonLiveListUpdate<Lson>
  | JsonLiveObjectUpdate<LsonObject>
  | JsonLiveMapUpdate<string, Lson>;

type JsonLiveListUpdate<TItem extends Lson> = {
  type: "LiveList";
  node: ToJson<LiveList<TItem>>;
  updates: Array<
    | {
        type: "insert";
        item: ToJson<TItem>;
        index: number;
      }
    | {
        type: "move";
        index: number;
        previousIndex: number;
        item: ToJson<TItem>;
      }
    | {
        type: "delete";
        index: number;
      }
    | {
        type: "set";
        item: ToJson<TItem>;
        index: number;
      }
  >;
};

type JsonLiveObjectUpdate<O extends LsonObject> = {
  type: "LiveObject";
  node: ToJson<LiveObject<O>>;
  updates: LiveObjectUpdateDelta<O>;
};

type JsonLiveMapUpdate<TKey extends string, TValue extends Lson> = {
  type: "LiveMap";
  node: ToJson<LiveMap<TKey, TValue>>;
  updates: { [key: string]: UpdateDelta };
};

function liveListUpdateToJson<TItem extends Lson>(
  update: LiveListUpdates<TItem>
): JsonLiveListUpdate<TItem> {
  return {
    type: update.type,
    node: toJson(update.node),
    updates: update.updates.map((delta) => {
      switch (delta.type) {
        case "move": {
          return {
            type: delta.type,
            index: delta.index,
            previousIndex: delta.previousIndex,
            item: toJson(delta.item),
          };
        }
        case "delete": {
          return delta;
        }
        case "insert": {
          return {
            type: delta.type,
            index: delta.index,
            item: toJson(delta.item),
          };
        }
        case "set": {
          return {
            type: delta.type,
            index: delta.index,
            item: toJson(delta.item),
          };
        }
      }
    }),
  };
}

function serializeUpdateToJson(update: StorageUpdate): JsonStorageUpdate {
  if (update.type === "LiveList") {
    return liveListUpdateToJson(update);
  }

  if (update.type === "LiveObject") {
    return {
      type: update.type,
      node: toJson(update.node),
      updates: update.updates,
    };
  }

  if (update.type === "LiveMap") {
    return {
      type: update.type,
      node: toJson(update.node),
      updates: update.updates,
    };
  }

  throw new Error("Unsupported LiveStructure type");
}

export async function reconnect(
  machine: Machine,
  actor: number,
  newItems: SerializedCrdtWithId[]
) {
  const ws = new MockWebSocket("");
  machine.connect();
  machine.authenticationSuccess({ actor: actor }, ws);
  ws.open();

  machine.onMessage(
    serverMessage({
      type: ServerMessageType.InitialStorageState,
      items: newItems,
    })
  );
}

export async function prepareStorageImmutableTest<
  TStorage extends LsonObject,
  TPresence extends JsonObject = never
>(items: SerializedCrdtWithId[], actor: number = 0) {
  let state: ToJson<TStorage> = {} as any;
  let refState: ToJson<TStorage> = {} as any;

  let totalStorageOps = 0;

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<TPresence, TStorage>(items, -1);

  const { machine, storage } = await prepareRoomWithStorage<
    TPresence,
    TStorage
  >(items, actor, (messages: ClientMessage<TPresence>[]) => {
    for (const message of messages) {
      if (message.type === ClientMessageType.UpdateStorage) {
        totalStorageOps += message.ops.length;
        refMachine.onMessage(
          serverMessage({
            type: ServerMessageType.UpdateStorage,
            ops: message.ops,
          })
        );
        machine.onMessage(
          serverMessage({
            type: ServerMessageType.UpdateStorage,
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
    root as AbstractCrdt,
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
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Object,
      data,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedList(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.List,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedMap(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Map,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedRegister(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Register,
      parentId,
      parentKey,
      data,
    },
  ];
}

export function mockEffects(): Effects<JsonObject> {
  return {
    authenticate: jest.fn(),
    delayFlush: jest.fn(),
    send: jest.fn(),
    schedulePongTimeout: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    scheduleReconnect: jest.fn(),
  };
}

export function serverMessage(message: ServerMessage<JsonObject>) {
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
