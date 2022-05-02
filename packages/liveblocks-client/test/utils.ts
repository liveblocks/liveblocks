import { AbstractCrdt } from "../src/AbstractCrdt";
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
import { Json } from "../src/json";
import { ToJson } from "../src/lson";
import { makePosition } from "../src/position";
import { defaultState, Effects, makeStateMachine, Machine } from "../src/room";
import {
  Authentication,
  BasePresence as Presence,
  BaseStorage as Storage,
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

async function prepareRoomWithStorage<P extends Presence, S extends Storage>(
  items: SerializedCrdtWithId[],
  actor: number = 0,
  onSend: (messages: ClientMessage<P>[]) => void = () => {},
  defaultStorage?: S
) {
  const effects = mockEffects();
  (effects.send as jest.MockedFunction<any>).mockImplementation(onSend);

  const state = defaultState<P, S>(undefined, defaultStorage);
  const machine = makeStateMachine<P, S>(state, defaultContext, effects);
  const ws = new MockWebSocket("");

  machine.connect();
  machine.authenticationSuccess({ actor }, ws as any);
  ws.open();

  const getStoragePromise = machine.getStorage();

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

export async function prepareIsolatedStorageTest<
  P extends Presence,
  S extends Storage
>(items: SerializedCrdtWithId[], actor: number = 0, defaultStorage?: S) {
  const messagesSent: ClientMessage<P>[] = [];

  const { machine, storage, ws } = await prepareRoomWithStorage<P, S>(
    items,
    actor,
    (messages: ClientMessage<P>[]) => {
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
    assert: (data: ToJson<S>) => expect(lsonToJson(storage.root)).toEqual(data),
    assertMessagesSent: (messages: ClientMessage<P>[]) => {
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
 * Create 2 rooms with a loaded storage.
 * All operations made on the main room are forwarded to the other room
 * Assertion on the storage validate both rooms
 */
export async function prepareStorageTest<P extends Presence, S extends Storage>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  let currentActor = actor;
  const operations: Op[] = [];

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<P, S>(items, -1);

  const { machine, storage, ws } = await prepareRoomWithStorage<P, S>(
    items,
    currentActor,
    (messages: ClientMessage<P>[]) => {
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

  const states: any[] = [];

  function assert(data: ToJson<S>, shouldPushToStates = true) {
    if (shouldPushToStates) {
      states.push(data);
    }
    const json = lsonToJson(storage.root);
    expect(json).toEqual(data);
    expect(lsonToJson(refStorage.root)).toEqual(data);
    expect(machine.getItemsCount()).toBe(refMachine.getItemsCount());
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assert(states[states.length - 2 - i], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.redo();
      assert(states[i + 1], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      machine.undo();
      assert(states[states.length - 2 - i], false);
    }
  }

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

export async function reconnect<P extends Presence, S extends Storage>(
  machine: Machine<P, S>,
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
  P extends Presence,
  S extends Storage
>(items: SerializedCrdtWithId[], actor: number = 0) {
  let state: ToJson<S> = {} as any;
  let refState: ToJson<S> = {} as any;

  let totalStorageOps = 0;

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<P, S>(items, -1);

  const { machine, storage } = await prepareRoomWithStorage<P, S>(
    items,
    actor,
    (messages: ClientMessage<P>[]) => {
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

  state = lsonToJson(storage.root) as ToJson<S>;
  refState = lsonToJson(refStorage.root) as ToJson<S>;

  const root = refStorage.root;
  refMachine.subscribe(
    root as AbstractCrdt,
    (updates) => {
      refState = patchImmutableObject(refState, updates);
    },
    { isDeep: true }
  );

  function assert(
    data: ToJson<S>,
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

  function assertStorage(data: ToJson<S>) {
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

export function mockEffects(): Effects<any> {
  return {
    authenticate: jest.fn(),
    delayFlush: jest.fn(),
    send: jest.fn(),
    schedulePongTimeout: jest.fn(),
    startHeartbeatInterval: jest.fn(),
    scheduleReconnect: jest.fn(),
  };
}

export function serverMessage<P extends Presence>(message: ServerMessage<P>) {
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
