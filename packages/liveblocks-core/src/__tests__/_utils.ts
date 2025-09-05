import { expect, onTestFinished } from "vitest";

import { createApiClient } from "../api-client";
import { createAuthManager } from "../auth-manager";
import { DEFAULT_BASE_URL } from "../constants";
import type { LiveObject } from "../crdts/LiveObject";
import type { LsonObject } from "../crdts/Lson";
import type { ToImmutable } from "../crdts/utils";
import { kInternal } from "../internal";
import { makeEventSource } from "../lib/EventSource";
import type { Json, JsonObject } from "../lib/Json";
import { makePosition } from "../lib/position";
import { Signal } from "../lib/signals";
import { deepClone } from "../lib/utils";
import type {
  AccessToken,
  IDToken,
  LegacySecretToken,
} from "../protocol/AuthToken";
import { Permission, TokenKind } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { ClientMsg } from "../protocol/ClientMsg";
import { ClientMsgCode } from "../protocol/ClientMsg";
import type { BaseMetadata } from "../protocol/Comments";
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
import type { Room, RoomConfig, RoomDelegates, SyncSource } from "../room";
import { createRoom } from "../room";
import { WebsocketCloseCodes } from "../types/IWebSocket";
import type { LiveblocksError } from "../types/LiveblocksError";
import {
  ALWAYS_AUTH_WITH_LEGACY_TOKEN,
  defineBehavior,
  SOCKET_AUTOCONNECT_AND_ROOM_STATE,
} from "./_behaviors";
import type { MockWebSocketServer } from "./_MockWebSocketServer";
import { MockWebSocket } from "./_MockWebSocketServer";
import type { JsonStorageUpdate } from "./_updatesUtils";
import { serializeUpdateToJson } from "./_updatesUtils";

export function makeSecretLegacyToken(
  actor: number,
  scopes: string[]
): LegacySecretToken {
  // NOTE: This is not the complete JWT token, but one that has enough fields
  // to we can run the unit tests. The actual full shape of these JWT tokens is
  // defined in the (private) backend in case you're interested, see
  // https://github.com/liveblocks/liveblocks-cloudflare/blob/main/src/security.ts
  return {
    k: TokenKind.SECRET_LEGACY,
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 60, // Valid for 1 minute
    appId: "my-app",
    roomId: "my-room",
    id: "user1",
    actor,
    scopes,
  };
}

export function makeAccessToken(): AccessToken {
  return {
    k: TokenKind.ACCESS_TOKEN,
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 60, // Valid for 1 minute
    pid: "my-app",
    uid: "user1",
    perms: { "my-room": [Permission.Write] },
  };
}

export function makeIDToken(): IDToken {
  return {
    k: TokenKind.ID_TOKEN,
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 60, // Valid for 1 minute
    pid: "my-app",
    uid: "user1",
    gids: ["group1"],
  };
}

// NOTE: we have some instability with opIds in the undo/redo stack and this should be investigated
function deepCloneWithoutOpId<T>(item: T) {
  return JSON.parse(
    JSON.stringify(item),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (key, value) => (key === "opId" ? undefined : value)
  ) as T;
}

export const FIRST_POSITION = makePosition();
export const SECOND_POSITION = makePosition(FIRST_POSITION);
export const THIRD_POSITION = makePosition(SECOND_POSITION);
export const FOURTH_POSITION = makePosition(THIRD_POSITION);
export const FIFTH_POSITION = makePosition(FOURTH_POSITION);

export function makeSyncSource(): SyncSource {
  return {
    setSyncStatus: () => {},
    destroy: () => {},
  };
}

function makeRoomConfig<M extends BaseMetadata>(
  mockedDelegates: RoomDelegates
): RoomConfig<M> {
  return {
    delegates: mockedDelegates,
    roomId: "room-id",
    throttleDelay: -1, // No throttle for standard storage test
    lostConnectionTimeout: 99999, // Don't trigger connection loss events in tests
    polyfills: {
      WebSocket: MockWebSocket,
    },
    baseUrl: DEFAULT_BASE_URL,
    errorEventSource: makeEventSource<LiveblocksError>(),
    enableDebugLogging: false,
    roomHttpClient: createApiClient({
      baseUrl: DEFAULT_BASE_URL,
      fetchPolyfill: globalThis.fetch?.bind(globalThis),
      authManager: createAuthManager({
        authEndpoint: "/api/auth",
      }),
      currentUserId: new Signal<string | undefined>(undefined),
    }),
    // Not used in unit tests (yet)
    createSyncSource: makeSyncSource,
  };
}

/**
 * Sets up a Room instance that auto-connects to a server, but does not yet
 * start loading the initial storage.
 */
export function prepareRoomWithStorage_loadWithDelay<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: S,
  scopes: string[] = ["room:write"],
  delay = 0
) {
  const { wss, delegates } = defineBehavior(
    ALWAYS_AUTH_WITH_LEGACY_TOKEN(actor, scopes),
    SOCKET_AUTOCONNECT_AND_ROOM_STATE(actor, scopes)
  );

  const clonedItems = deepClone(items);
  wss.onConnection((conn) => {
    const sendStorageMsg = () =>
      conn.server.send(
        serverMessage({
          type: ServerMsgCode.INITIAL_STORAGE_STATE,
          items: clonedItems,
        })
      );

    if (delay) {
      setTimeout(() => sendStorageMsg(), delay);
    } else {
      sendStorageMsg();
    }
  });

  const room = createRoom<P, S, U, E, M>(
    {
      initialPresence: {} as P,
      initialStorage: defaultStorage || ({} as S),
    },
    makeRoomConfig(delegates)
  );

  room.connect();
  return { room, wss };
}

