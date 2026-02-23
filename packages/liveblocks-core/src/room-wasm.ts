/**
 * WasmRoom: a Room<P,S,U,E,TM,CM> adapter wrapping the Rust RoomHandle.
 *
 * This is the drop-in replacement used when LIVEBLOCKS_ENGINE=wasm.
 * It delegates all CRDT, connection, presence, and event logic to the
 * Rust RoomHandle via wasm-bindgen.
 */

import type { Status } from "./connection";
import type { LsonObject } from "./crdts/Lson";
import type { DCM, DE, DP, DS, DTM, DU } from "./globals/augmentation";
import { kInternal } from "./internal";
import type { Callback } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import type { Json, JsonObject } from "./lib/Json";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { BaseMetadata } from "./protocol/Comments";
import type { Room, RoomConfig, StorageStatus } from "./room";
import type { User } from "./types/User";

// ---- RoomHandle class registration ----

/** Constructor type for the WASM RoomHandle class. */
export type RoomHandleConstructor = new (config: WasmRoomConfig) => RoomHandle;

let _wasmRoomHandleClass: RoomHandleConstructor | null = null;

/**
 * Register the WASM RoomHandle class.
 * Called at startup when LIVEBLOCKS_ENGINE=wasm.
 */
export function _setWasmRoomHandleClass(cls: RoomHandleConstructor): void {
  _wasmRoomHandleClass = cls;
}

/**
 * Get the registered WASM RoomHandle class, or null if not registered.
 */
export function getWasmRoomHandleClass(): RoomHandleConstructor | null {
  return _wasmRoomHandleClass;
}

/** Shape of the WASM RoomHandle exposed via wasm-bindgen */
interface RoomHandle {
  subscribe(eventType: string, callback: (data: unknown) => void): void;
  tick(): void;
  flush(): void;
  getStatus(): string;
  connect(): void;
  disconnect(): void;
  reconnect(): void;
  free(): void;
  getSelf(): unknown;
  getPresence(): unknown;
  getOthers(): unknown[] | null;
  updatePresence(patch: unknown): void;
  updateYdoc(
    data: string,
    guid: string | null,
    isV2: boolean | null
  ): void;
  fetchYdoc(
    stateVector: string,
    guid: string | null,
    isV2: boolean | null
  ): void;
  broadcastEvent(event: unknown): void;
  fetchStorage(): void;
  getStorageStatus(): string;
  batch(fn: () => void): void;
  getActorId(): number | null;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  pauseHistory(): void;
  resumeHistory(): void;
}

/** Config object passed to the WASM RoomHandle constructor */
interface WasmRoomConfig {
  roomId: string;
  baseUrl: string;
  createSocket: (url: string) => unknown;
  publicApiKey: string | null;
  authEndpoint: string | null;
  initialPresence: unknown;
  throttleDelay: number;
  lostConnectionTimeout: number;
}

/**
 * Create a WASM-backed Room that wraps a Rust RoomHandle.
 *
 * The RoomHandleClass is the wasm-bindgen exported RoomHandle class,
 * provided by the WASM engine setup.
 */
