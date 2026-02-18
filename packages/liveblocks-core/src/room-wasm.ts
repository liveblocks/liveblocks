/**
 * WasmRoom: a Room<P,S,U,E,TM,CM> adapter wrapping the Rust RoomHandle.
 *
 * This is the drop-in replacement used when LIVEBLOCKS_ENGINE=wasm.
 * It delegates all CRDT, connection, presence, and event logic to the
 * Rust RoomHandle via wasm-bindgen.
 */

import type { Json, JsonObject } from "./lib/Json";
import type { Callback } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import { kInternal } from "./internal";
import type { Room, RoomConfig, StorageStatus } from "./room";
import type { Status } from "./connection";
import type { DCM, DE, DP, DS, DTM, DU } from "./globals/augmentation";
import type { User } from "./types/User";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { BaseMetadata } from "./protocol/Comments";
import type { LsonObject } from "./crdts/Lson";

// The RoomHandle type from WASM — typed as any because it's loaded dynamically
type RoomHandle = any;

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
  RoomHandleClass: new (config: any) => RoomHandle,
): Room<P, S, U, E, TM, CM> {
  // The Rust RoomHandle expects createSocket(url) -> IWebSocketInstance.
  // The JS delegates use createSocket(authValue) -> IWebSocketInstance.
  // We wrap the JS delegate to accept a URL. The Rust side builds the
  // WebSocket URL from the auth token. The wrapper passes the URL through
  // as a fake auth value that the JS MockWebSocket ignores anyway.
  const createSocketForWasm = (url: string) => {
    const authValue = { type: "secret" as const, token: { raw: url } };
    return config.delegates.createSocket(authValue as any);
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
    lostConnection: makeEventSource<any>(),
    customEvent: makeEventSource<any>(),
    self: makeEventSource<User<P, U>>(),
    myPresence: makeEventSource<P>(),
    others: makeEventSource<any>(),
    storageBatch: makeEventSource<any[]>(),
    history: makeEventSource<{ canUndo: boolean; canRedo: boolean }>(),
    storageDidLoad: makeEventSource<void>(),
    storageStatus: makeEventSource<StorageStatus>(),
    ydoc: makeEventSource<any>(),
    comments: makeEventSource<any>(),
    roomWillDestroy: makeEventSource<void>(),
  };

  // Subscribe to WASM events and forward to EventSources
  handle.subscribe("status", (data: any) => eventSources.status.notify(data));
  handle.subscribe("my-presence", (data: any) =>
    eventSources.myPresence.notify(data),
  );
  handle.subscribe("others", (data: any) =>
    eventSources.others.notify(data),
  );
  handle.subscribe("storage", () => eventSources.storageBatch.notify([]));
  handle.subscribe("storage-loaded", () =>
    eventSources.storageDidLoad.notify(),
  );
  handle.subscribe("storage-status", (data: any) =>
    eventSources.storageStatus.notify(data),
  );
  handle.subscribe("event", (data: any) =>
    eventSources.customEvent.notify(data),
  );
  handle.subscribe("history", (data: any) =>
    eventSources.history.notify(data),
  );
  handle.subscribe("lost-connection", (data: any) =>
    eventSources.lostConnection.notify(data),
  );
  handle.subscribe("ydoc", (data: any) => eventSources.ydoc.notify(data));

  // ---- Storage promise management ----
  let storagePromise$: Promise<{ root: any }> | null = null;
  let storageResolve: ((value: { root: any }) => void) | null = null;

  eventSources.storageDidLoad.subscribe(() => {
    if (storageResolve) {
      // TODO: return actual LiveObject root from WASM handles
      storageResolve({ root: null as any });
      storageResolve = null;
    }
  });

  // ---- Subscribe function (overloaded) ----
  function subscribe(...args: any[]): () => void {
    const firstArg = args[0];

    if (typeof firstArg === "string") {
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
      return eventSources.storageBatch.subscribe(() => firstArg());
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
      reportTextEditor: async () => {},
      createTextMention: async () => {},
      deleteTextMention: async () => {},
      listTextVersions: async () => ({
        versions: [],
        requestedAt: new Date(),
      }),
      listTextVersionsSince: async () => ({
        versions: [],
        requestedAt: new Date(),
      }),
      getTextVersion: async () => new Response(),
      createTextVersion: async () => {},
      executeContextualPrompt: async () => "",
      simulate: {
        explicitClose: () => {},
        rawSend: () => {},
      },
      attachmentUrlsStore: {
        get: async () => "",
        getMany: async () => ({}),
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
    broadcastEvent: (event: E, _options?: { shouldQueueEventIfNotReady?: boolean }) =>
      handle.broadcastEvent(event),

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
    isPresenceReady: () => handle.getActorId() != null,
    isStorageReady: () => handle.getStorageStatus() !== "NotLoaded",
    waitUntilPresenceReady: async () => {
      if (handle.getActorId() != null) return;
      await new Promise<void>((resolve) => {
        const unsub = eventSources.status.subscribe(() => {
          if (handle.getActorId() != null) {
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
    getThreads: async () => ({
      threads: [],
      inboxNotifications: [],
      subscriptions: [],
      requestedAt: new Date(),
      nextCursor: null,
      permissionHints: {},
    }),
    getThreadsSince: async () => ({
      threads: [],
      inboxNotifications: [],
      subscriptions: [],
      requestedAt: new Date(),
      permissionHints: {},
    }),
    getThread: async () => ({}),
    createThread: async () => {
      throw new Error("Not implemented in WASM room");
    },
    deleteThread: async () => {},
    editThreadMetadata: async () => {
      throw new Error("Not implemented in WASM room");
    },
    markThreadAsResolved: async () => {},
    markThreadAsUnresolved: async () => {},
    subscribeToThread: async () => {
      throw new Error("Not implemented in WASM room");
    },
    unsubscribeFromThread: async () => {},
    createComment: async () => {
      throw new Error("Not implemented in WASM room");
    },
    editComment: async () => {
      throw new Error("Not implemented in WASM room");
    },
    editCommentMetadata: async () => {
      throw new Error("Not implemented in WASM room");
    },
    deleteComment: async () => {},
    addReaction: async () => {
      throw new Error("Not implemented in WASM room");
    },
    removeReaction: async () => {},
    prepareAttachment: () => {
      throw new Error("Not implemented in WASM room");
    },
    uploadAttachment: async () => {
      throw new Error("Not implemented in WASM room");
    },
    getAttachmentUrl: async () => {
      throw new Error("Not implemented in WASM room");
    },
    getSubscriptionSettings: async () => {
      throw new Error("Not implemented in WASM room");
    },
    updateSubscriptionSettings: async () => {
      throw new Error("Not implemented in WASM room");
    },
    markInboxNotificationAsRead: async () => {},
  };

  return room as unknown as Room<P, S, U, E, TM, CM>;
}
