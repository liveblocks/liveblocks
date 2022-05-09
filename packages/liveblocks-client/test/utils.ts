import { AbstractCrdt } from "../src/AbstractCrdt";
import { liveObjectToJson, patchImmutableObject } from "../src/immutable";
import {
  ClientMessage,
  ClientMessageType,
  CrdtType,
  Op,
  SerializedCrdtWithId,
  ServerMessage,
  ServerMessageType,
} from "../src/live";
import { Json } from "../src/json";
import { Lson, LsonObject, ToJson } from "../src/lson";
import { LiveList } from "../src/LiveList";
import { LiveMap } from "../src/LiveMap";
import { LiveObject } from "../src/LiveObject";
import { makePosition } from "../src/position";
import { defaultState, Effects, makeStateMachine } from "../src/room";
import { Authentication, LiveListUpdates, StorageUpdate } from "../src/types";
import { remove } from "../src/utils";

// TODO: Further improve this type
type fixme = unknown;

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

type Machine = ReturnType<typeof makeStateMachine>;

export function objectToJson(record: LiveObject<LsonObject>) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson<T extends Lson>(list: LiveList<T>): Array<T> {
  return list.toArray().map(toJson);
}

function mapToJson<TKey extends string, TValue extends Lson>(
  map: LiveMap<TKey, TValue>
): Array<[string, TValue]> {
  return Array.from(map.entries())
    .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
    .map((entry) => [entry[0], toJson(entry[1])]);
}

function toJson(value: unknown) {
  if (value instanceof LiveObject) {
    return objectToJson(value);
  } else if (value instanceof LiveList) {
    return listToJson(value);
  } else if (value instanceof LiveMap) {
    return mapToJson(value);
  }

  return value;
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

async function prepareRoomWithStorage<T extends LsonObject>(
  items: SerializedCrdtWithId[],
  actor: number = 0,
  onSend: (messages: ClientMessage[]) => void = () => {},
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

  const getStoragePromise = machine.getStorage<T>();

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

export async function prepareIsolatedStorageTest<T extends LsonObject>(
  items: SerializedCrdtWithId[],
  actor: number = 0,
  defaultStorage = {}
) {
  const messagesSent: ClientMessage[] = [];

  const { machine, storage, ws } = await prepareRoomWithStorage<T>(
    items,
    actor,
    (messages: ClientMessage[]) => {
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
    assert: (data: fixme) => expect(objectToJson(storage.root)).toEqual(data),
    assertMessagesSent: (messages: ClientMessage[]) => {
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
export async function prepareStorageTest<T extends LsonObject>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  let currentActor = actor;
  const operations: Op[] = [];

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<T>(items, -1);

  const { machine, storage, ws } = await prepareRoomWithStorage<T>(
    items,
    currentActor,
    (messages: ClientMessage[]) => {
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
    }
  );

  const states: ToJson<LsonObject>[] = [];
  const expectedUpdates: any[][] = [];
  const expectedUndoUpdates: any[][] = [];
  const listOfUpdates: any[][] = [];
  const refListOfUpdates: any[][] = [];

  function assertState(data: ToJson<LsonObject>) {
    const json = objectToJson(storage.root);
    expect(json).toEqual(data);
    expect(objectToJson(refStorage.root)).toEqual(data);
    expect(machine.getItemsCount()).toBe(refMachine.getItemsCount());
  }

  function assertLastUpdates(updates: any[]) {
    expect(updates).toEqual(listOfUpdates[listOfUpdates.length - 1]);
    expect(updates).toEqual(refListOfUpdates[refListOfUpdates.length - 1]);
  }

  function assert(
    data: ToJson<LsonObject>,
    options?: {
      updates?: JsonLiveUpdate[];
      undoUpdates?: JsonLiveUpdate[];
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

type JsonLiveUpdate = JsonLiveListUpdate<Lson>;

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

function serializeUpdateToJson(update: StorageUpdate) {
  if (update.type === "LiveList") {
    return liveListUpdateToJson(update);
  }

  return {
    type: update.type,
    node: toJson(update.node),
    updates: toJson(update.updates),
  };
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

export async function prepareStorageImmutableTest<T extends LsonObject>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  let state: ToJson<T> = {} as any;
  let refState: ToJson<T> = {} as any;

  let totalStorageOps = 0;

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<T>(items, -1);

  const { machine, storage } = await prepareRoomWithStorage<T>(
    items,
    actor,
    (messages: ClientMessage[]) => {
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
    }
  );

  state = liveObjectToJson(storage.root) as ToJson<T>;
  refState = liveObjectToJson(refStorage.root) as ToJson<T>;

  const root = refStorage.root;
  refMachine.subscribe(
    root as AbstractCrdt,
    (updates) => {
      refState = patchImmutableObject(refState, updates);
    },
    { isDeep: true }
  );

  function assert(data: fixme, itemsCount?: number, storageOpsCount?: number) {
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

  function assertStorage(data: fixme) {
    const json = objectToJson(storage.root);
    expect(json).toEqual(data);
    expect(objectToJson(refStorage.root)).toEqual(data);
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

export function mockEffects(): Effects {
  return {
    authenticate: jest.fn(),
    delayFlush: jest.fn(),
    send: jest.fn(),
    schedulePongTimeout: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    scheduleReconnect: jest.fn(),
  };
}

export function serverMessage(message: ServerMessage) {
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
