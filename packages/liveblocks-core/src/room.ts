import type { AuthManager, AuthValue } from "./auth-manager";
import {
  getAuthBearerHeaderFromAuthValue,
  NotificationsApiError,
} from "./client";
import type {
  Delegates,
  LiveblocksError,
  LostConnectionEvent,
  Status,
} from "./connection";
import { ManagedSocket, StopRetrying } from "./connection";
import {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToInboxNotificationDeleteInfo,
  convertToThreadData,
  convertToThreadDeleteInfo,
} from "./convert-plain-data";
import type { ApplyResult, ManagedPool } from "./crdts/AbstractCrdt";
import { OpSource } from "./crdts/AbstractCrdt";
import {
  cloneLson,
  getTreesDiffOperations,
  isLiveList,
  isLiveNode,
  isSameNodeOrChildOf,
  mergeStorageUpdates,
} from "./crdts/liveblocks-helpers";
import { LiveObject } from "./crdts/LiveObject";
import type { LiveNode, LiveStructure, LsonObject } from "./crdts/Lson";
import type { StorageCallback, StorageUpdate } from "./crdts/StorageUpdates";
import type { DE, DM, DP, DS, DU } from "./globals/augmentation";
import { kInternal } from "./internal";
import { assertNever, nn } from "./lib/assert";
import type { BatchStore } from "./lib/batch";
import { Batch, createBatchStore } from "./lib/batch";
import { chunk } from "./lib/chunk";
import { Promise_withResolvers } from "./lib/controlledPromise";
import {
  createCommentAttachmentId,
  createCommentId,
  createThreadId,
} from "./lib/createIds";
import { captureStackTrace } from "./lib/debug";
import type { Callback, EventSource, Observable } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import * as console from "./lib/fancy-console";
import type { Json, JsonObject } from "./lib/Json";
import { isJsonArray, isJsonObject } from "./lib/Json";
import { objectToQuery } from "./lib/objectToQuery";
import { asPos } from "./lib/position";
import type { QueryParams } from "./lib/url";
import { urljoin } from "./lib/url";
import {
  compact,
  deepClone,
  memoizeOnSuccess,
  tryParseJson,
} from "./lib/utils";
import { canComment, canWriteStorage, TokenKind } from "./protocol/AuthToken";
import type { BaseUserMeta, IUserInfo } from "./protocol/BaseUserMeta";
import type { ClientMsg, UpdateYDocClientMsg } from "./protocol/ClientMsg";
import { ClientMsgCode } from "./protocol/ClientMsg";
import type {
  BaseMetadata,
  CommentAttachment,
  CommentBody,
  CommentData,
  CommentDataPlain,
  CommentLocalAttachment,
  CommentUserReaction,
  CommentUserReactionPlain,
  QueryMetadata,
  ThreadData,
  ThreadDataPlain,
  ThreadDeleteInfo,
  ThreadDeleteInfoPlain,
} from "./protocol/Comments";
import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
  InboxNotificationDeleteInfo,
  InboxNotificationDeleteInfoPlain,
} from "./protocol/InboxNotifications";
import type { Op } from "./protocol/Op";
import { isAckOp, OpCode } from "./protocol/Op";
import type { IdTuple, SerializedCrdt } from "./protocol/SerializedCrdt";
import type {
  CommentsEventServerMsg,
  InitialDocumentStateServerMsg,
  RoomStateServerMsg,
  ServerMsg,
  UpdatePresenceServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
  YDocUpdateServerMsg,
} from "./protocol/ServerMsg";
import { ServerMsgCode } from "./protocol/ServerMsg";
import type { ImmutableRef } from "./refs/ImmutableRef";
import { OthersRef } from "./refs/OthersRef";
import { PatchableRef } from "./refs/PatchableRef";
import { DerivedRef, ValueRef } from "./refs/ValueRef";
import type * as DevTools from "./types/DevToolsTreeNode";
import type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
import type { NodeMap } from "./types/NodeMap";
import type { InternalOthersEvent, OthersEvent } from "./types/Others";
import type { Patchable } from "./types/Patchable";
import type { RoomNotificationSettings } from "./types/RoomNotificationSettings";
import type { User } from "./types/User";
import { PKG_VERSION } from "./version";

type TimeoutID = ReturnType<typeof setTimeout>;

//
// NOTE:
// This type looks an awful lot like InternalOthersEvent, but don't change this
// type definition or DRY this up!
// The type LegacyOthersEvent is used in the signature of some public APIs, and
// as such should remain backward compatible.
//
type LegacyOthersEvent<P extends JsonObject, U extends BaseUserMeta> =
  | { type: "leave"; user: User<P, U> }
  | { type: "enter"; user: User<P, U> }
  | {
      type: "update";
      user: User<P, U>;
      updates: Partial<P>;
    }
  | { type: "reset" };

type LegacyOthersEventCallback<P extends JsonObject, U extends BaseUserMeta> = (
  others: readonly User<P, U>[],
  event: LegacyOthersEvent<P, U>
) => void;

export type RoomEventMessage<
  P extends JsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = {
  /**
   * The connection ID of the client that sent the event.
   * If this message was broadcast from the server (via the REST API), then
   * this value will be -1.
   */
  connectionId: number;
  /**
   * The User (from the others list) that sent the event.
   * If this message was broadcast from the server (via the REST API), then
   * this value will be null.
   */
  user: User<P, U> | null;
  event: E;
};

export type StorageStatus =
  /* The storage is not loaded and has not been requested. */
  | "not-loaded"
  /* The storage is loading from Liveblocks servers */
  | "loading"
  /* Some storage modifications has not been acknowledged yet by the server */
  | "synchronizing"
  /* The storage is sync with Liveblocks servers */
  | "synchronized";

type RoomEventCallbackMap<
  P extends JsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = {
  status: Callback<Status>; // New/recommended API
  "lost-connection": Callback<LostConnectionEvent>;
  event: Callback<RoomEventMessage<P, U, E>>;
  "my-presence": Callback<P>;
  //
  // NOTE: LegacyOthersEventCallback is the only one not taking a Callback<T>
  // shape, since this API historically has taken _two_ callback arguments
  // instead of just one.
  others: LegacyOthersEventCallback<P, U>;
  error: Callback<Error>;
  history: Callback<HistoryEvent>;
  "storage-status": Callback<StorageStatus>;
  comments: Callback<CommentsEventServerMsg>;
};

export interface History {
  /**
   * Undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xx" }
   */
  undo: () => void;

  /**
   * Redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.updatePresence({ selectedId: "yy" }, { addToHistory: true });
   * room.history.undo();
   * // room.getPresence() equals { selectedId: "xx" }
   * room.history.redo();
   * // room.getPresence() equals { selectedId: "yy" }
   */
  redo: () => void;

  /**
   * Returns whether there are any operations to undo.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * // room.history.canUndo() is true
   * room.history.undo();
   * // room.history.canUndo() is false
   */
  canUndo: () => boolean;

  /**
   * Returns whether there are any operations to redo.
   *
   * @example
   * room.updatePresence({ selectedId: "xx" }, { addToHistory: true });
   * room.history.undo();
   * // room.history.canRedo() is true
   * room.history.redo();
   * // room.history.canRedo() is false
   */
  canRedo: () => boolean;

  /**
   * Clears the undo and redo stacks. This operation cannot be undone ;)
   */
  clear: () => void;

  /**
   * All future modifications made on the Room will be merged together to create a single history item until resume is called.
   *
   * @example
   * room.updatePresence({ cursor: { x: 0, y: 0 } }, { addToHistory: true });
   * room.history.pause();
   * room.updatePresence({ cursor: { x: 1, y: 1 } }, { addToHistory: true });
   * room.updatePresence({ cursor: { x: 2, y: 2 } }, { addToHistory: true });
   * room.history.resume();
   * room.history.undo();
   * // room.getPresence() equals { cursor: { x: 0, y: 0 } }
   */
  pause: () => void;

  /**
   * Resumes history. Modifications made on the Room are not merged into a single history item anymore.
   *
   * @example
   * room.updatePresence({ cursor: { x: 0, y: 0 } }, { addToHistory: true });
   * room.history.pause();
   * room.updatePresence({ cursor: { x: 1, y: 1 } }, { addToHistory: true });
   * room.updatePresence({ cursor: { x: 2, y: 2 } }, { addToHistory: true });
   * room.history.resume();
   * room.history.undo();
   * // room.getPresence() equals { cursor: { x: 0, y: 0 } }
   */
  resume: () => void;
}

export type HistoryEvent = {
  canUndo: boolean;
  canRedo: boolean;
};

export type RoomEventName = Extract<
  keyof RoomEventCallbackMap<never, never, never>,
  string
>;

export type RoomEventCallbackFor<
  K extends RoomEventName,
  P extends JsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = RoomEventCallbackMap<P, U, E>[K];

export type RoomEventCallback = RoomEventCallbackFor<
  RoomEventName,
  JsonObject,
  BaseUserMeta,
  Json
>;

export type BroadcastOptions = {
  /**
   * Whether or not event is queued if the connection is currently closed.
   *
   * ❗ We are not sure if we want to support this option in the future so it might be deprecated to be replaced by something else
   */
  shouldQueueEventIfNotReady: boolean;
};

type SubscribeFn<
  P extends JsonObject,
  _TStorage extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = {
  /**
   * Subscribes to changes made on any Live structure. Returns an unsubscribe function.
   *
   * @internal This legacy API works, but was never documented publicly.
   */
  (callback: StorageCallback): () => void;

  /**
   * Subscribe to the current user presence updates.
   *
   * @param listener the callback that is called every time the current user presence is updated with {@link Room.updatePresence}.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * room.subscribe("my-presence", (presence) => {
   *   // Do something
   * });
   */
  (type: "my-presence", listener: Callback<P>): () => void;

  /**
   * Subscribe to the other users updates.
   *
   * @param listener the callback that is called when a user enters or leaves the room or when a user update its presence.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * room.subscribe("others", (others) => {
   *   // Do something
   * });
   *
   */
  (type: "others", listener: LegacyOthersEventCallback<P, U>): () => void;

  /**
   * Subscribe to events broadcasted by {@link Room.broadcastEvent}
   *
   * @param listener the callback that is called when a user calls {@link Room.broadcastEvent}
   *
   * @returns Unsubscribe function.
   *
   * @example
   * room.subscribe("event", ({ event, connectionId }) => {
   *   // Do something
   * });
   *
   */
  (type: "event", listener: Callback<RoomEventMessage<P, U, E>>): () => void;

  /**
   * Subscribe to errors thrown in the room.
   *
   * @returns Unsubscribe function.
   *
   */
  (type: "error", listener: Callback<LiveblocksError>): () => void;

  /**
   * Subscribe to connection status updates. The callback will be called any
   * time the status changes.
   *
   * @returns Unsubscribe function.
   *
   */
  (type: "status", listener: Callback<Status>): () => void;

  /**
   * Subscribe to the exceptional event where reconnecting to the Liveblocks
   * servers is taking longer than usual. This typically is a sign of a client
   * that has lost internet connectivity.
   *
   * This isn't problematic (because the Liveblocks client is still trying to
   * reconnect), but it's typically a good idea to inform users about it if
   * the connection takes too long to recover.
   */
  (
    type: "lost-connection",
    listener: Callback<LostConnectionEvent>
  ): () => void;

  /**
   * Subscribes to changes made on a Live structure. Returns an unsubscribe function.
   *
   * @param callback The callback this called when the Live structure changes.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * const liveMap = new LiveMap();  // Could also be LiveList or LiveObject
   * const unsubscribe = room.subscribe(liveMap, (liveMap) => { });
   * unsubscribe();
   */
  <L extends LiveStructure>(
    liveStructure: L,
    callback: (node: L) => void
  ): () => void;

  /**
   * Subscribes to changes made on a Live structure and all the nested data
   * structures. Returns an unsubscribe function. In a future version, we
   * will also expose what exactly changed in the Live structure.
   *
   * @param callback The callback this called when the Live structure, or any
   * of its nested values, changes.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * const liveMap = new LiveMap();  // Could also be LiveList or LiveObject
   * const unsubscribe = room.subscribe(liveMap, (updates) => { }, { isDeep: true });
   * unsubscribe();
   */
  <L extends LiveStructure>(
    liveStructure: L,
    callback: StorageCallback,
    options: { isDeep: true }
  ): () => void;

  /**
   * Subscribe to the current user's history changes.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * room.subscribe("history", ({ canUndo, canRedo }) => {
   *   // Do something
   * });
   */
  (type: "history", listener: Callback<HistoryEvent>): () => void;

  /**
   * Subscribe to storage status changes.
   *
   * @returns Unsubscribe function.
   *
   * @example
   * room.subscribe("storage-status", (status) => {
   *   switch(status) {
   *      case "not-loaded":
   *        break;
   *      case "loading":
   *        break;
   *      case "synchronizing":
   *        break;
   *      case "synchronized":
   *        break;
   *      default:
   *        break;
   *   }
   * });
   */
  (type: "storage-status", listener: Callback<StorageStatus>): () => void;

  (type: "comments", listener: Callback<CommentsEventServerMsg>): () => void;
};