/**
 * Sets up a Room instance that auto-connects to a server. It will receive the
 * given initial storage items from the server. It awaits until storage has
 * loaded.
 */
export async function prepareRoomWithStorage<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: S,
  scopes: string[] = ["room:write"]
) {
  const { room, wss } = prepareRoomWithStorage_loadWithDelay<P, S, U, E, M>(
    items,
    actor,
    defaultStorage,
    scopes
  );

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
export async function prepareIsolatedStorageTest<S extends LsonObject>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  defaultStorage?: S
) {
  const { room, storage, wss } = await prepareRoomWithStorage<
    never,
    S,
    never,
    never,
    never
  >(items, actor, defaultStorage || ({} as S));

  return {
    root: storage.root,
    room,
    wss,

    expectStorage: (data: ToImmutable<S>) =>
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
  S extends LsonObject,
  P extends JsonObject = never,
  U extends BaseUserMeta = never,
  E extends Json = never,
  M extends BaseMetadata = never,
>(
  items: IdTuple<SerializedCrdt>[],
  actor: number = 0,
  scopes: string[] = ["room:write"]
) {
  let currentActor = actor;
  const operations: Op[] = [];

  const ref = await prepareRoomWithStorage<P, S, U, E, M>(
    items,
    -1,
    undefined,
    scopes
  );

  const subject = await prepareRoomWithStorage<P, S, U, E, M>(
    items,
    currentActor,
    undefined,
    scopes
  );

  onTestFinished(
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
    })
  );

  // Mock Server messages for Presence

  // Machine is the first user connected to the room, it then receives a server message
  // saying that the refRoom user joined the room.
  subject.wss.last.send(
    serverMessage({
      type: ServerMsgCode.USER_JOINED,
      actor: -1,
      id: undefined,
      info: undefined,
      scopes: ["room:write"],
    })
  );

  // RefRoom is the second user connected to the room, it receives a server message
  // ROOM_STATE with the list of users in the room.
  ref.wss.last.send(
    serverMessage({
      type: ServerMsgCode.ROOM_STATE,
      actor: currentActor,
      nonce: `nonce-for-actor-${currentActor}`,
      scopes,
      users: { [currentActor]: { scopes: ["room:write"] } },
    })
  );

  const states: ToImmutable<S>[] = [];

  function expectBothClientStoragesToEqual(data: ToImmutable<S>) {
    expect(subject.storage.root.toImmutable()).toEqual(data);
    expect(ref.storage.root.toImmutable()).toEqual(data);
    expect(subject.room[kInternal].nodeCount).toBe(
      ref.room[kInternal].nodeCount
    );
  }

  function expectStorage(data: ToImmutable<S>) {
    states.push(data);
    expectBothClientStoragesToEqual(data);
  }

  function assertUndoRedo() {
    // this is what the last undo item looked like before we undo

    const before = deepCloneWithoutOpId(
      subject.room[kInternal].undoStack[
        subject.room[kInternal].undoStack.length - 1
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
      subject.room[kInternal].undoStack[
        subject.room[kInternal].undoStack.length - 1
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
          scopes: ["room:write"],
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
  S extends LsonObject,
  P extends JsonObject = never,
  U extends BaseUserMeta = never,
  E extends Json = never,
  M extends BaseMetadata = never,
>(
  items: IdTuple<SerializedCrdt>[]
): Promise<{
  room: Room<P, S, U, E, M>;
  root: LiveObject<S>;
  expectUpdates: (updates: JsonStorageUpdate[][]) => void;
}> {
  const ref = await prepareRoomWithStorage(items, -1);
  const subject = await prepareRoomWithStorage<P, S, U, E, M>(items, -2);

  onTestFinished(
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
    })
  );

  const jsonUpdates: JsonStorageUpdate[][] = [];
  const refJsonUpdates: JsonStorageUpdate[][] = [];

  onTestFinished(
    subject.room.events.storageBatch.subscribe((updates) =>
      jsonUpdates.push(updates.map(serializeUpdateToJson))
    )
  );
  onTestFinished(
    ref.room.events.storageBatch.subscribe((updates) =>
      refJsonUpdates.push(updates.map(serializeUpdateToJson))
    )
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
  S extends LsonObject,
  P extends JsonObject = never,
  U extends BaseUserMeta = never,
  E extends Json = never,
  M extends BaseMetadata = never,
>(items: IdTuple<SerializedCrdt>[]) {
  const { storage, room } = await prepareRoomWithStorage<P, S, U, E, M>(
    items,
    -1
  );

  const receivedUpdates: JsonStorageUpdate[][] = [];

  onTestFinished(
    room.subscribe(
      storage.root,
      (updates) => receivedUpdates.push(updates.map(serializeUpdateToJson)),
      { isDeep: true }
    )
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