export function createWasmRoom<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
>(
  options: { initialPresence: P; initialStorage?: S },
  config: RoomConfig<TM, CM>,
  RoomHandleClass: new (config: WasmRoomConfig) => RoomHandle,
): Room<P, S, U, E, TM, CM> {
  // The Rust RoomHandle expects createSocket(url) -> IWebSocketInstance.
  // The JS delegates use createSocket(authValue) -> IWebSocketInstance.
  // We wrap the JS delegate to accept a URL. The Rust side builds the
  // WebSocket URL from the auth token. The wrapper passes the URL through
  // as a fake auth value that the JS MockWebSocket ignores anyway.
  const createSocketForWasm = (url: string) => {
    const authValue = { type: "secret" as const, token: { raw: url } };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- intentional fake auth value for WASM socket bridge
    return config.delegates.createSocket(authValue as never);
  };

  const handle: RoomHandle = new RoomHandleClass({
    roomId: config.roomId,
    baseUrl: config.baseUrl,
    createSocket: createSocketForWasm,
    // Auth: the Rust side handles auth internally via publicApiKey or authEndpoint
    publicApiKey: null,
    authEndpoint: null,
    initialPresence: options.initialPresence,
    throttleDelay: config.throttleDelay,
    lostConnectionTimeout: config.lostConnectionTimeout,
  });

  // ---- Event sources ----
  const eventSources = {
    status: makeEventSource<Status>(),
    lostConnection: makeEventSource<unknown>(),
    customEvent: makeEventSource<unknown>(),
    self: makeEventSource<User<P, U>>(),
    myPresence: makeEventSource<P>(),
    others: makeEventSource<unknown>(),
    storageBatch: makeEventSource<unknown[]>(),
    history: makeEventSource<{ canUndo: boolean; canRedo: boolean }>(),
    storageDidLoad: makeEventSource<void>(),
    storageStatus: makeEventSource<StorageStatus>(),
    ydoc: makeEventSource<unknown>(),
    comments: makeEventSource<unknown>(),
    roomWillDestroy: makeEventSource<void>(),
  };

  // Subscribe to WASM events and forward to EventSources
  handle.subscribe("status", (data) =>
    eventSources.status.notify(data as Status),
  );
  handle.subscribe("my-presence", (data) =>
    eventSources.myPresence.notify(data as P),
  );
  handle.subscribe("others", (data) => eventSources.others.notify(data));
  handle.subscribe("storage", () => eventSources.storageBatch.notify([]));
  handle.subscribe("storage-loaded", () =>
    eventSources.storageDidLoad.notify(),
  );
  handle.subscribe("storage-status", (data) =>
    eventSources.storageStatus.notify(data as StorageStatus),
  );
  handle.subscribe("event", (data) => eventSources.customEvent.notify(data));
  handle.subscribe("history", (data) =>
    eventSources.history.notify(
      data as { canUndo: boolean; canRedo: boolean },
    ),
  );
  handle.subscribe("lost-connection", (data) =>
    eventSources.lostConnection.notify(data),
  );
  handle.subscribe("ydoc", (data) => eventSources.ydoc.notify(data));

  // ---- Storage promise management ----
  let storagePromise$: Promise<{ root: unknown }> | null = null;
  let storageResolve: ((value: { root: unknown }) => void) | null = null;

  eventSources.storageDidLoad.subscribe(() => {
    if (storageResolve) {
      // TODO: Wire up WasmLiveObject root once RoomHandle exposes
      // CrdtDocumentOwner-like read/write methods. Then:
      //   const owner = createDocumentOwnerFromRoomHandle(handle);
      //   const root = new WasmLiveObject(owner, "root");
      //   storageResolve({ root });
      storageResolve({ root: null });
      storageResolve = null;
    }
  });

  // ---- Subscribe function (overloaded) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Room.subscribe has many overloads
  function subscribe(...args: unknown[]): () => void {
    const firstArg = args[0];

    if (typeof firstArg === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matching Room.subscribe overloads
      const callback = args[1] as Callback<any>;
      switch (firstArg) {
        case "my-presence":
          return eventSources.myPresence.subscribe(callback);
        case "others":
          return eventSources.others.subscribe(callback);
        case "event":
          return eventSources.customEvent.subscribe(callback);
        case "status":
          return eventSources.status.subscribe(callback);
        case "error":
          return () => {}; // TODO
        case "lost-connection":
          return eventSources.lostConnection.subscribe(callback);
        case "history":
          return eventSources.history.subscribe(callback);
        default:
          return () => {};
      }
    }

    if (typeof firstArg === "function") {
      return eventSources.storageBatch.subscribe(() =>
        (firstArg as () => void)(),
      );
    }

    // LiveNode subscribe — TODO
    return () => {};
  }

  // ---- Tick loop management ----
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  const startTickLoop = () => {
    if (tickInterval) return;
    tickInterval = setInterval(() => {
      try {
        handle.tick();
        handle.flush();
      } catch {
        // Ignore errors during tick (handle may be freed)
      }
    }, 16);
  };

  const stopTickLoop = () => {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };

  eventSources.status.subscribe((status) => {
    if (status === "connected") {
      startTickLoop();
    } else if (status === "initial") {
      stopTickLoop();
    }
  });

  const notImplemented = () => Promise.reject(new Error("Not implemented in WASM room"));

  // ---- Build Room object ----
  const room = {
    [kInternal]: {
      presenceBuffer: undefined,
      get undoStack() {
        return [];
      },
      get nodeCount() {
        return 0;
      },
      getYjsProvider: () => undefined,
      setYjsProvider: () => {},
      yjsProviderDidChange: makeEventSource<void>().observable,
      getSelf_forDevTools: () => null,
      getOthers_forDevTools: () => [],
      reportTextEditor: () => Promise.resolve(),
      createTextMention: () => Promise.resolve(),
      deleteTextMention: () => Promise.resolve(),
      listTextVersions: () =>
        Promise.resolve({
          versions: [],
          requestedAt: new Date(),
        }),
      listTextVersionsSince: () =>
        Promise.resolve({
          versions: [],
          requestedAt: new Date(),
        }),
      getTextVersion: () => Promise.resolve(new Response()),
      createTextVersion: () => Promise.resolve(),
      executeContextualPrompt: () => Promise.resolve(""),
      simulate: {
        explicitClose: () => {},
        rawSend: () => {},
      },
      attachmentUrlsStore: {
        get: () => Promise.resolve(""),
        getMany: () => Promise.resolve({}),
      },
    },

    id: config.roomId,

    // Connection
    getStatus: () => handle.getStatus() as Status,
    connect: () => handle.connect(),
    disconnect: () => {
      stopTickLoop();
      handle.disconnect();
    },
    reconnect: () => handle.reconnect(),
    destroy: () => {
      stopTickLoop();
      eventSources.roomWillDestroy.notify();
      handle.disconnect();
      handle.free();
    },

    // Presence
    getSelf: () => handle.getSelf() as User<P, U> | null,
    getPresence: () => handle.getPresence() as P,
    getOthers: () => (handle.getOthers() ?? []) as readonly User<P, U>[],
    updatePresence: (
      patch: Partial<P>,
      _options?: { addToHistory: boolean },
    ) => {
      handle.updatePresence(patch);
    },

    // Yjs
    updateYDoc: (data: string, guid?: string, isV2?: boolean) =>
      handle.updateYdoc(data, guid ?? null, isV2 ?? null),
    fetchYDoc: (stateVector: string, guid?: string, isV2?: boolean) =>
      handle.fetchYdoc(stateVector, guid ?? null, isV2 ?? null),

    // Broadcast
    broadcastEvent: (
      event: E,
      _options?: { shouldQueueEventIfNotReady?: boolean },
    ) => handle.broadcastEvent(event),

    // Storage
    getStorage: () => {
      if (!storagePromise$) {
        storagePromise$ = new Promise((resolve) => {
          storageResolve = resolve;
        });
        handle.fetchStorage();
      }
      return storagePromise$;
    },
    getStorageSnapshot: () => null,
    getStorageStatus: () => handle.getStorageStatus() as StorageStatus,
    batch: <T>(fn: () => T): T => {
      let result!: T;
      handle.batch(() => {
        result = fn();
      });
      return result;
    },

    // Readiness
    isPresenceReady: () => handle.getActorId() !== null,
    isStorageReady: () => handle.getStorageStatus() !== "NotLoaded",
    waitUntilPresenceReady: async () => {
      if (handle.getActorId() !== null) return;
      await new Promise<void>((resolve) => {
        const unsub = eventSources.status.subscribe(() => {
          if (handle.getActorId() !== null) {
            unsub();
            resolve();
          }
        });
      });
    },
    waitUntilStorageReady: async () => {
      if (handle.getStorageStatus() !== "NotLoaded") return;
      await eventSources.storageDidLoad.observable.waitUntil();
    },

    // History
    history: {
      undo: () => handle.undo(),
      redo: () => handle.redo(),
      canUndo: () => handle.canUndo(),
      canRedo: () => handle.canRedo(),
      clear: () => {},
      pause: () => handle.pauseHistory(),
      resume: () => handle.resumeHistory(),
    },

    // Subscribe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- Room.subscribe has complex overloads
    subscribe: subscribe as any,

    // Events
    events: {
      status: eventSources.status.observable,
      lostConnection: eventSources.lostConnection.observable,
      customEvent: eventSources.customEvent.observable,
      self: eventSources.self.observable,
      myPresence: eventSources.myPresence.observable,
      others: eventSources.others.observable,
      storageBatch: eventSources.storageBatch.observable,
      history: eventSources.history.observable,
      storageDidLoad: eventSources.storageDidLoad.observable,
      storageStatus: eventSources.storageStatus.observable,
      ydoc: eventSources.ydoc.observable,
      comments: eventSources.comments.observable,
      roomWillDestroy: eventSources.roomWillDestroy.observable,
    },

    // Comments/Threads — stubs
    getThreads: () =>
      Promise.resolve({
        threads: [],
        inboxNotifications: [],
        subscriptions: [],
        requestedAt: new Date(),
        nextCursor: null,
        permissionHints: {},
      }),
    getThreadsSince: () =>
      Promise.resolve({
        threads: [],
        inboxNotifications: [],
        subscriptions: [],
        requestedAt: new Date(),
        permissionHints: {},
      }),
    getThread: () => Promise.resolve({}),
    createThread: () => notImplemented(),
    deleteThread: () => Promise.resolve(),
    editThreadMetadata: () => notImplemented(),
    markThreadAsResolved: () => Promise.resolve(),
    markThreadAsUnresolved: () => Promise.resolve(),
    subscribeToThread: () => notImplemented(),
    unsubscribeFromThread: () => Promise.resolve(),
    createComment: () => notImplemented(),
    editComment: () => notImplemented(),
    editCommentMetadata: () => notImplemented(),
    deleteComment: () => Promise.resolve(),
    addReaction: () => notImplemented(),
    removeReaction: () => Promise.resolve(),
    prepareAttachment: () => {
      throw new Error("Not implemented in WASM room");
    },
    uploadAttachment: () => notImplemented(),
    getAttachmentUrl: () => notImplemented(),
    getSubscriptionSettings: () => notImplemented(),
    updateSubscriptionSettings: () => notImplemented(),
    markInboxNotificationAsRead: () => Promise.resolve(),
  };

  return room as unknown as Room<P, S, U, E, TM, CM>;
}
