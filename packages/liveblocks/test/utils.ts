import {
  ClientMessage,
  ClientMessageType,
  CrdtType,
  Op,
  SerializedCrdtWithId,
  ServerMessage,
  ServerMessageType,
} from "../src/live";
import { LiveList } from "../src/LiveList";
import { LiveMap } from "../src/LiveMap";
import { LiveObject } from "../src/LiveObject";
import { makePosition } from "../src/position";
import {
  createRoom,
  defaultState,
  Effects,
  makeStateMachine,
} from "../src/room";
import { remove } from "../src/utils";

type Machine = ReturnType<typeof makeStateMachine>;

export function objectToJson(record: LiveObject) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson<T>(list: LiveList<T>): Array<T> {
  return list.toArray().map(toJson);
}

function mapToJson<TKey extends string, TValue>(
  map: LiveMap<TKey, TValue>
): Array<[string, TValue]> {
  return Array.from(map.entries())
    .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
    .map((entry) => [entry[0], toJson(entry[1])]);
}

function toJson(value: any) {
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
  room: "room-id",
  authEndpoint: "/api/auth",
  throttleDelay: -1, // No throttle for standard storage test
  liveblocksServer: "wss://live.liveblocks.io",
  onError: () => {},
  WebSocketPolyfill: WebSocket
};

async function prepareRoomWithStorage<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0,
  onSend: (messages: ClientMessage[]) => void = () => {}
) {
  const effects = mockEffects();
  (effects.send as jest.MockedFunction<any>).mockImplementation(onSend);

  const state = defaultState({});
  const machine = makeStateMachine(state, defaultContext, effects);
  const ws = new MockWebSocket("");

  machine.connect();
  machine.authenticationSuccess({ actor }, ws as any);
  machine.onOpen();

  const getStoragePromise = machine.getStorage<T>();

  const clonedItems = JSON.parse(JSON.stringify(items));
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
  };
}

export async function prepareIsolatedStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const { machine, storage } = await prepareRoomWithStorage<T>(items, actor);

  return {
    root: storage.root,
    subscribe: machine.subscribe,
    machine,
    assert: (data: any) => expect(objectToJson(storage.root)).toEqual(data),
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
export async function prepareStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const operations: Op[] = [];

  const { machine: refMachine, storage: refStorage } =
    await prepareRoomWithStorage<T>(items, -1);

  let { machine, storage } = await prepareRoomWithStorage<T>(
    items,
    actor,
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
              actor: 0,
            })
          );
        }
      }
    }
  );

  const states: any[] = [];

  function assert(data: any, shouldPushToStates = true) {
    if (shouldPushToStates) {
      states.push(data);
    }
    const json = objectToJson(storage.root);
    expect(json).toEqual(data);
    expect(objectToJson(refStorage.root)).toEqual(data);
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

  async function reconnect(actor: number, newItems: SerializedCrdtWithId[]) {
    machine.connect();
    machine.authenticationSuccess(
      { actor: actor },
      new MockWebSocket("") as any
    );
    machine.onOpen();

    machine.onMessage(
      serverMessage({
        type: ServerMessageType.InitialStorageState,
        items: newItems,
      })
    );
  }

  return {
    machine,
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
  };
}

export async function reconnect(
  machine: Machine,
  actor: number,
  newItems: SerializedCrdtWithId[]
) {
  machine.connect();
  machine.authenticationSuccess({ actor: actor }, new MockWebSocket("") as any);
  machine.onOpen();

  machine.onMessage(
    serverMessage({
      type: ServerMessageType.InitialStorageState,
      items: newItems,
    })
  );
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
  data: any
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

export class MockWebSocket {
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
    this.readyState = WebSocket.CLOSED;
    MockWebSocket.instances.push(this);
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

  close() {}
}

window.WebSocket = MockWebSocket as any;