export type GetThreadsOptions<M extends BaseMetadata> = {
  query?: {
    resolved?: boolean;
    metadata?: Partial<QueryMetadata<M>>;
  };
};

export type UploadAttachmentOptions = {
  signal?: AbortSignal;
};

/**
 * @private Widest-possible Room type, matching _any_ Room instance. Note that
 * this type is different from `Room`-without-type-arguments. That represents
 * a Room instance using globally augmented types only, which is narrower.
 */
export type OpaqueRoom = Room<
  JsonObject,
  LsonObject,
  BaseUserMeta,
  Json,
  BaseMetadata
>;

export type Room<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
> = {
  /**
   * @private
   *
   * Private methods and variables used in the core internals, but as a user
   * of Liveblocks, NEVER USE ANY OF THESE DIRECTLY, because bad things
   * will probably happen if you do.
   */
  readonly [kInternal]: PrivateRoomApi;

  /**
   * The id of the room.
   */
  readonly id: string;

  /**
   * Return the current connection status for this room. Can be used to display
   * a status badge for your Liveblocks connection.
   */
  getStatus(): Status;
  readonly subscribe: SubscribeFn<P, S, U, E>;

  /**
   * Room's history contains functions that let you undo and redo operation made on by the current client on the presence and storage.
   */
  readonly history: History;

  /**
   * Gets the current user.
   * Returns null if not it is not yet connected to the room.
   *
   * @example
   * const user = room.getSelf();
   */
  getSelf(): User<P, U> | null;

  /**
   * Gets the presence of the current user.
   *
   * @example
   * const presence = room.getPresence();
   */
  getPresence(): P;

  /**
   * Gets all the other users in the room.
   *
   * @example
   * const others = room.getOthers();
   */
  getOthers(): readonly User<P, U>[];

  /**
   * Updates the presence of the current user. Only pass the properties you want to update. No need to send the full presence.
   * @param patch A partial object that contains the properties you want to update.
   * @param options Optional object to configure the behavior of updatePresence.
   *
   * @example
   * room.updatePresence({ x: 0 });
   * room.updatePresence({ y: 0 });
   *
   * const presence = room.getPresence();
   * // presence is equivalent to { x: 0, y: 0 }
   */
  updatePresence(
    patch: Partial<P>,
    options?: {
      /**
       * Whether or not the presence should have an impact on the undo/redo history.
       */
      addToHistory: boolean;
    }
  ): void;

  /**
   * Sends Yjs document updates to Liveblocks server.
   *
   * @param {string} data the doc update to send to the server, base64 encoded uint8array
   */
  updateYDoc(data: string, guid?: string): void;

  /**
   * Sends a request for the current document from liveblocks server
   */
  fetchYDoc(stateVector: string, guid?: string): void;

  /**
   * Broadcasts an event to other users in the room. Event broadcasted to the room can be listened with {@link Room.subscribe}("event").
   * @param {any} event the event to broadcast. Should be serializable to JSON
   *
   * @example
   * // On client A
   * room.broadcastEvent({ type: "EMOJI", emoji: "🔥" });
   *
   * // On client B
   * room.subscribe("event", ({ event }) => {
   *   if(event.type === "EMOJI") {
   *     // Do something
   *   }
   * });
   */
  broadcastEvent(event: E, options?: BroadcastOptions): void;

  /**
   * Get the room's storage asynchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const { root } = await room.getStorage();
   */
  getStorage(): Promise<{
    root: LiveObject<S>;
  }>;

  /**
   * Get the room's storage synchronously.
   * The storage's root is a {@link LiveObject}.
   *
   * @example
   * const root = room.getStorageSnapshot();
   */
  getStorageSnapshot(): LiveObject<S> | null;

  /**
   * All possible room events, subscribable from a single place.
   *
   * @private These event sources are private for now, but will become public
   * once they're stable.
   */
  readonly events: {
    readonly status: Observable<Status>;
    readonly lostConnection: Observable<LostConnectionEvent>;

    readonly customEvent: Observable<RoomEventMessage<P, U, E>>; // prettier-ignore
    readonly self: Observable<User<P, U>>;
    readonly myPresence: Observable<P>;
    readonly others: Observable<OthersEvent<P, U>>;
    readonly error: Observable<LiveblocksError>;
    /**
     * @deprecated Renamed to `storageBatch`. The `storage` event source will
     * soon be replaced by another/incompatible API.
     */
    readonly storage: Observable<StorageUpdate[]>;
    readonly storageBatch: Observable<StorageUpdate[]>;
    readonly history: Observable<HistoryEvent>;

    /**
     * Subscribe to the storage loaded event. Will fire any time a full Storage
     * copy is downloaded. (This happens after the initial connect, and on
     * every reconnect.)
     */
    readonly storageDidLoad: Observable<void>;

    readonly storageStatus: Observable<StorageStatus>;
    readonly ydoc: Observable<YDocUpdateServerMsg | UpdateYDocClientMsg>;
    readonly comments: Observable<CommentsEventServerMsg>;
  };

  /**
   * Batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the subscribers are called only after the batch is over.
   * All the modifications are merged in a single history item (undo/redo).
   *
   * @example
   * const { root } = await room.getStorage();
   * room.batch(() => {
   *   root.set("x", 0);
   *   room.updatePresence({ cursor: { x: 100, y: 100 }});
   * });
   */
  batch<T>(fn: () => T): T;

  /**
   * Get the storage status.
   *
   * - `not-loaded`: Initial state when entering the room.
   * - `loading`: Once the storage has been requested via room.getStorage().
   * - `synchronizing`: When some local updates have not been acknowledged by Liveblocks servers.
   * - `synchronized`: Storage is in sync with Liveblocks servers.
   */
  getStorageStatus(): StorageStatus;

  isPresenceReady(): boolean;
  isStorageReady(): boolean;

  /**
   * Returns a Promise that resolves as soon as Presence is available, which
   * happens shortly after the WebSocket connection has been established. Once
   * this happens, `self` and `others` are known and available to use. After
   * awaiting this promise, `.isPresenceReady()` will be guaranteed to be true.
   * Even when calling this function multiple times, it's guaranteed to return
   * the same Promise instance.
   */
  waitUntilPresenceReady(): Promise<void>;

  /**
   * Returns a Promise that resolves as soon as Storage has been loaded and
   * available. After awaiting this promise, `.isStorageReady()` will be
   * guaranteed to be true. Even when calling this function multiple times,
   * it's guaranteed to return the same Promise instance.
   */
  waitUntilStorageReady(): Promise<void>;

  /**
   * Start an attempt to connect the room (aka "enter" it). Calling
   * `.connect()` only has an effect if the room is still in its idle initial
   * state, or the room was explicitly disconnected, or reconnection attempts
   * were stopped (for example, because the user isn't authorized to enter the
   * room). Will be a no-op otherwise.
   */
  connect(): void;

  /**
   * Disconnect the room's connection to the Liveblocks server, if any. Puts
   * the room back into an idle state. It will not do anything until either
   * `.connect()` or `.reconnect()` is called.
   *
   * Only use this API if you wish to connect the room again at a later time.
   * If you want to disconnect the room because you no longer need it, call
   * `.destroy()` instead.
   */
  disconnect(): void;

  /**
   * @internal (for now)
   *
   * Disconnect the room's connection to the Liveblocks server, if any. Runs
   * cleanup functions. The room instance can no longer be used to (re)connect.
   */
  destroy(): void;

  /**
   * Reconnect the room to the Liveblocks server by re-establishing a fresh
   * connection. If the room is not connected yet, initiate it.
   */
  reconnect(): void;

  /**
   * Returns the threads within the current room and their associated inbox notifications.
   * It also returns the request date that can be used for subsequent polling.
   *
   * @example
   * const {
   *   threads,
   *   inboxNotifications,
   *   requestedAt
   * } = await room.getThreads({ query: { resolved: false }});
   */
  getThreads(options?: GetThreadsOptions<M>): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    requestedAt: Date;
  }>;

  /**
   * Returns the updated and deleted threads and their associated inbox notifications since the requested date.
   *
   * @example
   * const result = await room.getThreads();
   * // ... //
   * await room.getThreadsSince({ since: result.requestedAt });
   */
  getThreadsSince(options: { since: Date }): Promise<{
    threads: {
      updated: ThreadData<M>[];
      deleted: ThreadDeleteInfo[];
    };
    inboxNotifications: {
      updated: InboxNotificationData[];
      deleted: InboxNotificationDeleteInfo[];
    };
    requestedAt: Date;
  }>;

  /**
   * Returns a thread and the associated inbox notification if it exists.
   *
   * @example
   * const { thread, inboxNotification } = await room.getThread("th_xxx");
   */
  getThread(threadId: string): Promise<{
    thread?: ThreadData<M>;
    inboxNotification?: InboxNotificationData;
  }>;

  /**
   * Creates a thread.
   *
   * @example
   * const thread = await room.createThread({
   *   body: {
   *     version: 1,
   *     content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
   *   },
   * })
   */
  createThread(options: {
    threadId?: string;
    commentId?: string;
    metadata: M | undefined;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<ThreadData<M>>;

  /**
   * Deletes a thread.
   *
   * @example
   * await room.deleteThread("th_xxx");
   */
  deleteThread(threadId: string): Promise<void>;

  /**
   * Edits a thread's metadata.
   * To delete an existing metadata property, set its value to `null`.
   *
   * @example
   * await room.editThreadMetadata({ threadId: "th_xxx", metadata: { x: 100, y: 100 } })
   */
  editThreadMetadata(options: {
    metadata: Patchable<M>;
    threadId: string;
  }): Promise<M>;

  /**
   * Marks a thread as resolved.
   *
   * @example
   * await room.markThreadAsResolved("th_xxx");
   */
  markThreadAsResolved(threadId: string): Promise<void>;

  /**
   * Marks a thread as unresolved.
   *
   * @example
   * await room.markThreadAsUnresolved("th_xxx");
   */
  markThreadAsUnresolved(threadId: string): Promise<void>;

  /**
   * Creates a comment.
   *
   * @example
   * await room.createComment({
   *   threadId: "th_xxx",
   *   body: {
   *     version: 1,
   *     content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
   *   },
   * });
   */
  createComment(options: {
    threadId: string;
    commentId?: string;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<CommentData>;

  /**
   * Edits a comment.
   *
   * @example
   * await room.editComment({
   *   threadId: "th_xxx",
   *   commentId: "cm_xxx"
   *   body: {
   *     version: 1,
   *     content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
   *   },
   * });
   */
  editComment(options: {
    threadId: string;
    commentId: string;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<CommentData>;

  /**
   * Deletes a comment.
   * If it is the last non-deleted comment, the thread also gets deleted.
   *
   * @example
   * await room.deleteComment({
   *   threadId: "th_xxx",
   *   commentId: "cm_xxx"
   * });
   */
  deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;

  /**
   * Adds a reaction from a comment for the current user.
   *
   * @example
   * await room.addReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
   */
  addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentUserReaction>;

  /**
   * Removes a reaction from a comment.
   *
   * @example
   * await room.removeReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
   */
  removeReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;

  /**
   * Creates a local attachment from a file.
   *
   * @example
   * room.prepareAttachment(file);
   */
  prepareAttachment(file: File): CommentLocalAttachment;

  /**
   * Uploads a local attachment.
   *
   * @example
   * const attachment = room.prepareAttachment(file);
   * await room.uploadAttachment(attachment);
   */
  uploadAttachment(
    attachment: CommentLocalAttachment,
    options?: UploadAttachmentOptions
  ): Promise<CommentAttachment>;

  /**
   * Returns a presigned URL for an attachment by its ID.
   *
   * @example
   * await room.getAttachmentUrl("at_xxx");
   */
  getAttachmentUrl(attachmentId: string): Promise<string>;

  /**
   * Gets the user's notification settings for the current room.
   *
   * @example
   * const settings = await room.getNotificationSettings();
   */
  getNotificationSettings(): Promise<RoomNotificationSettings>;

  /**
   * Updates the user's notification settings for the current room.
   *
   * @example
   * await room.updateNotificationSettings({ threads: "replies_and_mentions" });
   */
  updateNotificationSettings(
    settings: Partial<RoomNotificationSettings>
  ): Promise<RoomNotificationSettings>;

  /**
   * Internal use only. Signature might change in the future.
   */
  markInboxNotificationAsRead(notificationId: string): Promise<void>;
};

type Provider = {
  synced: boolean;
  getStatus: () => "loading" | "synchronizing" | "synchronized";
  on(event: "sync" | "status", listener: (synced: boolean) => void): void;
  off(event: "sync" | "status", listener: (synced: boolean) => void): void;
};

/**
 * @private
 *
 * Private methods to directly control the underlying state machine for this
 * room. Used in the core internals and for unit testing, but as a user of
 * Liveblocks, NEVER USE ANY OF THESE METHODS DIRECTLY, because bad things
 * will probably happen if you do.
 */
export type PrivateRoomApi = {
  // For introspection in unit tests only
  presenceBuffer: Json | undefined;
  undoStack: readonly (readonly Readonly<HistoryOp<JsonObject>>[])[];
  nodeCount: number;

  // For usage in Y.js provider
  getProvider(): Provider | undefined;
  setProvider(provider: Provider | undefined): void;

  onProviderUpdate: Observable<void>;

  // For DevTools support (Liveblocks browser extension)
  getSelf_forDevTools(): DevTools.UserTreeNode | null;
  getOthers_forDevTools(): readonly DevTools.UserTreeNode[];

  // For reporting editor metadata
  reportTextEditor(editor: "lexical", rootKey: string): void;

  createTextMention(userId: string, mentionId: string): Promise<Response>;
  deleteTextMention(mentionId: string): Promise<Response>;

  // NOTE: These are only used in our e2e test app!
  simulate: {
    explicitClose(event: IWebSocketCloseEvent): void;
    rawSend(data: string): void;
  };

  attachmentUrlsStore: BatchStore<string, string>;
};

// The maximum message size on websockets is 1MB. We'll set the threshold
// slightly lower (1kB) to trigger sending over HTTP, to account for messaging
// overhead, so we're not right at the limit.
// NOTE: this only works with the unstable_fallbackToHTTP option enabled
const MAX_SOCKET_MESSAGE_SIZE = 1024 * 1024 - 1024;

function makeIdFactory(connectionId: number): IdFactory {
  let count = 0;
  return () => `${connectionId}:${count++}`;
}

type HistoryOp<P extends JsonObject> =
  | Op
  | {
      readonly type: "presence";
      readonly data: P;
    };

type IdFactory = () => string;

type StaticSessionInfo = {
  readonly userId?: string;
  readonly userInfo?: IUserInfo;
};

type DynamicSessionInfo = {
  readonly actor: number;
  readonly nonce: string;
  readonly scopes: string[];
};

type RoomState<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = {
  /**
   * All pending changes that yet need to be synced.
   */
  buffer: {
    flushTimerID: TimeoutID | undefined;

    // When the last flush happened. Together with config.throttleDelay, this
    // will control whether the next flush will be sent out immediately, or if
    // a flush will get scheduled for a few milliseconds into the future.
    readonly lastFlushedAt: number;

    // Queued-up "my presence" updates to be flushed at the earliest convenience
    presenceUpdates:
      | { type: "partial"; data: Partial<P> }
      | { type: "full"; data: P }
      | null;
    messages: ClientMsg<P, E>[];
    storageOperations: Op[];
  };

  //
  // The "self" User takes assembly of three sources-of-truth:
  // - The JWT token provides the userId and userInfo metadata (static)
  // - The server, in its initial ROOM_STATE message, will provide the actor ID
  //   and the scopes (dynamic)
  // - The presence is provided by the client's initialPresence configuration (presence)
  //
  readonly staticSessionInfo: ValueRef<StaticSessionInfo | null>;
  readonly dynamicSessionInfo: ValueRef<DynamicSessionInfo | null>;
  readonly myPresence: PatchableRef<P>;
  readonly others: OthersRef<P, U>;

  idFactory: IdFactory | null;
  initialStorage: S;

  provider: Provider | undefined;
  readonly onProviderUpdate: EventSource<void>;

  clock: number;
  opClock: number;
  readonly nodes: Map<string, LiveNode>;
  root: LiveObject<S> | undefined;

  readonly undoStack: HistoryOp<P>[][];
  readonly redoStack: HistoryOp<P>[][];

  /**
   * When history is paused, all operations will get queued up here. When
   * history is resumed, these operations get "committed" to the undo stack.
   */
  pausedHistory: null | HistoryOp<P>[];

  /**
   * Place to collect all mutations during a batch. Ops will be sent over the
   * wire after the batch is ended.
   */
  activeBatch: {
    ops: Op[];
    reverseOps: HistoryOp<P>[];
    updates: {
      others: [];
      presence: boolean;
      storageUpdates: Map<string, StorageUpdate>;
    };
  } | null;

  // A registry of yet-unacknowledged Ops. These Ops have already been
  // submitted to the server, but have not yet been acknowledged.
  readonly unacknowledgedOps: Map<string, Op>;

  // Stack traces of all pending Ops. Used for debugging in non-production builds
  readonly opStackTraces?: Map<string, string>;
};

export type Polyfills = {
  atob?: (data: string) => string;
  fetch?: typeof fetch;
  WebSocket?: IWebSocket;
};

/**
 * Makes all tuple positions optional.
 * Example, turns:
 *   [foo: string; bar: number]
 * into:
 *   [foo?: string; bar?: number]
 */
type OptionalTuple<T extends any[]> = { [K in keyof T]?: T[K] };

/**
 * Returns Partial<T> if all fields on C are optional, T otherwise.
 */
export type PartialUnless<C, T> =
  Record<string, never> extends C
    ? Partial<T>
    : // Extra test. We'll want to treat "never" as if the empty object is
      // assignable to it, because otherwise it will not
      [C] extends [never]
      ? Partial<T>
      : T;

/**
 * Returns OptionalTupleUnless<T> if all fields on C are optional, T otherwise.
 */
export type OptionalTupleUnless<C, T extends any[]> =
  Record<string, never> extends C
    ? OptionalTuple<T>
    : // Extra test. We'll want to treat "never" as if the empty object is
      // assignable to it, because otherwise it will not
      [C] extends [never]
      ? OptionalTuple<T>
      : T;

export type RoomDelegates = Omit<Delegates<AuthValue>, "canZombie">;

/** @internal */
export type RoomConfig = {
  delegates: RoomDelegates;

  roomId: string;
  throttleDelay: number;
  lostConnectionTimeout: number;
  backgroundKeepAliveTimeout?: number;

  unstable_fallbackToHTTP?: boolean;
  unstable_streamData?: boolean;

  polyfills?: Polyfills;

  /**
   * Only necessary when you’re using Liveblocks with React v17 or lower.
   *
   * If so, pass in a reference to `ReactDOM.unstable_batchedUpdates` here.
   * This will allow Liveblocks to circumvent the so-called "zombie child
   * problem". To learn more, see
   * https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child
   */
  unstable_batchedUpdates?: (cb: () => void) => void;

  baseUrl: string;
  enableDebugLogging?: boolean;
};

function userToTreeNode(
  key: string,
  user: User<JsonObject, BaseUserMeta>
): DevTools.UserTreeNode {
  return {
    type: "User",
    id: `${user.connectionId}`,
    key,
    payload: {
      connectionId: user.connectionId,
      id: user.id,
      info: user.info,
      presence: user.presence,
      isReadOnly: !user.canWrite,
    },
  };
}

/**
 * Returns a ref to access if, and if so, how long the current tab is in the
 * background and an unsubscribe function.
 *
 * The `inBackgroundSince` value will either be a JS timestamp indicating the
 * moment the tab was put into the background, or `null` in case the tab isn't
 * currently in the background. In non-DOM environments, this will always
 * return `null`.
 */
function installBackgroundTabSpy(): [
  inBackgroundSince: { readonly current: number | null },
  unsub: () => void,
] {
  const doc = typeof document !== "undefined" ? document : undefined;
  const inBackgroundSince: { current: number | null } = { current: null };

  function onVisibilityChange() {
    if (doc?.visibilityState === "hidden") {
      inBackgroundSince.current = inBackgroundSince.current ?? Date.now();
    } else {
      inBackgroundSince.current = null;
    }
  }

  doc?.addEventListener("visibilitychange", onVisibilityChange);
  const unsub = () => {
    doc?.removeEventListener("visibilitychange", onVisibilityChange);
  };

  return [inBackgroundSince, unsub];
}

const GET_ATTACHMENT_URLS_BATCH_DELAY = 50;
const ATTACHMENT_PART_SIZE = 5 * 1024 * 1024; // 5 MB
const ATTACHMENT_PART_BATCH_SIZE = 5;

function splitFileIntoParts(file: File) {
  const parts: { partNumber: number; part: Blob }[] = [];

  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + ATTACHMENT_PART_SIZE, file.size);

    parts.push({
      partNumber: parts.length + 1,
      part: file.slice(start, end),
    });

    start = end;
  }

  return parts;
}

export class CommentsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}

const MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY = 50;

/**
 * @internal
 * Initializes a new Room, and returns its public API.
 */
export function createRoom<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(
  options: { initialPresence: P; initialStorage: S },
  config: RoomConfig
): Room<P, S, U, E, M> {
  const initialPresence = options.initialPresence; // ?? {};
  const initialStorage = options.initialStorage; // ?? {};

  const [inBackgroundSince, uninstallBgTabSpy] = installBackgroundTabSpy();

  // Create a delegate pair for (a specific) Live Room socket connection(s)
  const delegates = {
    ...config.delegates,

    // A connection is allowed to go into "zombie state" only if all of the
    // following conditions apply:
    //
    // - The `backgroundKeepAliveTimeout` client option is configured
    // - The browser window has been in the background for at least
    //   `backgroundKeepAliveTimeout` milliseconds
    // - There are no pending changes
    //
    canZombie() {
      return (
        config.backgroundKeepAliveTimeout !== undefined &&
        inBackgroundSince.current !== null &&
        Date.now() >
          inBackgroundSince.current + config.backgroundKeepAliveTimeout &&
        getStorageStatus() !== "synchronizing"
      );
    },
  };

  const managedSocket: ManagedSocket<AuthValue> = new ManagedSocket(
    delegates,
    config.enableDebugLogging
  );

  // The room's internal stateful context
  const context: RoomState<P, S, U, E> = {
    buffer: {
      flushTimerID: undefined,
      lastFlushedAt: 0,
      presenceUpdates:
        // Queue up the initial presence message as a Full Presence™ update
        {
          type: "full",
          data: initialPresence,
        },
      messages: [],
      storageOperations: [],
    },

    staticSessionInfo: new ValueRef(null),
    dynamicSessionInfo: new ValueRef(null),
    myPresence: new PatchableRef(initialPresence),
    others: new OthersRef<P, U>(),

    initialStorage,
    idFactory: null,

    // Y.js
    provider: undefined,
    onProviderUpdate: makeEventSource(),

    // Storage
    clock: 0,
    opClock: 0,
    nodes: new Map<string, LiveNode>(),
    root: undefined,

    undoStack: [],
    redoStack: [],
    pausedHistory: null,

    activeBatch: null,
    unacknowledgedOps: new Map<string, Op>(),

    // Debug
    opStackTraces:
      process.env.NODE_ENV !== "production"
        ? new Map<string, string>()
        : undefined,
  };

  const doNotBatchUpdates = (cb: () => void): void => cb();
  const batchUpdates = config.unstable_batchedUpdates ?? doNotBatchUpdates;

  let lastTokenKey: string | undefined;
  function onStatusDidChange(newStatus: Status) {
    const authValue = managedSocket.authValue;
    if (authValue !== null) {
      const tokenKey = getAuthBearerHeaderFromAuthValue(authValue);

      if (tokenKey !== lastTokenKey) {
        lastTokenKey = tokenKey;

        if (authValue.type === "secret") {
          const token = authValue.token.parsed;
          context.staticSessionInfo.set({
            userId: token.k === TokenKind.SECRET_LEGACY ? token.id : token.uid,
            userInfo:
              token.k === TokenKind.SECRET_LEGACY ? token.info : token.ui,
          });
        } else {
          context.staticSessionInfo.set({
            userId: undefined,
            userInfo: undefined,
          });
        }
      }
    }

    // Forward to the outside world
    batchUpdates(() => {
      eventHub.status.notify(newStatus);
      notifySelfChanged(doNotBatchUpdates);
    });
  }

  let _connectionLossTimerId: TimeoutID | undefined;
  let _hasLostConnection = false;

  function handleConnectionLossEvent(newStatus: Status) {
    if (newStatus === "reconnecting") {
      _connectionLossTimerId = setTimeout(() => {
        batchUpdates(() => {
          eventHub.lostConnection.notify("lost");
          _hasLostConnection = true;

          // Clear the others
          context.others.clearOthers();
          notify({ others: [{ type: "reset" }] }, doNotBatchUpdates);
        });
      }, config.lostConnectionTimeout);
    } else {
      clearTimeout(_connectionLossTimerId);

      if (_hasLostConnection) {
        if (newStatus === "disconnected") {
          batchUpdates(() => {
            eventHub.lostConnection.notify("failed");
          });
        } else {
          // Typically the case when going back to "connected", but really take
          // *any* other state change as a recovery sign
          batchUpdates(() => {
            eventHub.lostConnection.notify("restored");
          });
        }

        _hasLostConnection = false;
      }
    }
  }

  function onDidConnect() {
    // Re-broadcast the full user presence as soon as we (re)connect
    context.buffer.presenceUpdates = {
      type: "full",
      data:
        // Because context.me.current is a readonly object, we'll have to
        // make a copy here. Otherwise, type errors happen later when
        // "patching" my presence.
        { ...context.myPresence.current },
    };

    // NOTE: There was a flush here before, but I don't think it's really
    // needed anymore. We're now combining this flush with the one below, to
    // combine them in a single batch.
    // tryFlushing();

    // If a storage fetch has ever been initiated, we assume the client is
    // interested in storage, so we will refresh it after a reconnection.
    if (_getStorage$ !== null) {
      refreshStorage({ flush: false });
    }
    flushNowOrSoon();
  }

  function onDidDisconnect() {
    clearTimeout(context.buffer.flushTimerID);
  }

  // Register events handlers for events coming from the socket
  // We never have to unsubscribe, because the Room and the Connection Manager
  // will have the same life-time.
  managedSocket.events.onMessage.subscribe(handleServerMessage);
  managedSocket.events.statusDidChange.subscribe(onStatusDidChange);
  managedSocket.events.statusDidChange.subscribe(handleConnectionLossEvent);
  managedSocket.events.didConnect.subscribe(onDidConnect);
  managedSocket.events.didDisconnect.subscribe(onDidDisconnect);
  managedSocket.events.onLiveblocksError.subscribe((err) => {
    batchUpdates(() => {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `Connection to websocket server closed. Reason: ${err.message} (code: ${err.code}).`
        );
      }
      eventHub.error.notify(err);
    });
  });

  const pool: ManagedPool = {
    roomId: config.roomId,

    getNode: (id: string) => context.nodes.get(id),
    addNode: (id: string, node: LiveNode) => void context.nodes.set(id, node),
    deleteNode: (id: string) => void context.nodes.delete(id),

    generateId: () => `${getConnectionId()}:${context.clock++}`,
    generateOpId: () => `${getConnectionId()}:${context.opClock++}`,

    dispatch(
      ops: Op[],
      reverse: Op[],
      storageUpdates: Map<string, StorageUpdate>
    ) {
      const activeBatch = context.activeBatch;

      if (process.env.NODE_ENV !== "production") {
        const stackTrace = captureStackTrace("Storage mutation", this.dispatch);
        if (stackTrace) {
          for (const op of ops) {
            if (op.opId) {
              nn(context.opStackTraces).set(op.opId, stackTrace);
            }
          }
        }
      }

      if (activeBatch) {
        for (const op of ops) {
          activeBatch.ops.push(op);
        }
        for (const [key, value] of storageUpdates) {
          activeBatch.updates.storageUpdates.set(
            key,
            mergeStorageUpdates(
              activeBatch.updates.storageUpdates.get(key),
              value
            )
          );
        }
        activeBatch.reverseOps.unshift(...reverse);
      } else {
        batchUpdates(() => {
          addToUndoStack(reverse, doNotBatchUpdates);
          context.redoStack.length = 0;
          dispatchOps(ops);
          notify({ storageUpdates }, doNotBatchUpdates);
        });
      }
    },

    assertStorageIsWritable: () => {
      const scopes = context.dynamicSessionInfo.current?.scopes;
      if (scopes === undefined) {
        // If we aren't connected yet, assume we can write
        return;
      }

      const canWrite = canWriteStorage(scopes);
      if (!canWrite) {
        throw new Error(
          "Cannot write to storage with a read only user, please ensure the user has write permissions"
        );
      }
    },
  };

  const eventHub = {
    status: makeEventSource<Status>(), // New/recommended API
    lostConnection: makeEventSource<LostConnectionEvent>(),

    customEvent: makeEventSource<RoomEventMessage<P, U, E>>(),
    self: makeEventSource<User<P, U>>(),
    myPresence: makeEventSource<P>(),
    others: makeEventSource<OthersEvent<P, U>>(),
    error: makeEventSource<LiveblocksError>(),
    storageBatch: makeEventSource<StorageUpdate[]>(),
    history: makeEventSource<HistoryEvent>(),
    storageDidLoad: makeEventSource<void>(),
    storageStatus: makeEventSource<StorageStatus>(),
    ydoc: makeEventSource<YDocUpdateServerMsg | UpdateYDocClientMsg>(),

    comments: makeEventSource<CommentsEventServerMsg>(),
  };

  async function fetchClientApi(
    roomId: string,
    endpoint: string,
    authValue: AuthValue,
    options?: RequestInit,
    params?: QueryParams
  ) {
    const url = urljoin(
      config.baseUrl,
      `/v2/c/rooms/${encodeURIComponent(roomId)}${endpoint}`,
      params
    );
    const fetcher = config.polyfills?.fetch || /* istanbul ignore next */ fetch;
    return await fetcher(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
      },
    });
  }

  async function streamFetch(authValue: AuthValue, roomId: string) {
    return fetchClientApi(roomId, "/storage", authValue, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async function httpPostToRoom(
    endpoint: "/send-message" | "/text-metadata",
    body: JsonObject
  ) {
    if (!managedSocket.authValue) {
      throw new Error("Not authorized");
    }

    return fetchClientApi(config.roomId, endpoint, managedSocket.authValue, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async function createTextMention(userId: string, mentionId: string) {
    if (!managedSocket.authValue) {
      throw new Error("Not authorized");
    }

    return fetchClientApi(
      config.roomId,
      "/text-mentions",
      managedSocket.authValue,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          mentionId,
        }),
      }
    );
  }

  async function deleteTextMention(mentionId: string) {
    if (!managedSocket.authValue) {
      throw new Error("Not authorized");
    }

    return fetchClientApi(
      config.roomId,
      `/text-mentions/${mentionId}`,
      managedSocket.authValue,
      {
        method: "DELETE",
      }
    );
  }

  async function reportTextEditor(type: "lexical", rootKey: string) {
    const authValue = await delegates.authenticate();
    return fetchClientApi(config.roomId, "/text-metadata", authValue, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        rootKey,
      }),
    });
  }

  function sendMessages(messages: ClientMsg<P, E>[]) {
    const serializedPayload = JSON.stringify(messages);
    const nonce = context.dynamicSessionInfo.current?.nonce;
    if (config.unstable_fallbackToHTTP && nonce) {
      // if our message contains UTF-8, we can't simply use length. See: https://stackoverflow.com/questions/23318037/size-of-json-object-in-kbs-mbs
      // if this turns out to be expensive, we could just guess with a lower value.
      const size = new TextEncoder().encode(serializedPayload).length;
      if (size > MAX_SOCKET_MESSAGE_SIZE) {
        void httpPostToRoom("/send-message", { nonce, messages }).then(
          (resp) => {
            if (!resp.ok && resp.status === 403) {
              managedSocket.reconnect();
            }
          }
        );
        console.warn(
          "Message was too large for websockets and sent over HTTP instead"
        );
        return;
      }
    }
    managedSocket.send(serializedPayload);
  }

  const self = new DerivedRef(
    context.staticSessionInfo as ImmutableRef<StaticSessionInfo | null>,
    context.dynamicSessionInfo as ImmutableRef<DynamicSessionInfo | null>,
    context.myPresence,
    (staticSession, dynamicSession, myPresence): User<P, U> | null => {
      if (staticSession === null || dynamicSession === null) {
        return null;
      } else {
        const canWrite = canWriteStorage(dynamicSession.scopes);
        return {
          connectionId: dynamicSession.actor,
          id: staticSession.userId,
          info: staticSession.userInfo,
          presence: myPresence,
          canWrite,
          canComment: canComment(dynamicSession.scopes),
        };
      }
    }
  );

  let _lastSelf: Readonly<User<P, U>> | undefined;
  function notifySelfChanged(batchedUpdatesWrapper: (cb: () => void) => void) {
    const currSelf = self.current;
    if (currSelf !== null && currSelf !== _lastSelf) {
      batchedUpdatesWrapper(() => {
        eventHub.self.notify(currSelf);
      });
      _lastSelf = currSelf;
    }
  }

  // For use in DevTools
  const selfAsTreeNode = new DerivedRef(
    self as ImmutableRef<User<P, U> | null>,
    (me) => (me !== null ? userToTreeNode("Me", me) : null)
  );

  function createOrUpdateRootFromMessage(
    message: InitialDocumentStateServerMsg,
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (message.items.length === 0) {
      throw new Error("Internal error: cannot load storage without items");
    }

    if (context.root !== undefined) {
      updateRoot(message.items, batchedUpdatesWrapper);
    } else {
      context.root = LiveObject._fromItems<S>(message.items, pool);
    }

    const canWrite = self.current?.canWrite ?? true;

    // Populate missing top-level keys using `initialStorage`
    const stackSizeBefore = context.undoStack.length;
    for (const key in context.initialStorage) {
      if (context.root.get(key) === undefined) {
        if (canWrite) {
          context.root.set(key, cloneLson(context.initialStorage[key]));
        } else {
          console.warn(
            `Attempted to populate missing storage key '${key}', but current user has no write access`
          );
        }
      }
    }

    // Initial storage is populated using normal "set" operations in the loop
    // above, those updates can end up in the undo stack, so let's prune it.
    context.undoStack.length = stackSizeBefore;
  }

  function updateRoot(
    items: IdTuple<SerializedCrdt>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (context.root === undefined) {
      return;
    }

    const currentItems: NodeMap = new Map();
    for (const [id, node] of context.nodes) {
      currentItems.set(id, node._serialize());
    }

    // Get operations that represent the diff between 2 states.
    const ops = getTreesDiffOperations(currentItems, new Map(items));

    const result = applyOps(ops, false);

    notify(result.updates, batchedUpdatesWrapper);
  }

  function _addToRealUndoStack(
    historyOps: HistoryOp<P>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    // If undo stack is too large, we remove the older item
    if (context.undoStack.length >= 50) {
      context.undoStack.shift();
    }

    context.undoStack.push(historyOps);
    onHistoryChange(batchedUpdatesWrapper);
  }

  function addToUndoStack(
    historyOps: HistoryOp<P>[],
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (context.pausedHistory !== null) {
      context.pausedHistory.unshift(...historyOps);
    } else {
      _addToRealUndoStack(historyOps, batchedUpdatesWrapper);
    }
  }

  type NotifyUpdates = {
    storageUpdates?: Map<string, StorageUpdate>;
    presence?: boolean;
    others?: InternalOthersEvent<P, U>[];
  };

  function notify(
    updates: NotifyUpdates,
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    const storageUpdates = updates.storageUpdates;
    const othersUpdates = updates.others;

    batchedUpdatesWrapper(() => {
      if (othersUpdates !== undefined && othersUpdates.length > 0) {
        const others = context.others.current;
        for (const event of othersUpdates) {
          eventHub.others.notify({ ...event, others });
        }
      }

      if (updates.presence ?? false) {
        notifySelfChanged(doNotBatchUpdates);
        eventHub.myPresence.notify(context.myPresence.current);
      }

      if (storageUpdates !== undefined && storageUpdates.size > 0) {
        const updates = Array.from(storageUpdates.values());
        eventHub.storageBatch.notify(updates);
      }
      notifyStorageStatus();
    });
  }

  function getConnectionId() {
    const info = context.dynamicSessionInfo.current;
    if (info) {
      return info.actor;
    }

    throw new Error(
      "Internal. Tried to get connection id but connection was never open"
    );
  }

  function applyOps<O extends HistoryOp<P>>(
    rawOps: readonly O[],
    isLocal: boolean
  ): {
    // Input Ops can get opIds assigned during application.
    ops: O[];
    reverse: O[];
    updates: {
      storageUpdates: Map<string, StorageUpdate>;
      presence: boolean;
    };
  } {
    const output = {
      reverse: [] as O[],
      storageUpdates: new Map<string, StorageUpdate>(),
      presence: false,
    };

    const createdNodeIds = new Set<string>();

    // Ops applied after undo/redo won't have opIds assigned, yet. Let's do
    // that right now first.
    const ops = rawOps.map((op) => {
      if (op.type !== "presence" && !op.opId) {
        return { ...op, opId: pool.generateOpId() };
      } else {
        return op;
      }
    });

    for (const op of ops) {
      if (op.type === "presence") {
        const reverse = {
          type: "presence" as const,
          data: {} as P,
        };

        for (const key in op.data) {
          reverse.data[key] = context.myPresence.current[key];
        }

        context.myPresence.patch(op.data);

        if (context.buffer.presenceUpdates === null) {
          context.buffer.presenceUpdates = { type: "partial", data: op.data };
        } else {
          // Merge the new fields with whatever is already queued up (doesn't
          // matter whether its a partial or full update)
          for (const key in op.data) {
            context.buffer.presenceUpdates.data[key] = op.data[key];
          }
        }

        output.reverse.unshift(reverse as O);
        output.presence = true;
      } else {
        let source: OpSource;

        if (isLocal) {
          source = OpSource.UNDOREDO_RECONNECT;
        } else {
          const opId = nn(op.opId);
          if (process.env.NODE_ENV !== "production") {
            nn(context.opStackTraces).delete(opId);
          }

          const deleted = context.unacknowledgedOps.delete(opId);
          source = deleted ? OpSource.ACK : OpSource.REMOTE;
        }

        const applyOpResult = applyOp(op, source);
        if (applyOpResult.modified) {
          const nodeId = applyOpResult.modified.node._id;

          // If the modified node is not the root (undefined) and was created in the same batch, we don't want to notify
          // storage updates for the children.
          if (!(nodeId && createdNodeIds.has(nodeId))) {
            output.storageUpdates.set(
              nn(applyOpResult.modified.node._id),
              mergeStorageUpdates(
                output.storageUpdates.get(nn(applyOpResult.modified.node._id)),
                applyOpResult.modified
              )
            );
            output.reverse.unshift(...(applyOpResult.reverse as O[]));
          }

          if (
            op.type === OpCode.CREATE_LIST ||
            op.type === OpCode.CREATE_MAP ||
            op.type === OpCode.CREATE_OBJECT
          ) {
            createdNodeIds.add(nn(op.id));
          }
        }
      }
    }

    return {
      ops,
      reverse: output.reverse,
      updates: {
        storageUpdates: output.storageUpdates,
        presence: output.presence,
      },
    };
  }

  function applyOp(op: Op, source: OpSource): ApplyResult {
    // Explicit case to handle incoming "AckOp"s, which are supposed to be
    // no-ops.
    if (isAckOp(op)) {
      return { modified: false };
    }

    switch (op.type) {
      case OpCode.DELETE_OBJECT_KEY:
      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_CRDT: {
        const node = context.nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }

        return node._apply(op, source === OpSource.UNDOREDO_RECONNECT);
      }

      case OpCode.SET_PARENT_KEY: {
        const node = context.nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }

        if (node.parent.type === "HasParent" && isLiveList(node.parent.node)) {
          return node.parent.node._setChildKey(
            asPos(op.parentKey),
            node,
            source
          );
        }
        return { modified: false };
      }
      case OpCode.CREATE_OBJECT:
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER: {
        if (op.parentId === undefined) {
          return { modified: false };
        }

        const parentNode = context.nodes.get(op.parentId);
        if (parentNode === undefined) {
          return { modified: false };
        }

        return parentNode._attachChild(op, source);
      }
    }
  }

  function updatePresence(
    patch: Partial<P>,
    options?: { addToHistory: boolean }
  ) {
    const oldValues = {} as P;

    if (context.buffer.presenceUpdates === null) {
      // try {
      context.buffer.presenceUpdates = {
        type: "partial",
        data: {},
      };
      // } catch (err) {
      //   window.console.log({ context, patch, err });
      //   throw err;
      // }
    }

    for (const key in patch) {
      type K = typeof key;
      const overrideValue: P[K] | undefined = patch[key];
      if (overrideValue === undefined) {
        continue;
      }
      context.buffer.presenceUpdates.data[key] = overrideValue;
      oldValues[key] = context.myPresence.current[key];
    }

    context.myPresence.patch(patch);

    if (context.activeBatch) {
      if (options?.addToHistory) {
        context.activeBatch.reverseOps.unshift({
          type: "presence",
          data: oldValues,
        });
      }
      context.activeBatch.updates.presence = true;
    } else {
      flushNowOrSoon();
      batchUpdates(() => {
        if (options?.addToHistory) {
          addToUndoStack(
            [{ type: "presence", data: oldValues }],
            doNotBatchUpdates
          );
        }
        notify({ presence: true }, doNotBatchUpdates);
      });
    }
  }

  function onUpdatePresenceMessage(
    message: UpdatePresenceServerMsg<P>
  ): InternalOthersEvent<P, U> | undefined {
    if (message.targetActor !== undefined) {
      // The incoming message is a full presence update. We are obliged to
      // handle it if `targetActor` matches our own connection ID, but we can
      // use the opportunity to effectively reset the known presence as
      // a "keyframe" update, while we have free access to it.
      const oldUser = context.others.getUser(message.actor);
      context.others.setOther(message.actor, message.data);

      const newUser = context.others.getUser(message.actor);
      if (oldUser === undefined && newUser !== undefined) {
        // The user just became "visible" due to this update, so fire the
        // "enter" event
        return { type: "enter", user: newUser };
      }
    } else {
      // The incoming message is a partial presence update
      context.others.patchOther(message.actor, message.data), message;
    }

    const user = context.others.getUser(message.actor);
    if (user) {
      return {
        type: "update",
        updates: message.data,
        user,
      };
    } else {
      return undefined;
    }
  }

  function onUserLeftMessage(
    message: UserLeftServerMsg
  ): InternalOthersEvent<P, U> | null {
    const user = context.others.getUser(message.actor);
    if (user) {
      context.others.removeConnection(message.actor);
      return { type: "leave", user };
    }
    return null;
  }

  function onRoomStateMessage(
    message: RoomStateServerMsg<U>,
    batchedUpdatesWrapper: (cb: () => void) => void
  ): InternalOthersEvent<P, U> {
    // The server will inform the client about its assigned actor ID and scopes
    context.dynamicSessionInfo.set({
      actor: message.actor,
      nonce: message.nonce,
      scopes: message.scopes,
    });
    context.idFactory = makeIdFactory(message.actor);
    notifySelfChanged(batchedUpdatesWrapper);

    for (const connectionId of context.others.connectionIds()) {
      const user = message.users[connectionId];
      if (user === undefined) {
        context.others.removeConnection(connectionId);
      }
    }

    for (const key in message.users) {
      const user = message.users[key];
      const connectionId = Number(key);
      context.others.setConnection(
        connectionId,
        user.id,
        user.info,
        user.scopes
      );
    }

    // NOTE: We could be notifying the "others" event here, but the reality is
    // that ROOM_STATE is often the first message to be received from the
    // server, and it won't contain all the information needed to update the
    // other views yet. Instead, we'll let the others' presences trickle in,
    // and notify each time that happens.
    return { type: "reset" };
  }

  function canUndo() { return context.undoStack.length > 0; } // prettier-ignore
  function canRedo() { return context.redoStack.length > 0; } // prettier-ignore
  function onHistoryChange(batchedUpdatesWrapper: (cb: () => void) => void) {
    batchedUpdatesWrapper(() => {
      eventHub.history.notify({ canUndo: canUndo(), canRedo: canRedo() });
    });
  }

  function onUserJoinedMessage(
    message: UserJoinServerMsg<U>
  ): InternalOthersEvent<P, U> | undefined {
    context.others.setConnection(
      message.actor,
      message.id,
      message.info,
      message.scopes
    );
    // Send current presence to new user
    // TODO: Consider storing it on the backend
    context.buffer.messages.push({
      type: ClientMsgCode.UPDATE_PRESENCE,
      data: context.myPresence.current,
      targetActor: message.actor,
    });
    flushNowOrSoon();

    // We recorded the connection, but we won't make the new user visible
    // unless we also know their initial presence data at this point.
    const user = context.others.getUser(message.actor);
    return user ? { type: "enter", user } : undefined;
  }

  function parseServerMessage(data: Json): ServerMsg<P, U, E> | null {
    if (!isJsonObject(data)) {
      return null;
    }

    return data as ServerMsg<P, U, E>;
    //             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FIXME: Properly validate incoming external data instead!
  }

  function parseServerMessages(text: string): ServerMsg<P, U, E>[] | null {
    const data: Json | undefined = tryParseJson(text);
    if (data === undefined) {
      return null;
    } else if (isJsonArray(data)) {
      return compact(data.map((item) => parseServerMessage(item)));
    } else {
      return compact([parseServerMessage(data)]);
    }
  }

  function applyAndSendOps(
    offlineOps: Map<string, Op>,
    batchedUpdatesWrapper: (cb: () => void) => void
  ) {
    if (offlineOps.size === 0) {
      return;
    }

    const messages: ClientMsg<P, E>[] = [];

    const ops = Array.from(offlineOps.values());

    const result = applyOps(ops, true);

    messages.push({
      type: ClientMsgCode.UPDATE_STORAGE,
      ops: result.ops,
    });

    notify(result.updates, batchedUpdatesWrapper);

    sendMessages(messages);
  }

  /**
   * Handles a message received on the WebSocket. Will never be a "pong". The
   * "pong" is handled at the connection manager level.
   */
  function handleServerMessage(event: IWebSocketMessageEvent) {
    if (typeof event.data !== "string") {
      // istanbul ignore next: Unknown incoming message
      return;
    }

    const messages = parseServerMessages(event.data);
    if (messages === null || messages.length === 0) {
      // istanbul ignore next: Unknown incoming message
      return;
    }

    const updates = {
      storageUpdates: new Map<string, StorageUpdate>(),
      others: [] as InternalOthersEvent<P, U>[],
    };

    batchUpdates(() => {
      for (const message of messages) {
        switch (message.type) {
          case ServerMsgCode.USER_JOINED: {
            const userJoinedUpdate = onUserJoinedMessage(message);
            if (userJoinedUpdate) {
              updates.others.push(userJoinedUpdate);
            }
            break;
          }

          case ServerMsgCode.UPDATE_PRESENCE: {
            const othersPresenceUpdate = onUpdatePresenceMessage(message);
            if (othersPresenceUpdate) {
              updates.others.push(othersPresenceUpdate);
            }
            break;
          }

          case ServerMsgCode.BROADCASTED_EVENT: {
            const others = context.others.current;
            eventHub.customEvent.notify({
              connectionId: message.actor,
              user:
                message.actor < 0
                  ? null
                  : others.find((u) => u.connectionId === message.actor) ??
                    null,
              event: message.event,
            });
            break;
          }

          case ServerMsgCode.USER_LEFT: {
            const event = onUserLeftMessage(message);
            if (event) {
              updates.others.push(event);
            }
            break;
          }

          case ServerMsgCode.UPDATE_YDOC: {
            eventHub.ydoc.notify(message);
            break;
          }

          case ServerMsgCode.ROOM_STATE: {
            updates.others.push(onRoomStateMessage(message, doNotBatchUpdates));
            break;
          }

          case ServerMsgCode.INITIAL_STORAGE_STATE: {
            // createOrUpdateRootFromMessage function could add ops to offlineOperations.
            // Client shouldn't resend these ops as part of the offline ops sending after reconnect.
            processInitialStorage(message);
            break;
          }
          // Write event
          case ServerMsgCode.UPDATE_STORAGE: {
            const applyResult = applyOps(message.ops, false);
            for (const [key, value] of applyResult.updates.storageUpdates) {
              updates.storageUpdates.set(
                key,
                mergeStorageUpdates(updates.storageUpdates.get(key), value)
              );
            }
            break;
          }

          // Receiving a RejectedOps message in the client means that the server is no
          // longer in sync with the client. Trying to synchronize the client again by
          // rolling back particular Ops may be hard/impossible. It's fine to not try and
          // accept the out-of-sync reality and throw an error. We look at this kind of bug
          // as a developer-owned bug. In production, these errors are not expected to happen.
          case ServerMsgCode.REJECT_STORAGE_OP: {
            console.errorWithTitle(
              "Storage mutation rejection error",
              message.reason
            );

            if (process.env.NODE_ENV !== "production") {
              const traces: Set<string> = new Set();
              for (const opId of message.opIds) {
                const trace = context.opStackTraces?.get(opId);
                if (trace) {
                  traces.add(trace);
                }
              }

              if (traces.size > 0) {
                console.warnWithTitle(
                  "The following function calls caused the rejected storage mutations:",
                  `\n\n${Array.from(traces).join("\n\n")}`
                );
              }

              throw new Error(
                `Storage mutations rejected by server: ${message.reason}`
              );
            }

            break;
          }

          case ServerMsgCode.THREAD_CREATED:
          case ServerMsgCode.THREAD_DELETED:
          case ServerMsgCode.THREAD_METADATA_UPDATED:
          case ServerMsgCode.THREAD_UPDATED:
          case ServerMsgCode.COMMENT_REACTION_ADDED:
          case ServerMsgCode.COMMENT_REACTION_REMOVED:
          case ServerMsgCode.COMMENT_CREATED:
          case ServerMsgCode.COMMENT_EDITED:
          case ServerMsgCode.COMMENT_DELETED: {
            eventHub.comments.notify(message);
            break;
          }
        }
      }

      notify(updates, doNotBatchUpdates);
    });
  }

  function flushNowOrSoon() {
    const storageOps = context.buffer.storageOperations;
    if (storageOps.length > 0) {
      for (const op of storageOps) {
        context.unacknowledgedOps.set(nn(op.opId), op);
      }
      notifyStorageStatus();
    }

    if (managedSocket.getStatus() !== "connected") {
      context.buffer.storageOperations = [];
      return;
    }

    const now = Date.now();
    const elapsedMillis = now - context.buffer.lastFlushedAt;

    if (elapsedMillis >= config.throttleDelay) {
      // Flush the buffer right now
      const messagesToFlush = serializeBuffer();
      if (messagesToFlush.length === 0) {
        return;
      }

      sendMessages(messagesToFlush);
      context.buffer = {
        flushTimerID: undefined,
        lastFlushedAt: now,
        messages: [],
        storageOperations: [],
        presenceUpdates: null,
      };
    } else {
      // Or schedule the flush a few millis into the future
      clearTimeout(context.buffer.flushTimerID);
      context.buffer.flushTimerID = setTimeout(
        flushNowOrSoon,
        config.throttleDelay - elapsedMillis
      );
    }
  }

  /**
   * Returns a list of ClientMsgs to flush to the network, computed from all
   * pending changes in the buffer. Has no side effects.
   */
  function serializeBuffer() {
    const messages: ClientMsg<P, E>[] = [];
    if (context.buffer.presenceUpdates) {
      messages.push(
        context.buffer.presenceUpdates.type === "full"
          ? {
              type: ClientMsgCode.UPDATE_PRESENCE,
              // Populating the `targetActor` field turns this message into
              // a Full Presence™ update message (not a patch), which will get
              // interpreted by other clients as such.
              targetActor: -1,
              data: context.buffer.presenceUpdates.data,
            }
          : {
              type: ClientMsgCode.UPDATE_PRESENCE,
              data: context.buffer.presenceUpdates.data,
            }
      );
    }
    for (const event of context.buffer.messages) {
      messages.push(event);
    }
    if (context.buffer.storageOperations.length > 0) {
      messages.push({
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: context.buffer.storageOperations,
      });
    }
    return messages;
  }

  function updateYDoc(update: string, guid?: string) {
    const clientMsg: UpdateYDocClientMsg = {
      type: ClientMsgCode.UPDATE_YDOC,
      update,
      guid,
    };
    context.buffer.messages.push(clientMsg);
    eventHub.ydoc.notify(clientMsg);
    flushNowOrSoon();
  }

  function broadcastEvent(
    event: E,
    options: BroadcastOptions = {
      shouldQueueEventIfNotReady: false,
    }
  ) {
    if (
      managedSocket.getStatus() !== "connected" &&
      !options.shouldQueueEventIfNotReady
    ) {
      return;
    }

    context.buffer.messages.push({
      type: ClientMsgCode.BROADCAST_EVENT,
      event,
    });
    flushNowOrSoon();
  }

  function dispatchOps(ops: Op[]) {
    const { storageOperations } = context.buffer;
    for (const op of ops) {
      storageOperations.push(op);
    }
    flushNowOrSoon();
  }

  let _getStorage$: Promise<void> | null = null;
  let _resolveStoragePromise: (() => void) | null = null;

  function processInitialStorage(message: InitialDocumentStateServerMsg) {
    const unacknowledgedOps = new Map(context.unacknowledgedOps);
    createOrUpdateRootFromMessage(message, doNotBatchUpdates);
    applyAndSendOps(unacknowledgedOps, doNotBatchUpdates);
    _resolveStoragePromise?.();
    notifyStorageStatus();
    eventHub.storageDidLoad.notify();
  }

  async function streamStorage() {
    if (!managedSocket.authValue) {
      return;
    }
    // TODO: Handle potential race conditions where the room get disconnected while the request is pending
    const result = await streamFetch(managedSocket.authValue, config.roomId);
    const items = (await result.json()) as IdTuple<SerializedCrdt>[];
    processInitialStorage({ type: ServerMsgCode.INITIAL_STORAGE_STATE, items });
  }

  function refreshStorage(options: { flush: boolean }) {
    const messages = context.buffer.messages;
    if (config.unstable_streamData) {
      // instead of sending a fetch message over WS, stream over HTTP
      void streamStorage();
    } else if (
      !messages.some((msg) => msg.type === ClientMsgCode.FETCH_STORAGE)
    ) {
      // Only add the fetch message to the outgoing message queue if it isn't
      // already there
      messages.push({ type: ClientMsgCode.FETCH_STORAGE });
    }

    if (options.flush) {
      flushNowOrSoon();
    }
  }

  function startLoadingStorage(): Promise<void> {
    if (_getStorage$ === null) {
      refreshStorage({ flush: true });
      _getStorage$ = new Promise((resolve) => {
        _resolveStoragePromise = resolve;
      });
      notifyStorageStatus();
    }
    return _getStorage$;
  }

  /**
   * Closely related to .getStorage(), but synchronously. Will be `null`
   * initially. When requested for the first time, will kick off the loading of
   * Storage if it hasn't happened yet.
   *
   * Once Storage is loaded, will return a stable reference to the storage
   * root.
   */
  function getStorageSnapshot(): LiveObject<S> | null {
    const root = context.root;
    if (root !== undefined) {
      // Done loading
      return root;
    } else {
      // Not done loading, kick off the loading (will not do anything if already kicked off)
      void startLoadingStorage();
      return null;
    }
  }

  async function getStorage(): Promise<{
    root: LiveObject<S>;
  }> {
    if (context.root !== undefined) {
      // Store has already loaded, so we can resolve it directly
      return Promise.resolve({
        root: context.root,
      });
    }

    await startLoadingStorage();
    return {
      root: nn(context.root) as LiveObject<S>,
    };
  }

  function fetchYDoc(vector: string, guid?: string): void {
    // don't allow multiple fetches in the same buffer with the same vector
    // dev tools may also call with a different vector (if its opened later), and that's okay
    // because the updates will be ignored by the provider
    if (
      !context.buffer.messages.find((m) => {
        return (
          m.type === ClientMsgCode.FETCH_YDOC &&
          m.vector === vector &&
          m.guid === guid
        );
      })
    ) {
      context.buffer.messages.push({
        type: ClientMsgCode.FETCH_YDOC,
        vector,
        guid,
      });
    }

    flushNowOrSoon();
  }

  function undo() {
    if (context.activeBatch) {
      throw new Error("undo is not allowed during a batch");
    }
    const historyOps = context.undoStack.pop();
    if (historyOps === undefined) {
      return;
    }

    context.pausedHistory = null;
    const result = applyOps(historyOps, true);

    batchUpdates(() => {
      notify(result.updates, doNotBatchUpdates);
      context.redoStack.push(result.reverse);
      onHistoryChange(doNotBatchUpdates);
    });

    for (const op of result.ops) {
      if (op.type !== "presence") {
        context.buffer.storageOperations.push(op);
      }
    }
    flushNowOrSoon();
  }

  function redo() {
    if (context.activeBatch) {
      throw new Error("redo is not allowed during a batch");
    }

    const historyOps = context.redoStack.pop();
    if (historyOps === undefined) {
      return;
    }

    context.pausedHistory = null;
    const result = applyOps(historyOps, true);

    batchUpdates(() => {
      notify(result.updates, doNotBatchUpdates);
      context.undoStack.push(result.reverse);
      onHistoryChange(doNotBatchUpdates);
    });

    for (const op of result.ops) {
      if (op.type !== "presence") {
        context.buffer.storageOperations.push(op);
      }
    }
    flushNowOrSoon();
  }

  function clear() {
    context.undoStack.length = 0;
    context.redoStack.length = 0;
  }

  function batch<T>(callback: () => T): T {
    if (context.activeBatch) {
      // If there already is an active batch, we don't have to handle this in
      // any special way. That outer active batch will handle the batch. This
      // nested call can be a no-op.
      return callback();
    }

    let returnValue: T = undefined as unknown as T;

    batchUpdates(() => {
      context.activeBatch = {
        ops: [],
        updates: {
          storageUpdates: new Map(),
          presence: false,
          others: [],
        },
        reverseOps: [],
      };
      try {
        returnValue = callback();
      } finally {
        // "Pop" the current batch of the state, closing the active batch, but
        // handling it separately here
        const currentBatch = context.activeBatch;
        context.activeBatch = null;

        if (currentBatch.reverseOps.length > 0) {
          addToUndoStack(currentBatch.reverseOps, doNotBatchUpdates);
        }

        if (currentBatch.ops.length > 0) {
          // Only clear the redo stack if something has changed during a batch
          // Clear the redo stack because batch is always called from a local operation
          context.redoStack.length = 0;
        }

        if (currentBatch.ops.length > 0) {
          dispatchOps(currentBatch.ops);
        }

        notify(currentBatch.updates, doNotBatchUpdates);
        flushNowOrSoon();
      }
    });

    return returnValue;
  }

  function pauseHistory() {
    if (context.pausedHistory === null) {
      context.pausedHistory = [];
    }
  }

  function resumeHistory() {
    const historyOps = context.pausedHistory;
    context.pausedHistory = null;
    if (historyOps !== null && historyOps.length > 0) {
      _addToRealUndoStack(historyOps, batchUpdates);
    }
  }

  function getStorageStatus(): StorageStatus {
    if (context.root === undefined) {
      return _getStorage$ === null ? "not-loaded" : "loading";
    } else {
      return context.unacknowledgedOps.size === 0
        ? "synchronized"
        : "synchronizing";
    }
  }

  /**
   * Storage status is a computed value based other internal states so we need to keep a reference to the previous computed value to avoid triggering events when it does not change
   * This is far from ideal because we need to call this function whenever we update our internal states.
   *
   * TODO: Encapsulate our internal state differently to make sure this event is triggered whenever necessary.
   * Currently okay because we only have 4 callers and shielded by tests.
   */
  let _lastStorageStatus = getStorageStatus();
  function notifyStorageStatus() {
    const storageStatus = getStorageStatus();
    if (_lastStorageStatus !== storageStatus) {
      _lastStorageStatus = storageStatus;
      eventHub.storageStatus.notify(storageStatus);
    }
  }

  function isPresenceReady() {
    return self.current !== null;
  }

  async function waitUntilPresenceReady(): Promise<void> {
    while (!isPresenceReady()) {
      const { promise, resolve } = Promise_withResolvers();

      const unsub1 = events.self.subscribeOnce(resolve);
      const unsub2 = events.status.subscribeOnce(resolve);
      // Return whenever one of these returns, whichever is first
      await promise;
      unsub1();
      unsub2();
    }
  }

  function isStorageReady() {
    return getStorageSnapshot() !== null;
  }

  async function waitUntilStorageReady(): Promise<void> {
    while (!isStorageReady()) {
      // Trigger a load of Storage and wait until it finished
      await getStorage();
    }
  }

  // Derived cached state for use in DevTools
  const others_forDevTools = new DerivedRef(context.others, (others) =>
    others.map((other, index) => userToTreeNode(`Other ${index}`, other))
  );

  const events = {
    status: eventHub.status.observable,
    lostConnection: eventHub.lostConnection.observable,

    customEvent: eventHub.customEvent.observable,
    others: eventHub.others.observable,
    self: eventHub.self.observable,
    myPresence: eventHub.myPresence.observable,
    error: eventHub.error.observable,
    /** @deprecated */
    storage: eventHub.storageBatch.observable,
    storageBatch: eventHub.storageBatch.observable,
    history: eventHub.history.observable,
    storageDidLoad: eventHub.storageDidLoad.observable,
    storageStatus: eventHub.storageStatus.observable,
    ydoc: eventHub.ydoc.observable,

    comments: eventHub.comments.observable,
  };

  async function fetchCommentsApi(
    endpoint: string,
    params?: QueryParams,
    options?: RequestInit
  ): Promise<Response> {
    // TODO: Use the right scope
    const authValue = await delegates.authenticate();

    return fetchClientApi(config.roomId, endpoint, authValue, options, params);
  }

  async function fetchCommentsJson<T>(
    endpoint: string,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await fetchCommentsApi(endpoint, params, options);

    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: CommentsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new CommentsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new CommentsApiError(response.statusText, response.status);
        }

        throw error;
      }
    }

    let body;

    try {
      body = (await response.json()) as T;
    } catch {
      body = {} as T;
    }

    return body;
  }

  async function getThreadsSince(options: { since: Date }) {
    const response = await fetchCommentsApi(
      "/threads",
      {
        since: options?.since?.toISOString(),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const json = await (response.json() as Promise<{
        data: ThreadDataPlain<M>[];
        inboxNotifications: InboxNotificationDataPlain[];
        deletedThreads: ThreadDeleteInfoPlain[];
        deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
        meta: {
          requestedAt: string;
        };
      }>);

      return {
        threads: {
          updated: json.data.map(convertToThreadData),
          deleted: json.deletedThreads.map(convertToThreadDeleteInfo),
        },
        inboxNotifications: {
          updated: json.inboxNotifications.map(convertToInboxNotificationData),
          deleted: json.deletedInboxNotifications.map(
            convertToInboxNotificationDeleteInfo
          ),
        },
        requestedAt: new Date(json.meta.requestedAt),
      };
    } else if (response.status === 404) {
      return {
        threads: {
          updated: [],
          deleted: [],
        },
        inboxNotifications: {
          updated: [],
          deleted: [],
        },
        requestedAt: new Date(),
      };
    } else {
      throw new Error("There was an error while getting threads.");
    }
  }

  async function getThreads(options?: GetThreadsOptions<M>) {
    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const response = await fetchCommentsApi(
      "/threads",
      {
        query,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const json = await (response.json() as Promise<{
        data: ThreadDataPlain<M>[];
        inboxNotifications: InboxNotificationDataPlain[];
        deletedThreads: ThreadDeleteInfoPlain[];
        deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
        meta: {
          requestedAt: string;
        };
      }>);

      return {
        threads: json.data.map(convertToThreadData),
        inboxNotifications: json.inboxNotifications.map(
          convertToInboxNotificationData
        ),
        requestedAt: new Date(json.meta.requestedAt),
      };
    } else if (response.status === 404) {
      return {
        threads: [],
        inboxNotifications: [],
        deletedThreads: [],
        deletedInboxNotifications: [],
        requestedAt: new Date(),
      };
    } else {
      throw new Error("There was an error while getting threads.");
    }
  }

  async function getThread(threadId: string) {
    const response = await fetchCommentsApi(
      `/thread-with-notification/${threadId}`
    );

    if (response.ok) {
      const json = (await response.json()) as {
        thread: ThreadDataPlain<M>;
        inboxNotification?: InboxNotificationDataPlain;
      };

      return {
        thread: convertToThreadData(json.thread),
        inboxNotification: json.inboxNotification
          ? convertToInboxNotificationData(json.inboxNotification)
          : undefined,
      };
    } else if (response.status === 404) {
      return {
        thread: undefined,
        inboxNotification: undefined,
      };
    } else {
      throw new Error(`There was an error while getting thread ${threadId}.`);
    }
  }

  async function createThread({
    metadata,
    body,
    commentId = createCommentId(),
    threadId = createThreadId(),
    attachmentIds,
  }: {
    roomId: string;
    threadId?: string;
    commentId?: string;
    metadata: M | undefined;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const thread = await fetchCommentsJson<ThreadDataPlain<M>>("/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: threadId,
        comment: {
          id: commentId,
          body,
          attachmentIds,
        },
        metadata,
      }),
    });

    return convertToThreadData(thread);
  }

  async function deleteThread(threadId: string) {
    await fetchCommentsJson(`/threads/${encodeURIComponent(threadId)}`, {
      method: "DELETE",
    });
  }

  async function editThreadMetadata({
    metadata,
    threadId,
  }: {
    roomId: string;
    metadata: Patchable<M>;
    threadId: string;
  }) {
    return await fetchCommentsJson<M>(
      `/threads/${encodeURIComponent(threadId)}/metadata`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );
  }

  async function markThreadAsResolved(threadId: string) {
    await fetchCommentsJson(
      `/threads/${encodeURIComponent(threadId)}/mark-as-resolved`,
      {
        method: "POST",
      }
    );
  }

  async function markThreadAsUnresolved(threadId: string) {
    await fetchCommentsJson(
      `/threads/${encodeURIComponent(threadId)}/mark-as-unresolved`,
      {
        method: "POST",
      }
    );
  }

  async function createComment({
    threadId,
    commentId = createCommentId(),
    body,
    attachmentIds,
  }: {
    threadId: string;
    commentId?: string;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const comment = await fetchCommentsJson<CommentDataPlain>(
      `/threads/${encodeURIComponent(threadId)}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: commentId,
          body,
          attachmentIds,
        }),
      }
    );

    return convertToCommentData(comment);
  }

  async function editComment({
    threadId,
    commentId,
    body,
    attachmentIds,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const comment = await fetchCommentsJson<CommentDataPlain>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
          attachmentIds,
        }),
      }
    );

    return convertToCommentData(comment);
  }

  async function deleteComment({
    threadId,
    commentId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
  }) {
    await fetchCommentsJson(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}`,
      {
        method: "DELETE",
      }
    );
  }

  async function addReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    const reaction = await fetchCommentsJson<CommentUserReactionPlain>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}/reactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emoji }),
      }
    );

    return convertToCommentUserReaction(reaction);
  }

  async function removeReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    await fetchCommentsJson<CommentData>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: "DELETE",
      }
    );
  }

  function prepareAttachment(file: File): CommentLocalAttachment {
    return {
      type: "localAttachment",
      status: "idle",
      id: createCommentAttachmentId(),
      name: file.name,
      size: file.size,
      mimeType: file.type,
      file,
    };
  }

  async function uploadAttachment(
    attachment: CommentLocalAttachment,
    options: UploadAttachmentOptions = {}
  ): Promise<CommentAttachment> {
    const abortSignal = options.signal;
    const abortError = abortSignal
      ? new DOMException(
          `Upload of attachment ${attachment.id} was aborted.`,
          "AbortError"
        )
      : undefined;

    if (abortSignal?.aborted) {
      throw abortError;
    }

    if (attachment.size <= ATTACHMENT_PART_SIZE) {
      // If the file is small enough, upload it in a single request
      return fetchCommentsJson<CommentAttachment>(
        `/attachments/${encodeURIComponent(attachment.id)}/upload/${encodeURIComponent(attachment.name)}`,
        {
          method: "PUT",
          body: attachment.file,
          signal: abortSignal,
        }
      );
    } else {
      // Otherwise, upload it in multiple parts
      let uploadId: string | undefined;
      const uploadedParts: {
        etag: string;
        partNumber: number;
      }[] = [];

      try {
        // Create a multi-part upload
        const createMultiPartUpload = await fetchCommentsJson<{
          uploadId: string;
          key: string;
        }>(
          `/attachments/${encodeURIComponent(attachment.id)}/multipart/${encodeURIComponent(attachment.name)}`,
          {
            method: "POST",
            signal: abortSignal,
          }
        );

        uploadId = createMultiPartUpload.uploadId;

        const parts = splitFileIntoParts(attachment.file);

        // Check if the upload was aborted
        if (abortSignal?.aborted) {
          throw abortError;
        }

        const batches = chunk(parts, ATTACHMENT_PART_BATCH_SIZE);

        // Batches are uploaded one after the other
        for (const parts of batches) {
          const uploadedPartsPromises: Promise<{
            partNumber: number;
            etag: string;
          }>[] = [];

          for (const { part, partNumber } of parts) {
            uploadedPartsPromises.push(
              fetchCommentsJson<{
                partNumber: number;
                etag: string;
              }>(
                `/attachments/${encodeURIComponent(attachment.id)}/multipart/${encodeURIComponent(uploadId)}/${encodeURIComponent(partNumber)}`,
                {
                  method: "PUT",
                  body: part,
                  signal: abortSignal,
                }
              )
            );
          }

          // Parts are uploaded in parallel
          uploadedParts.push(...(await Promise.all(uploadedPartsPromises)));
        }

        // Check if the upload was aborted
        if (abortSignal?.aborted) {
          throw abortError;
        }

        const sortedUploadedParts = uploadedParts.sort(
          (a, b) => a.partNumber - b.partNumber
        );

        return fetchCommentsJson<CommentAttachment>(
          `/attachments/${encodeURIComponent(attachment.id)}/multipart/${encodeURIComponent(uploadId)}/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ parts: sortedUploadedParts }),
            signal: abortSignal,
          }
        );
      } catch (error) {
        if (
          uploadId &&
          (error as Error)?.name &&
          ((error as Error).name === "AbortError" ||
            (error as Error).name === "TimeoutError")
        ) {
          // Abort the multi-part upload if it was created
          await fetchCommentsApi(
            `/attachments/${encodeURIComponent(attachment.id)}/multipart/${encodeURIComponent(uploadId)}`,
            undefined,
            {
              method: "DELETE",
            }
          );
        }

        throw error;
      }
    }
  }

  // TODO: Add room.events.attachmentUpload (or similar) to listen to upload progress? { attachmentId: string; progress: number; }
  //       Error handling can done by handling `uploadAttachment` rejecting/throwing

  async function getAttachmentUrls(attachmentIds: string[]) {
    const { urls } = await fetchCommentsJson<{ urls: (string | null)[] }>(
      "/attachments/presigned-urls",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attachmentIds }),
      }
    );

    return urls;
  }

  const batchedGetAttachmentUrls = new Batch<string, string>(
    async (batchedAttachmentIds) => {
      const attachmentIds = batchedAttachmentIds.flat();

      const attachmentUrls = await getAttachmentUrls(attachmentIds);

      return attachmentUrls.map(
        (url) =>
          url ??
          new Error("There was an error while getting this attachment's URL")
      );
    },
    { delay: GET_ATTACHMENT_URLS_BATCH_DELAY }
  );
  const attachmentUrlsStore = createBatchStore(batchedGetAttachmentUrls);

  function getAttachmentUrl(attachmentId: string) {
    return batchedGetAttachmentUrls.get(attachmentId);
  }

  async function fetchNotificationsJson<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const authValue = await delegates.authenticate();
    const response = await fetchClientApi(
      config.roomId,
      endpoint,
      authValue,
      options
    );

    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: NotificationsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new NotificationsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new NotificationsApiError(
            response.statusText,
            response.status
          );
        }

        throw error;
      }
    }

    let body;

    try {
      body = (await response.json()) as T;
    } catch {
      body = {} as T;
    }

    return body;
  }

  function getNotificationSettings(): Promise<RoomNotificationSettings> {
    return fetchNotificationsJson<RoomNotificationSettings>(
      "/notification-settings"
    );
  }

  function updateNotificationSettings(
    settings: Partial<RoomNotificationSettings>
  ): Promise<RoomNotificationSettings> {
    return fetchNotificationsJson<RoomNotificationSettings>(
      "/notification-settings",
      {
        method: "POST",
        body: JSON.stringify(settings),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // This method (and the following batch handling) isn't the same as the one in
  // src/notifications.ts, this one is room-based: /v2/c/rooms/:roomId/inbox-notifications/read.
  //
  // The reason for this is that unlike the room-based Comments ones, the Notifications endpoints
  // don't work with a public key. Since `markThreadAsRead` needs to mark the related inbox notifications
  // as read, this room-based method is necessary to keep all Comments features working with a public key.
  async function markInboxNotificationsAsRead(inboxNotificationIds: string[]) {
    await fetchNotificationsJson("/inbox-notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inboxNotificationIds }),
    });
  }

  const batchedMarkInboxNotificationsAsRead = new Batch<string, string>(
    async (batchedInboxNotificationIds) => {
      const inboxNotificationIds = batchedInboxNotificationIds.flat();

      await markInboxNotificationsAsRead(inboxNotificationIds);

      return inboxNotificationIds;
    },
    { delay: MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY }
  );

  async function markInboxNotificationAsRead(inboxNotificationId: string) {
    await batchedMarkInboxNotificationsAsRead.get(inboxNotificationId);
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        get presenceBuffer() { return deepClone(context.buffer.presenceUpdates?.data ?? null) }, // prettier-ignore
        get undoStack() { return deepClone(context.undoStack) }, // prettier-ignore
        get nodeCount() { return context.nodes.size }, // prettier-ignore

        getProvider() {
          return context.provider;
        },

        setProvider(provider: Provider | undefined) {
          context.provider = provider;
          context.onProviderUpdate.notify();
        },

        onProviderUpdate: context.onProviderUpdate.observable,

        // send metadata when using a text editor
        reportTextEditor,
        // create a text mention when using a text editor
        createTextMention,
        // delete a text mention when using a text editor
        deleteTextMention,

        // Support for the Liveblocks browser extension
        getSelf_forDevTools: () => selfAsTreeNode.current,
        getOthers_forDevTools: (): readonly DevTools.UserTreeNode[] =>
          others_forDevTools.current,

        // prettier-ignore
        simulate: {
          // These exist only for our E2E testing app
          explicitClose: (event) => managedSocket._privateSendMachineEvent({ type: "EXPLICIT_SOCKET_CLOSE", event }),
          rawSend: (data) => managedSocket.send(data),
        },

        attachmentUrlsStore,
      },

      id: config.roomId,
      subscribe: makeClassicSubscribeFn(events),

      connect: () => managedSocket.connect(),
      reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),
      destroy: () => {
        uninstallBgTabSpy();
        managedSocket.destroy();
      },

      // Presence
      updatePresence,
      updateYDoc,
      broadcastEvent,

      // Storage
      batch,
      history: {
        undo,
        redo,
        canUndo,
        canRedo,
        clear,
        pause: pauseHistory,
        resume: resumeHistory,
      },

      fetchYDoc,
      getStorage,
      getStorageSnapshot,
      getStorageStatus,

      isPresenceReady,
      isStorageReady,
      waitUntilPresenceReady: memoizeOnSuccess(waitUntilPresenceReady),
      waitUntilStorageReady: memoizeOnSuccess(waitUntilStorageReady),

      events,

      // Core
      getStatus: () => managedSocket.getStatus(),
      getSelf: () => self.current,

      // Presence
      getPresence: () => context.myPresence.current,
      getOthers: () => context.others.current,

      // Comments
      getThreads,
      getThreadsSince,
      getThread,
      createThread,
      deleteThread,
      editThreadMetadata,
      markThreadAsResolved,
      markThreadAsUnresolved,
      createComment,
      editComment,
      deleteComment,
      addReaction,
      removeReaction,
      prepareAttachment,
      uploadAttachment,
      getAttachmentUrl,

      // Notifications
      getNotificationSettings,
      updateNotificationSettings,
      markInboxNotificationAsRead,
    },

    // Explictly make the internal field non-enumerable, to avoid aggressive
    // freezing when used with Immer
    kInternal,
    { enumerable: false }
  );
}

/**
 * @internal
 * This recreates the classic single `.subscribe()` method for the Room API, as
 * documented here https://liveblocks.io/docs/api-reference/liveblocks-client#Room.subscribe(storageItem)
 */
function makeClassicSubscribeFn<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(events: Room<P, S, U, E, M>["events"]): SubscribeFn<P, S, U, E> {
  // Set up the "subscribe" wrapper API
  function subscribeToLiveStructureDeeply<L extends LiveStructure>(
    node: L,
    callback: (updates: StorageUpdate[]) => void
  ): () => void {
    return events.storageBatch.subscribe((updates) => {
      const relatedUpdates = updates.filter((update) =>
        isSameNodeOrChildOf(update.node, node)
      );
      if (relatedUpdates.length > 0) {
        callback(relatedUpdates);
      }
    });
  }

  function subscribeToLiveStructureShallowly<L extends LiveStructure>(
    node: L,
    callback: (node: L) => void
  ): () => void {
    return events.storageBatch.subscribe((updates) => {
      for (const update of updates) {
        if (update.node._id === node._id) {
          callback(update.node as L);
        }
      }
    });
  }

  // Generic storage callbacks
  function subscribe(callback: StorageCallback): () => void; // prettier-ignore
  // Storage callbacks filtered by Live structure
  function subscribe<L extends LiveStructure>(liveStructure: L, callback: (node: L) => void): () => void; // prettier-ignore
  function subscribe(node: LiveStructure, callback: StorageCallback, options: { isDeep: true }): () => void; // prettier-ignore
  // Room event callbacks
  function subscribe<K extends RoomEventName>(type: K, listener: RoomEventCallbackFor<K, P, U, E>): () => void; // prettier-ignore

  function subscribe<L extends LiveStructure, K extends RoomEventName>(
    first: StorageCallback | L | K,
    second?: ((node: L) => void) | StorageCallback | RoomEventCallback,
    options?: { isDeep: boolean }
  ): () => void {
    if (typeof first === "string" && isRoomEventName(first)) {
      if (typeof second !== "function") {
        throw new Error("Second argument must be a callback function");
      }
      const callback = second;
      switch (first) {
        case "event":
          return events.customEvent.subscribe(
            callback as Callback<RoomEventMessage<P, U, E>>
          );

        case "my-presence":
          return events.myPresence.subscribe(callback as Callback<P>);

        case "others": {
          // NOTE: Others have a different callback structure, where the API
          // exposed on the outside takes _two_ callback arguments!
          const cb = callback as LegacyOthersEventCallback<P, U>;
          return events.others.subscribe((event) => {
            const { others, ...internalEvent } = event;
            return cb(others, internalEvent);
          });
        }

        case "error":
          return events.error.subscribe(callback as Callback<Error>);

        case "status":
          return events.status.subscribe(callback as Callback<Status>);

        case "lost-connection":
          return events.lostConnection.subscribe(
            callback as Callback<LostConnectionEvent>
          );

        case "history":
          return events.history.subscribe(callback as Callback<HistoryEvent>);

        case "storage-status":
          return events.storageStatus.subscribe(
            callback as Callback<StorageStatus>
          );

        case "comments":
          return events.comments.subscribe(
            callback as Callback<CommentsEventServerMsg>
          );

        // istanbul ignore next
        default:
          return assertNever(
            first,
            `"${String(first)}" is not a valid event name`
          );
      }
    }

    if (second === undefined || typeof first === "function") {
      if (typeof first === "function") {
        const storageCallback = first;
        return events.storageBatch.subscribe(storageCallback);
      } else {
        // istanbul ignore next
        throw new Error("Please specify a listener callback");
      }
    }

    if (isLiveNode(first)) {
      const node = first;
      if (options?.isDeep) {
        const storageCallback = second as StorageCallback;
        return subscribeToLiveStructureDeeply(node, storageCallback);
      } else {
        const nodeCallback = second as (node: L) => void;
        return subscribeToLiveStructureShallowly(node, nodeCallback);
      }
    }

    throw new Error(
      `${String(first)} is not a value that can be subscribed to.`
    );
  }

  return subscribe;
}

function isRoomEventName(value: string): value is RoomEventName {
  return (
    value === "my-presence" ||
    value === "others" ||
    value === "event" ||
    value === "error" ||
    value === "history" ||
    value === "status" ||
    value === "storage-status" ||
    value === "lost-connection" ||
    value === "connection" ||
    value === "comments"
  );
}

export function makeAuthDelegateForRoom(
  roomId: string,
  authManager: AuthManager
): () => Promise<AuthValue> {
  return async () => {
    return authManager.getAuthValue({ requestedScope: "room:read", roomId });
  };
}

export function makeCreateSocketDelegateForRoom(
  roomId: string,
  baseUrl: string,
  WebSocketPolyfill?: IWebSocket
) {
  return (authValue: AuthValue): IWebSocketInstance => {
    const ws: IWebSocket | undefined =
      WebSocketPolyfill ??
      (typeof WebSocket === "undefined" ? undefined : WebSocket);

    if (ws === undefined) {
      throw new StopRetrying(
        "To use Liveblocks client in a non-DOM environment, you need to provide a WebSocket polyfill."
      );
    }

    const url = new URL(baseUrl);
    url.protocol = url.protocol === "http:" ? "ws" : "wss";
    url.pathname = "/v7";
    url.searchParams.set("roomId", roomId);
    if (authValue.type === "secret") {
      url.searchParams.set("tok", authValue.token.raw);
    } else if (authValue.type === "public") {
      url.searchParams.set("pubkey", authValue.publicApiKey);
    } else {
      return assertNever(authValue, "Unhandled case");
    }
    url.searchParams.set("version", PKG_VERSION || "dev");
    return new ws(url.toString());
  };
}
