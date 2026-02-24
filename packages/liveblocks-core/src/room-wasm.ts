/**
 * WasmRoom: a Room<P,S,U,E,TM,CM> adapter wrapping the Rust RoomHandle.
 *
 * This is the drop-in replacement used when LIVEBLOCKS_ENGINE=wasm.
 * It delegates all CRDT, connection, presence, and event logic to the
 * Rust RoomHandle via wasm-bindgen.
 */

import type { Status } from "./connection";
import type { CrdtDocumentOwner, CrdtEntry } from "./crdts/impl-selector";
import type { Lson, LsonObject } from "./crdts/Lson";
import { _registerWasmLiveTypes, resolveEntry } from "./crdts/wasm-live-helpers";
import { WasmLiveList } from "./crdts/WasmLiveList";
import { WasmLiveMap } from "./crdts/WasmLiveMap";
import { WasmLiveObject } from "./crdts/WasmLiveObject";

// Register WasmLive* constructors so resolveEntry() can wrap child nodes.
_registerWasmLiveTypes(WasmLiveObject, WasmLiveList, WasmLiveMap);
import type { DCM, DE, DP, DS, DTM, DU } from "./globals/augmentation";
import { kInternal } from "./internal";
import { nn } from "./lib/assert";
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
  clearHistory(): void;
  getUndoStack(): unknown[][];
  canWriteStorage(): boolean;

  // -- Document read API --
  getNodeCount(): number;
  getRootNodeId(): string | null;
  getNodeType(nodeId: string): string | undefined;
  getParentInfo(nodeId: string): { parentId: string; parentKey: string } | undefined;
  objectGetEntry(nodeId: string, key: string): unknown;
  objectKeys(nodeId: string): string[];
  objectEntries(nodeId: string): [string, unknown][];
  objectToImmutable(nodeId: string): unknown;
  listLength(nodeId: string): number;
  listGetEntry(nodeId: string, index: number): unknown;
  listEntries(nodeId: string): unknown[];
  listToImmutable(nodeId: string): unknown;
  mapGetEntry(nodeId: string, key: string): unknown;
  mapHas(nodeId: string, key: string): boolean;
  mapSize(nodeId: string): number;
  mapKeys(nodeId: string): string[];
  mapEntries(nodeId: string): [string, unknown][];
  mapToImmutable(nodeId: string): unknown;

  // -- Document write API --
  objectUpdate(nodeId: string, data: unknown): void;
  objectDelete(nodeId: string, key: string): void;
  listPush(nodeId: string, value: unknown): void;
  listInsert(nodeId: string, value: unknown, index: number): void;
  listMove(nodeId: string, from: number, to: number): void;
  listDelete(nodeId: string, index: number): void;
  listSet(nodeId: string, index: number, value: unknown): void;
  listClear(nodeId: string): void;
  mapSet(nodeId: string, key: string, value: unknown): void;
  mapDelete(nodeId: string, key: string): void;
  drainEvents(): void;
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
  // We bridge by parsing the Rust URL to extract auth params (tok/pubkey)
  // and passing the correct AuthValue to the JS delegate, which constructs
  // its own URL from baseUrl/roomId using the right protocol version (/v8).
  //
  // Auto-tick: When a message arrives on the WebSocket, we need to process
  // it synchronously (like the JS room does). The Rust connector pushes
  // messages into a channel that's drained on tick(). We wrap the socket's
  // addEventListener to auto-tick after each "message" event, ensuring the
  // channel is drained and the message is dispatched immediately.
  let handleRef: RoomHandle | null = null;
  let isDestroyed = false;
  // Re-entrancy guard: prevents nested tick/flush calls (which would cause
  // a Rust borrow_mut panic). When a message arrives during flush() — e.g.
  // a mock server ACK loopback — we defer the tick to a microtask.
  let tickInProgress = false;
  // Late-bound callback invoked after each auto-tick cycle to check
  // storage status transitions (set once checkStorageStatusTransition exists).
  let postTickHook: (() => void) | null = null;
  function autoTick(): void {
    if (!handleRef) return;
    if (tickInProgress) {
      // Defer: a tick is already in progress (we're inside flush() which
      // triggered a WebSocket send → mock loopback → onmessage → here).
      queueMicrotask(() => autoTick());
      return;
    }
    tickInProgress = true;
    try {
      handleRef.tick();
      handleRef.flush();
    } catch {
      // Handle may be freed
    } finally {
      tickInProgress = false;
    }
    // After tick completes, check for storage status changes (e.g. ACK
    // processed → unacked ops cleared → status becomes "synchronized").
    postTickHook?.();
  }

  const createSocketForWasm = (url: string) => {
    // The Rust side constructs a full WebSocket URL including auth params.
    // However, the JS delegate (createSocket) expects an AuthValue and
    // constructs its own URL from baseUrl/roomId. We parse the Rust URL
    // to extract auth params (tok or pubkey) and pass the correct AuthValue.
    let authValue: { type: "secret"; token: { raw: string } } | { type: "public"; publicApiKey: string };
    try {
      const parsed = new URL(url);
      const tok = parsed.searchParams.get("tok");
      const pubkey = parsed.searchParams.get("pubkey");
      if (tok) {
        authValue = { type: "secret", token: { raw: tok } };
      } else if (pubkey) {
        authValue = { type: "public", publicApiKey: pubkey };
      } else {
        authValue = { type: "secret", token: { raw: url } };
      }
    } catch {
      authValue = { type: "secret", token: { raw: url } };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- bridge between Rust URL and JS AuthValue
    const socket = config.delegates.createSocket(authValue as never);

    // Intercept addEventListener to wrap "message" callbacks with auto-tick
    const ws = socket as unknown as {
      addEventListener: (
        type: string,
        callback: (event: unknown) => void
      ) => void;
    };
    const origAddEventListener = ws.addEventListener.bind(ws);
    ws.addEventListener = (
      type: string,
      callback: (event: unknown) => void
    ) => {
      if (type === "message") {
        origAddEventListener(type, (event: unknown) => {
          callback(event); // Pushes WsEvent into the mpsc channel
          // Immediately drain the channel and process the event
          autoTick();
        });
      } else if (type === "close") {
        origAddEventListener(type, (event: unknown) => {
          callback(event); // Pushes WsEvent (Close) into the mpsc channel
          // Immediately drain the channel and process the close event.
          // The Rust FSM will schedule a reconnect timer. When the timer
          // fires, the wake callback (set on managed_socket.on_deferred_event)
          // will process the reconnect asynchronously, including a yield
          // to let the MockWebSocket's initFn fire before events are emitted.
          autoTick();
        });
      } else {
        origAddEventListener(type, callback);
      }
    };

    return socket;
  };

  const handle: RoomHandle = new RoomHandleClass({
    roomId: config.roomId,
    baseUrl: config.baseUrl,
    createSocket: createSocketForWasm,
    // Pass through auth config from the client. When a publicApiKey is
    // provided, the Rust auth flow succeeds immediately (PublicKey variant
    // emits AuthSuccess without any HTTP request). Falls back to "pk_wasm"
    // only when no auth info is available (e.g. unit tests with mocked
    // delegates that handle auth externally).
    publicApiKey: config.publicApiKey ?? "pk_wasm",
    authEndpoint: config.authEndpoint ?? null,
    initialPresence: options.initialPresence,
    throttleDelay: config.throttleDelay,
    lostConnectionTimeout: config.lostConnectionTimeout,
  });
  handleRef = handle;

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
  handle.subscribe("others", (data) => {
    // Wrap in OthersEvent shape: { type, others }
    const othersArray = (data ?? []) as readonly unknown[];
    eventSources.others.notify({ type: "reset", others: othersArray });
  });
  // Counter: how many StorageChanged events from local mutations to suppress.
  // Local mutations fire their own detailed StorageUpdate[] via flushUpdates().
  // The Rust side also queues StorageChanged events for those same mutations.
  // We use this counter to skip Rust events that correspond to local mutations.
  let localStorageEventsPending = 0;
  // When the Rust side fires a StorageChanged event with detailed updates,
  // save them here so undo/redo can forward them to the batch notification.
  let lastRustStorageUpdates: RustStorageUpdate[] | null = null;

  handle.subscribe("storage", (data) => {
    const rustUpdates = data as RustStorageUpdate[] | undefined;
    if (rustUpdates && rustUpdates.length > 0) {
      lastRustStorageUpdates = rustUpdates;
    } else {
      lastRustStorageUpdates = null;
    }

    if (localStorageEventsPending > 0) {
      localStorageEventsPending--;
    } else {
      // Remote storage change — convert Rust updates to JS StorageUpdate format
      if (lastRustStorageUpdates) {
        const jsUpdates = convertRustUpdates(lastRustStorageUpdates);
        eventSources.storageBatch.notify(jsUpdates);
      } else {
        eventSources.storageBatch.notify([]);
      }
    }
    // Check if storage status changed (e.g. ACK processed → synchronized)
    // Defer to microtask to avoid re-entrant borrow (this callback runs during fire_pending_events)
    void Promise.resolve().then(() => checkStorageStatusTransition());
  });
  handle.subscribe("storage-loaded", () =>
    eventSources.storageDidLoad.notify(),
  );
  handle.subscribe("storage-status", (_data) => {
    // Use the computed status (which checks unacked ops) instead of the
    // raw Rust status. This ensures that "loaded" is reported as
    // "synchronizing" when there are still unacked local ops pending.
    const computed = handle.getStorageStatus() as StorageStatus;
    if (computed !== lastStorageStatus) {
      lastStorageStatus = computed;
      eventSources.storageStatus.notify(computed);
    }
  });
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

  // Batch depth tracker — when > 0, we're inside a batch() call and
  // storage notifications are deferred until the batch completes.
  let batchDepth = 0;

  function assertCanWriteStorage(): void {
    if (!handle.canWriteStorage()) {
      throw new Error(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    }
  }

  // Track last-known storage status to detect transitions
  let lastStorageStatus: string = "not-loaded";

  /** Check if storage status changed after a mutation and fire event if so. */
  function checkStorageStatusTransition(): void {
    const current = handle.getStorageStatus();
    if (current !== lastStorageStatus) {
      lastStorageStatus = current;
      eventSources.storageStatus.notify(current as StorageStatus);
    }
  }

  // Wire up the post-tick hook now that checkStorageStatusTransition exists.
  postTickHook = checkStorageStatusTransition;

  // ---- Rust StorageUpdate conversion ----
  // Rust serializes StorageUpdate with serde, using slightly different names.
  // We convert to the JS format expected by subscribers.

  interface RustUpdateDelta {
    type: "set" | "delete";
    oldValue?: unknown;
    newValue?: unknown;
    deletedId?: string;
  }

  interface RustStorageUpdate {
    type: "liveObjectUpdate" | "liveListUpdate" | "liveMapUpdate";
    nodeId: string;
    updates: Record<string, RustUpdateDelta> | RustListUpdateEntry[];
  }

  interface RustListUpdateEntry {
    type: "set" | "delete" | "move" | "insert";
    index?: number;
    previousIndex?: number;
    newIndex?: number;
    oldValue?: unknown;
    newValue?: unknown;
    value?: unknown;
  }

  function convertRustDelta(delta: RustUpdateDelta): { type: string; deletedItem?: unknown } {
    if (delta.type === "delete") {
      return { type: "delete", deletedItem: delta.oldValue ?? null };
    }
    return { type: "update" };
  }

  function convertRustListEntry(entry: RustListUpdateEntry): {
    type: string;
    index: number;
    item?: unknown;
    deletedItem?: unknown;
    previousIndex?: number;
  } {
    switch (entry.type) {
      case "set":
        return { type: "set", index: nn(entry.index), item: entry.newValue };
      case "delete":
        return { type: "delete", index: nn(entry.index), deletedItem: entry.oldValue };
      case "move":
        return { type: "move", index: nn(entry.newIndex), previousIndex: entry.previousIndex, item: entry.value };
      case "insert":
        return { type: "insert", index: nn(entry.index), item: entry.value };
      default:
        return { type: entry.type, index: entry.index ?? 0 };
    }
  }

  function convertRustUpdates(rustUpdates: RustStorageUpdate[]): StorageUpdate[] {
    return rustUpdates.map((ru) => {
      const nodeId = ru.nodeId;
      switch (ru.type) {
        case "liveObjectUpdate": {
          const deltas: Record<string, { type: string; deletedItem?: unknown }> = {};
          for (const [key, delta] of Object.entries(ru.updates as Record<string, RustUpdateDelta>)) {
            deltas[key] = convertRustDelta(delta);
          }
          return {
            type: "LiveObject" as const,
            node: createLiveNode(nodeId),
            updates: deltas,
          };
        }
        case "liveListUpdate": {
          const rawEntries = (ru.updates as RustListUpdateEntry[]).map(convertRustListEntry);
          // Coalesce adjacent delete+insert at same index into "set"
          const entries: typeof rawEntries = [];
          for (let i = 0; i < rawEntries.length; i++) {
            const curr = rawEntries[i];
            const next = rawEntries[i + 1];
            if (
              curr.type === "delete" &&
              next?.type === "insert" &&
              curr.index === next.index
            ) {
              entries.push({ type: "set", index: curr.index, item: next.item });
              i++; // skip the insert
            } else {
              entries.push(curr);
            }
          }
          // Refresh insert/set items with live node wrappers so downstream
          // serialization reads current state (not stale intermediate values).
          for (const entry of entries) {
            if ((entry.type === "insert" || entry.type === "set") && entry.item !== null) {
              const liveEntry = handle.listGetEntry(nodeId, entry.index) as Record<string, unknown> | undefined;
              if (liveEntry?.type === "node") {
                entry.item = resolveEntry(ownerAdapter, liveEntry as CrdtEntry);
              }
            }
          }
          return {
            type: "LiveList" as const,
            node: createLiveNode(nodeId),
            updates: entries,
          };
        }
        case "liveMapUpdate": {
          const deltas: Record<string, { type: string; deletedItem?: unknown }> = {};
          for (const [key, delta] of Object.entries(ru.updates as Record<string, RustUpdateDelta>)) {
            deltas[key] = convertRustDelta(delta);
          }
          return {
            type: "LiveMap" as const,
            node: createLiveNode(nodeId),
            updates: deltas,
          };
        }
      }
    });
  }

  /**
   * Coalesce undo/redo updates:
   * 1. Filter out updates for detached nodes (no longer in document).
   * 2. When a list insert/set includes a child node, remove separate
   *    LiveObject/LiveMap updates targeting that child or its descendants
   *    (the child's live wrapper captures final state already).
   */
  function coalesceUndoRedoUpdates(updates: StorageUpdate[]): StorageUpdate[] {
    // Collect nodeIds (and descendants) that appear as items in list inserts/sets
    const coveredNodeIds = new Set<string>();
    for (const u of updates) {
      if (u.type === "LiveList") {
        const listUpdates = u.updates as Array<{ type: string; item?: unknown }>;
        for (const entry of listUpdates) {
          if (entry.type === "insert" || entry.type === "set") {
            const item = entry.item;
            if (item !== null && typeof item === "object" && "_nodeId" in (item as Record<string, unknown>)) {
              coveredNodeIds.add((item as { _nodeId: string })._nodeId);
            }
          }
        }
      }
    }

    return updates.filter((u) => {
      const node = u.node as Record<string, unknown> | null;
      if (node && "_nodeId" in node) {
        const nid = node._nodeId as string;
        // Detached node — stale update
        if (handle.getNodeType(nid) === undefined) return false;
        // Node is a child covered by a list insert/set — redundant
        if (coveredNodeIds.has(nid)) return false;
      }
      return true;
    });
  }

  // ---- StorageUpdate tracking ----
  // Each write method builds a StorageUpdate and accumulates it here.
  // At the end of a mutation (or batch), we flush all pending updates
  // via storageBatch.notify(updates).

  interface StorageUpdate {
    type: "LiveObject" | "LiveList" | "LiveMap";
    node: unknown;
    updates: unknown;
  }

  // Pending updates keyed by nodeId — merged when same node is mutated multiple times
  const pendingUpdatesByNode = new Map<string, StorageUpdate>();
  // Ordered list of nodeIds to preserve insertion order for the final array
  const pendingUpdateOrder: string[] = [];

  function createLiveNode(nodeId: string): unknown {
    const nodeType = handle.getNodeType(nodeId);
    switch (nodeType) {
      case "LiveObject":
        return new WasmLiveObject(ownerAdapter, nodeId);
      case "LiveList":
        return new WasmLiveList(ownerAdapter, nodeId);
      case "LiveMap":
        return new WasmLiveMap(ownerAdapter, nodeId);
      default:
        return new WasmLiveObject(ownerAdapter, nodeId);
    }
  }

  function addObjectUpdate(
    nodeId: string,
    deltas: Record<string, { type: string; deletedItem?: Lson }>
  ): void {
    const existing = pendingUpdatesByNode.get(nodeId);
    if (existing && existing.type === "LiveObject") {
      Object.assign(
        existing.updates as Record<string, unknown>,
        deltas
      );
    } else {
      pendingUpdatesByNode.set(nodeId, {
        type: "LiveObject",
        node: createLiveNode(nodeId),
        updates: { ...deltas },
      });
      pendingUpdateOrder.push(nodeId);
    }
  }

  function addListUpdate(
    nodeId: string,
    delta: {
      type: string;
      index: number;
      item?: Lson;
      deletedItem?: Lson;
      previousIndex?: number;
    }
  ): void {
    const existing = pendingUpdatesByNode.get(nodeId);
    if (existing && existing.type === "LiveList") {
      (existing.updates as unknown[]).push(delta);
    } else {
      pendingUpdatesByNode.set(nodeId, {
        type: "LiveList",
        node: createLiveNode(nodeId),
        updates: [delta],
      });
      pendingUpdateOrder.push(nodeId);
    }
  }

  function addMapUpdate(
    nodeId: string,
    deltas: Record<string, { type: string; deletedItem?: Lson }>
  ): void {
    const existing = pendingUpdatesByNode.get(nodeId);
    if (existing && existing.type === "LiveMap") {
      Object.assign(
        existing.updates as Record<string, unknown>,
        deltas
      );
    } else {
      pendingUpdatesByNode.set(nodeId, {
        type: "LiveMap",
        node: createLiveNode(nodeId),
        updates: { ...deltas },
      });
      pendingUpdateOrder.push(nodeId);
    }
  }

  /** Remove pending updates for a node that has been replaced/detached. */
  function discardPendingUpdatesForNode(nodeId: string): void {
    pendingUpdatesByNode.delete(nodeId);
    // Also remove from pendingUpdateOrder (filter in-place)
    for (let i = pendingUpdateOrder.length - 1; i >= 0; i--) {
      if (pendingUpdateOrder[i] === nodeId) {
        pendingUpdateOrder.splice(i, 1);
      }
    }
  }

  function flushUpdates(): void {
    if (pendingUpdatesByNode.size === 0) return;
    // Build ordered array preserving insertion order
    const updates: StorageUpdate[] = [];
    const seen = new Set<string>();
    for (const nodeId of pendingUpdateOrder) {
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);
      const u = pendingUpdatesByNode.get(nodeId);
      if (u) updates.push(u);
    }
    pendingUpdatesByNode.clear();
    pendingUpdateOrder.length = 0;

    eventSources.storageBatch.notify(updates);
  }

  /**
   * Get the nodeId from a StorageUpdate's node field.
   */
  function getUpdateNodeId(update: StorageUpdate): string | null {
    const node = update.node;
    if (
      node !== null &&
      typeof node === "object" &&
      "_nodeId" in (node as Record<string, unknown>)
    ) {
      return (node as { _nodeId: string })._nodeId;
    }
    return null;
  }

  /**
   * Check if a StorageUpdate affects a subscribed node (itself or descendant).
   */
  function isUpdateAffecting(
    update: StorageUpdate,
    subscribedNodeId: string
  ): boolean {
    const updateNodeId = getUpdateNodeId(update);
    if (!updateNodeId) return false;
    if (updateNodeId === subscribedNodeId) return true;
    // Walk up from the update's node to see if subscribedNodeId is an ancestor
    let current: string | undefined = updateNodeId;
    while (current) {
      const parentInfo = handle.getParentInfo(current) as
        | { parentId: string }
        | undefined;
      if (!parentInfo) break;
      if (parentInfo.parentId === subscribedNodeId) return true;
      current = parentInfo.parentId;
    }
    return false;
  }

  // ---- CrdtDocumentOwner adapter ----
  // The WasmLive* types expect a CrdtDocumentOwner. We create a thin adapter
  // that delegates read/write calls to the RoomHandle (which routes to the
  // Rust Document). Methods not needed by WasmLive* throw on use.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- adding _roomId for WasmLive* types
  const ownerAdapter: CrdtDocumentOwner & { _roomId: string } = {
    _roomId: config.roomId,
    // Read delegation
    objectGetEntry: (nodeId, key) =>
      handle.objectGetEntry(nodeId, key) as CrdtEntry | undefined,
    objectKeys: (nodeId) => handle.objectKeys(nodeId),
    objectEntries: (nodeId) =>
      handle.objectEntries(nodeId) as [string, CrdtEntry][],
    objectToImmutable: (nodeId) => handle.objectToImmutable(nodeId),
    listLength: (nodeId) => handle.listLength(nodeId),
    listGetEntry: (nodeId, index) =>
      handle.listGetEntry(nodeId, index) as CrdtEntry | undefined,
    listEntries: (nodeId) => handle.listEntries(nodeId) as CrdtEntry[],
    listToImmutable: (nodeId) => handle.listToImmutable(nodeId),
    mapGetEntry: (nodeId, key) =>
      handle.mapGetEntry(nodeId, key) as CrdtEntry | undefined,
    mapHas: (nodeId, key) => handle.mapHas(nodeId, key),
    mapSize: (nodeId) => handle.mapSize(nodeId),
    mapKeys: (nodeId) => handle.mapKeys(nodeId),
    mapEntries: (nodeId) =>
      handle.mapEntries(nodeId) as [string, CrdtEntry][],
    mapToImmutable: (nodeId) => handle.mapToImmutable(nodeId),
    getNodeType: (nodeId) => handle.getNodeType(nodeId),
    getParentInfo: (nodeId) =>
      handle.getParentInfo(nodeId) as
        | { parentId: string; parentKey: string }
        | undefined,

    // Write delegation — auto-flush after each mutation, build StorageUpdate
    // objects, and notify storage subscribers synchronously (matching JS room behavior).
    objectUpdate: (nodeId, data) => {
      assertCanWriteStorage();
      const dataObj = data as Record<string, unknown>;
      const deltas: Record<string, { type: string }> = {};
      for (const key of Object.keys(dataObj)) {
        deltas[key] = { type: "update" };
      }
      localStorageEventsPending++;
      handle.objectUpdate(nodeId, data);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      addObjectUpdate(nodeId, deltas);
      if (!batchDepth) flushUpdates();
    },
    objectDelete: (nodeId, key) => {
      assertCanWriteStorage();
      // Capture old value before deleting
      const entry = handle.objectGetEntry(nodeId, key);
      const oldValue = entry
        ? resolveEntry(ownerAdapter, entry as CrdtEntry)
        : undefined;
      const deleted = handle.objectDelete(nodeId, key);
      if (deleted) {
        localStorageEventsPending++;
        if (!batchDepth) {
          handle.flush();
          checkStorageStatusTransition();
        }
        const delta: { type: string; deletedItem?: Lson } = oldValue !== undefined
          ? { type: "delete", deletedItem: oldValue }
          : { type: "delete" };
        addObjectUpdate(nodeId, { [key]: delta });
        if (!batchDepth) flushUpdates();
      }
    },
    listPush: (nodeId, value) => {
      assertCanWriteStorage();
      const index = handle.listLength(nodeId);
      localStorageEventsPending++;
      handle.listPush(nodeId, value);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      const entry = handle.listGetEntry(nodeId, index);
      const item = entry
        ? resolveEntry(ownerAdapter, entry as CrdtEntry)
        : (value as Lson);
      addListUpdate(nodeId, { type: "insert", index, item });
      if (!batchDepth) flushUpdates();
    },
    listInsert: (nodeId, value, index) => {
      assertCanWriteStorage();
      localStorageEventsPending++;
      handle.listInsert(nodeId, value, index);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      const entry = handle.listGetEntry(nodeId, index);
      const item = entry
        ? resolveEntry(ownerAdapter, entry as CrdtEntry)
        : (value as Lson);
      addListUpdate(nodeId, { type: "insert", index, item });
      if (!batchDepth) flushUpdates();
    },
    listMove: (nodeId, from, to) => {
      assertCanWriteStorage();
      const entryBefore = handle.listGetEntry(nodeId, from);
      const item = entryBefore
        ? resolveEntry(ownerAdapter, entryBefore as CrdtEntry)
        : undefined;
      localStorageEventsPending++;
      handle.listMove(nodeId, from, to);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      addListUpdate(nodeId, {
        type: "move",
        index: to,
        previousIndex: from,
        item: item as Lson,
      });
      if (!batchDepth) flushUpdates();
    },
    listDelete: (nodeId, index) => {
      assertCanWriteStorage();
      const entryBefore = handle.listGetEntry(nodeId, index);
      const deletedItem = entryBefore
        ? resolveEntry(ownerAdapter, entryBefore as CrdtEntry)
        : undefined;
      localStorageEventsPending++;
      handle.listDelete(nodeId, index);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      addListUpdate(nodeId, {
        type: "delete",
        index,
        deletedItem: deletedItem as Lson,
      });
      if (!batchDepth) flushUpdates();
    },
    listSet: (nodeId, index, value) => {
      assertCanWriteStorage();
      // Capture old entry before replacing — we'll discard its pending updates
      const oldEntry = handle.listGetEntry(nodeId, index) as Record<string, unknown> | undefined;
      const oldNodeId = oldEntry?.type === "node" ? (oldEntry.nodeId as string) : undefined;
      localStorageEventsPending++;
      handle.listSet(nodeId, index, value);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      // Discard pending updates for the replaced node (it's now detached)
      if (oldNodeId) {
        discardPendingUpdatesForNode(oldNodeId);
      }
      const entry = handle.listGetEntry(nodeId, index);
      const item = entry
        ? resolveEntry(ownerAdapter, entry as CrdtEntry)
        : (value as Lson);
      addListUpdate(nodeId, { type: "set", index, item });
      if (!batchDepth) flushUpdates();
    },
    listClear: (nodeId) => {
      assertCanWriteStorage();
      const len = handle.listLength(nodeId);
      const items: Lson[] = [];
      for (let i = 0; i < len; i++) {
        const entry = handle.listGetEntry(nodeId, i);
        items.push(
          entry
            ? resolveEntry(ownerAdapter, entry as CrdtEntry)
            : (undefined as unknown as Lson)
        );
      }
      localStorageEventsPending++;
      handle.listClear(nodeId);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      for (const deletedItem of items) {
        addListUpdate(nodeId, { type: "delete", index: 0, deletedItem });
      }
      if (!batchDepth) flushUpdates();
    },
    mapSet: (nodeId, key, value) => {
      assertCanWriteStorage();
      localStorageEventsPending++;
      handle.mapSet(nodeId, key, value);
      if (!batchDepth) {
        handle.flush();
        checkStorageStatusTransition();
      }
      addMapUpdate(nodeId, { [key]: { type: "update" } });
      if (!batchDepth) flushUpdates();
    },
    mapDelete: (nodeId, key) => {
      assertCanWriteStorage();
      const deleted = handle.mapDelete(nodeId, key);
      if (deleted) {
        localStorageEventsPending++;
        if (!batchDepth) {
          handle.flush();
          checkStorageStatusTransition();
        }
        addMapUpdate(nodeId, { [key]: { type: "delete" } });
        if (!batchDepth) flushUpdates();
      }
    },

    // CrdtDocumentShadow methods — handled internally by Rust Room
    initFromItems: () => {
      throw new Error("initFromItems: managed by Rust Room");
    },
    applyOp: () => {
      throw new Error("applyOp: managed by Rust Room");
    },
    applyOps: () => {
      throw new Error("applyOps: managed by Rust Room");
    },
    diffAgainstSnapshot: () => {
      throw new Error("diffAgainstSnapshot: managed by Rust Room");
    },
    setConnectionId: () => {
      throw new Error("setConnectionId: managed by Rust Room");
    },
    applyOpOwned: () => {
      throw new Error("applyOpOwned: managed by Rust Room");
    },
    generateId: () => {
      throw new Error("generateId: managed by Rust Room");
    },
    generateOpId: () => {
      throw new Error("generateOpId: managed by Rust Room");
    },
    setNodeClock: () => {
      throw new Error("setNodeClock: managed by Rust Room");
    },
    setOpClock: () => {
      throw new Error("setOpClock: managed by Rust Room");
    },
    free: () => {
      // No-op: the RoomHandle owns the memory
    },
  };

  // ---- Storage promise management ----
  let storagePromise$: Promise<{ root: unknown }> | null = null;
  let storageResolve: ((value: { root: unknown }) => void) | null = null;
  let storageReadyPromise$: Promise<void> | null = null;

  eventSources.storageDidLoad.subscribe(() => {
    if (storageResolve) {
      const rootId = handle.getRootNodeId();
      if (rootId) {
        const root = new WasmLiveObject(ownerAdapter, rootId);

        // Populate missing top-level keys using initialStorage (matches JS room behavior).
        // We defer to a microtask because this callback fires during fire_pending_events()
        // which holds a borrow on Rust state — mutations would cause a re-entrant borrow panic.
        if (options.initialStorage && Object.keys(options.initialStorage).length > 0) {
          const resolve = storageResolve;
          storageResolve = null;
          void Promise.resolve().then(() => {
            const canWrite = handle.canWriteStorage();
            for (const key in options.initialStorage) {
              if (root.get(key) === undefined && canWrite) {
                root.set(key, options.initialStorage[key] as Lson);
              }
            }
            handle.flush();
            // Clear undo stack — initial storage population shouldn't be undoable
            handle.clearHistory();
            resolve({ root });
          });
        } else {
          storageResolve({ root });
          storageResolve = null;
        }
      } else {
        storageResolve({ root: null });
        storageResolve = null;
      }
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
      // Generic storage subscribe — callback receives StorageUpdate[]
      return eventSources.storageBatch.subscribe(
        (updates) => (firstArg as (updates: unknown[]) => void)(updates),
      );
    }

    // LiveNode subscribe — when a WasmLive* instance is passed, subscribe to
    // storage changes and call the callback whenever storage updates affect it.
    if (
      firstArg !== null &&
      typeof firstArg === "object" &&
      "_nodeId" in firstArg
    ) {
      const callback = args[1] as (nodeOrUpdates: unknown) => void;
      const options = args[2] as { isDeep?: boolean } | undefined;
      const nodeId = (firstArg as { _nodeId: string })._nodeId;

      if (options?.isDeep) {
        // Deep subscribe — callback receives StorageUpdate[] filtered for this node tree.
        return eventSources.storageBatch.subscribe((updates) => {
          const allUpdates = updates as StorageUpdate[];
          // Filter to only updates affecting this node or its descendants
          const filtered = allUpdates.filter((u) =>
            isUpdateAffecting(u, nodeId)
          );
          if (filtered.length > 0) callback(filtered);
        });
      }

      // Shallow subscribe — callback receives the node itself.
      return eventSources.storageBatch.subscribe((updates) => {
        const allUpdates = updates as StorageUpdate[];
        // Check if any update directly targets this node
        const affectsNode = allUpdates.some(
          (u) => getUpdateNodeId(u) === nodeId
        );
        if (affectsNode) callback(firstArg);
      });
    }

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
    if (status === "initial") {
      stopTickLoop();
    }
  });

  const notImplemented = () => Promise.reject(new Error("Not implemented in WASM room"));

  // ---- Build Room object ----
  const room = {
    [kInternal]: {
      presenceBuffer: undefined,
      get undoStack() {
        if (isDestroyed) return [];
        return handle.getUndoStack() ?? [];
      },
      get nodeCount() {
        if (isDestroyed) return 0;
        return handle.getNodeCount();
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
    getStatus: () => isDestroyed ? ("initial" as Status) : handle.getStatus() as Status,
    connect: () => {
      handle.connect();
      // Start the tick loop immediately so that connection events
      // (StatusDidChange, ROOM_STATE, etc.) are processed as soon as
      // the async connect completes and MockWebSocket fires its deferred events.
      startTickLoop();
    },
    disconnect: () => {
      stopTickLoop();
      handle.disconnect();
    },
    reconnect: () => handle.reconnect(),
    destroy: () => {
      stopTickLoop();
      isDestroyed = true;
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
      handle.flush();
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
      batchDepth++;
      let result!: T;
      try {
        handle.batch(() => {
          result = fn();
        });
      } finally {
        batchDepth--;
      }
      if (!batchDepth) {
        // Flush outbound ops as a single message (all mutations batched together)
        handle.flush();
        checkStorageStatusTransition();
        flushUpdates();
      }
      return result;
    },

    // Readiness
    isPresenceReady: () => handle.getActorId() !== null,
    isStorageReady: () => handle.getStorageStatus() !== "not-loaded",
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
    waitUntilStorageReady: () => {
      if (handle.getStorageStatus() !== "not-loaded") return Promise.resolve();
      if (!storageReadyPromise$) {
        storageReadyPromise$ = eventSources.storageDidLoad.observable.waitUntil();
      }
      return storageReadyPromise$;
    },

    // History
    history: {
      undo: () => {
        if (batchDepth > 0) {
          throw new Error("Not allowed to call undo during a batch");
        }
        localStorageEventsPending++;
        handle.undo();
        handle.flush();
        // Use Rust-provided updates if available, otherwise empty
        if (lastRustStorageUpdates) {
          const converted = convertRustUpdates(lastRustStorageUpdates);
          const coalesced = coalesceUndoRedoUpdates(converted);
          eventSources.storageBatch.notify(coalesced);
        } else {
          eventSources.storageBatch.notify([]);
        }
      },
      redo: () => {
        if (batchDepth > 0) {
          throw new Error("Not allowed to call redo during a batch");
        }
        localStorageEventsPending++;
        handle.redo();
        handle.flush();
        // Use Rust-provided updates if available, otherwise empty
        if (lastRustStorageUpdates) {
          eventSources.storageBatch.notify(
            coalesceUndoRedoUpdates(convertRustUpdates(lastRustStorageUpdates))
          );
        } else {
          eventSources.storageBatch.notify([]);
        }
      },
      canUndo: () => handle.canUndo(),
      canRedo: () => handle.canRedo(),
      clear: () => handle.clearHistory(),
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
