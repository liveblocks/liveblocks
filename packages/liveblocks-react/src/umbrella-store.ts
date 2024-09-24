import type {
  AsyncResult,
  BaseMetadata,
  CommentData,
  CommentReaction,
  CommentUserReaction,
  DistributiveOmit,
  HistoryVersion,
  InboxNotificationData,
  InboxNotificationDeleteInfo,
  OpaqueClient,
  Patchable,
  Resolve,
  RoomNotificationSettings,
  Store,
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import {
  compactObject,
  console,
  createStore,
  mapValues,
  nanoid,
  nn,
} from "@liveblocks/core";

import { isMoreRecentlyUpdated } from "./lib/compare";
import type {
  InboxNotificationsAsyncResult,
  RoomNotificationSettingsAsyncResult,
} from "./types";

type OptimisticUpdate<M extends BaseMetadata> =
  | CreateThreadOptimisticUpdate<M>
  | DeleteThreadOptimisticUpdate
  | EditThreadMetadataOptimisticUpdate<M>
  | MarkThreadAsResolvedOptimisticUpdate
  | MarkThreadAsUnresolvedOptimisticUpdate
  | CreateCommentOptimisticUpdate
  | EditCommentOptimisticUpdate
  | DeleteCommentOptimisticUpdate
  | AddReactionOptimisticUpdate
  | RemoveReactionOptimisticUpdate
  | MarkInboxNotificationAsReadOptimisticUpdate
  | MarkAllInboxNotificationsAsReadOptimisticUpdate
  | DeleteInboxNotificationOptimisticUpdate
  | DeleteAllInboxNotificationsOptimisticUpdate
  | UpdateNotificationSettingsOptimisticUpdate;

type CreateThreadOptimisticUpdate<M extends BaseMetadata> = {
  type: "create-thread";
  id: string;
  roomId: string;
  thread: ThreadData<M>;
};

type DeleteThreadOptimisticUpdate = {
  type: "delete-thread";
  id: string;
  roomId: string;
  threadId: string;
  deletedAt: Date;
};

type EditThreadMetadataOptimisticUpdate<M extends BaseMetadata> = {
  type: "edit-thread-metadata";
  id: string;
  threadId: string;
  metadata: Resolve<Patchable<M>>;
  updatedAt: Date;
};

type MarkThreadAsResolvedOptimisticUpdate = {
  type: "mark-thread-as-resolved";
  id: string;
  threadId: string;
  updatedAt: Date;
};

type MarkThreadAsUnresolvedOptimisticUpdate = {
  type: "mark-thread-as-unresolved";
  id: string;
  threadId: string;
  updatedAt: Date;
};

type CreateCommentOptimisticUpdate = {
  type: "create-comment";
  id: string;
  comment: CommentData;
};

type EditCommentOptimisticUpdate = {
  type: "edit-comment";
  id: string;
  comment: CommentData;
};

type DeleteCommentOptimisticUpdate = {
  type: "delete-comment";
  id: string;
  roomId: string;
  threadId: string;
  deletedAt: Date;
  commentId: string;
};

type AddReactionOptimisticUpdate = {
  type: "add-reaction";
  id: string;
  threadId: string;
  commentId: string;
  reaction: CommentUserReaction;
};

type RemoveReactionOptimisticUpdate = {
  type: "remove-reaction";
  id: string;
  threadId: string;
  commentId: string;
  emoji: string;
  userId: string;
  removedAt: Date;
};

type MarkInboxNotificationAsReadOptimisticUpdate = {
  type: "mark-inbox-notification-as-read";
  id: string;
  inboxNotificationId: string;
  readAt: Date;
};

type MarkAllInboxNotificationsAsReadOptimisticUpdate = {
  type: "mark-all-inbox-notifications-as-read";
  id: string;
  readAt: Date;
};

type DeleteInboxNotificationOptimisticUpdate = {
  type: "delete-inbox-notification";
  id: string;
  inboxNotificationId: string;
  deletedAt: Date;
};

type DeleteAllInboxNotificationsOptimisticUpdate = {
  type: "delete-all-inbox-notifications";
  id: string;
  deletedAt: Date;
};

type UpdateNotificationSettingsOptimisticUpdate = {
  type: "update-notification-settings";
  id: string;
  roomId: string;
  settings: Partial<RoomNotificationSettings>;
};

type PaginationState = {
  // XXX Settle on the final form here later! A cursor cannot "just" be
  // XXX a single Date
  cursor: Date;
  isFetchingMore: boolean;
  fetchMoreError?: Error;
  hasFetchedAll: boolean;
};

type QueryAsyncResult = AsyncResult<undefined>;
type PaginatedAsyncResult = AsyncResult<PaginationState>;

const ASYNC_LOADING = Object.freeze({ isLoading: true });
const ASYNC_OK = Object.freeze({ isLoading: false, data: undefined });

// TODO Stop exporting this helper!
export function makeNotificationSettingsQueryKey(roomId: string) {
  return `${roomId}:NOTIFICATION_SETTINGS`;
}

// TODO Stop exporting this helper!
export function makeVersionsQueryKey(roomId: string) {
  return `${roomId}-VERSIONS`;
}

type InternalState<M extends BaseMetadata> = Readonly<{
  // This is a temporary refactoring artifact from Vincent and Nimesh.
  // Each query corresponds to a resource which should eventually have its own type.
  // This is why we split it for now.
  query1: PaginatedAsyncResult | undefined; // Inbox notifications
  queries2: Record<string, QueryAsyncResult>; // Threads
  queries3: Record<string, QueryAsyncResult>; // Notification settings
  queries4: Record<string, QueryAsyncResult>; // Versions

  optimisticUpdates: readonly OptimisticUpdate<M>[];

  rawThreadsById: Record<string, ThreadDataWithDeleteInfo<M>>;
  inboxNotificationsById: Record<string, InboxNotificationData>;
  notificationSettingsByRoomId: Record<string, RoomNotificationSettings>;
  versionsByRoomId: Record<string, HistoryVersion[]>;
}>;

/**
 * Externally observable state of the store, which will have:
 * - Optimistic updates applied
 * - All deleted threads removed from the threads list
 */
export type UmbrellaStoreState<M extends BaseMetadata> = {
  /**
   * Keep track of loading and error status of all the queries made by the client.
   * e.g. 'room-abc-{"color":"red"}'  - ok
   * e.g. 'room-abc-{}'               - loading
   */
  // TODO Query state should not be exposed publicly by the store!
  queries2: Record<string, QueryAsyncResult>; // Threads
  queries3: Record<string, QueryAsyncResult>; // Notification settings
  queries4: Record<string, QueryAsyncResult>; // Versions

  /**
   * All threads in a sorted array, optimistic updates applied, without deleted
   * threads.
   */
  threads: ThreadData<M>[];

  /**
   * All threads in a map, keyed by thread ID, with all optimistic updates
   * applied. Deleted threads are still in this mapping, and will have
   * a deletedAt field if so.
   */
  threadsById: Record<string, ThreadDataWithDeleteInfo<M>>;

  /**
   * All inbox notifications in a sorted array, optimistic updates applied.
   */
  inboxNotifications: InboxNotificationData[];

  /**
   * Inbox notifications by ID.
   * e.g. `in_${string}`
   */
  inboxNotificationsById: Record<string, InboxNotificationData>;

  /**
   * Notification settings by room ID.
   * e.g. { 'room-abc': { threads: "all" },
   *        'room-def': { threads: "replies_and_mentions" },
   *        'room-xyz': { threads: "none" },
   *      }
   */
  notificationSettingsByRoomId: Record<string, RoomNotificationSettings>;
  /**
   * Versions by roomId
   * e.g. { 'room-abc': {versions: "all versions"}}
   */
  versionsByRoomId: Record<string, HistoryVersion[]>;
};

export class UmbrellaStore<M extends BaseMetadata> {
  private _client?: OpaqueClient;
  private _store: Store<InternalState<M>>;
  private _prevState: InternalState<M> | null = null;
  private _stateCached: UmbrellaStoreState<M> | null = null;

  constructor(client?: OpaqueClient) {
    this._client = client;
    this._store = createStore<InternalState<M>>({
      rawThreadsById: {},
      // queries: {},
      query1: undefined,
      queries2: {},
      queries3: {},
      queries4: {},
      optimisticUpdates: [],
      inboxNotificationsById: {},
      notificationSettingsByRoomId: {},
      versionsByRoomId: {},
    });

    // Auto-bind all of this class methods once here, so we can use stable
    // references to them (most important for use in useSyncExternalStore)
    this.getFullState = this.getFullState.bind(this);
    this.getInboxNotificationsAsync =
      this.getInboxNotificationsAsync.bind(this);
    this.subscribeThreads = this.subscribeThreads.bind(this);
    this.subscribeUserThreads = this.subscribeUserThreads.bind(this);
    this.subscribeThreadsOrInboxNotifications =
      this.subscribeThreadsOrInboxNotifications.bind(this);
    this.subscribeNotificationSettings =
      this.subscribeNotificationSettings.bind(this);
    this.subscribeVersions = this.subscribeVersions.bind(this);

    // APIs only used by the E2E tests at the moment
    this._hasOptimisticUpdates = this._hasOptimisticUpdates.bind(this);
    this._subscribeOptimisticUpdates =
      this._subscribeOptimisticUpdates.bind(this);

    this.fetchMoreInboxNotifications =
      this.fetchMoreInboxNotifications.bind(this);
  }

  private get(): UmbrellaStoreState<M> {
    // Don't return the raw internal state immediately! Return a new computed
    // cached state (with optimistic updates applied) instead, and cache that
    // until the next .set() call invalidates it.
    const rawState = this._store.get();
    if (this._prevState !== rawState || this._stateCached === null) {
      this._prevState = rawState;
      this._stateCached = internalToExternalState(rawState);
    }
    return this._stateCached;
  }

  public batch(callback: () => void): void {
    return this._store.batch(callback);
  }

  public getFullState(): UmbrellaStoreState<M> {
    return this.get();
  }

  /**
   * Returns the async result of the given queryKey. If the query is success,
   * then it will return the entire store's state in the payload.
   */
  // TODO: This return type is a bit weird! Feels like we haven't found the
  // right abstraction here yet.
  public getThreadsAsync(
    queryKey: string
  ): AsyncResult<UmbrellaStoreState<M>, "fullState"> {
    const internalState = this._store.get();

    const query = internalState.queries2[queryKey];
    if (query === undefined || query.isLoading) {
      return ASYNC_LOADING;
    }

    if (query.error) {
      return query;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return { isLoading: false, fullState: this.getFullState() };
  }

  public getUserThreadsAsync(
    queryKey: string
  ): AsyncResult<UmbrellaStoreState<M>, "fullState"> {
    const internalState = this._store.get();

    const query = internalState.queries2[queryKey];
    if (query === undefined || query.isLoading) {
      return ASYNC_LOADING;
    }

    if (query.error) {
      return query;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return { isLoading: false, fullState: this.getFullState() };
  }

  private fetchMoreInboxNotifications(): void {
    const pageState = this._store.get().query1?.data;
    if (!pageState || pageState.isFetchingMore || pageState.hasFetchedAll) {
      // Not in the right state, make this a no-op
      return;
    }

    const cursor = pageState.cursor;
    this.setQuery1OK({
      ...pageState,
      isFetchingMore: true,
    });

    // XXX It's not sitting well that this code to figure out the next cursor is duplicated in two places now!
    void nn(this._client, "To call fetchMore(), we need a client")
      .getInboxNotifications({ cursor })
      .then((data) => {
        // XXX Pass the page size into the URL so we will know it matches the backend!
        const PAGE_SIZE = 6; // Must match the backend

        // Find the lowest date in the result, and store it to use as the next
        // page's cursor
        let nextCursor = cursor;
        for (const ibn of data.inboxNotifications.updated) {
          // XXX The sort field (= notifiedAt) must match the backend! Put it in the URL!
          // XXX This < (less than) should match the sort order in the backend! (Only works with DESC sorts!)
          if (ibn.notifiedAt.getTime() < cursor.getTime()) {
            nextCursor = ibn.notifiedAt;
          }
        }

        const hasFetchedAll =
          data.inboxNotifications.updated.length < PAGE_SIZE;

        this.batch(() => {
          this.updateThreadsAndNotifications(
            data.threads.updated as ThreadData<M>[], // XXX Remove this cast :(
            data.inboxNotifications.updated,
            [], // XXX Note 100% sure about these! Think about it! Should they be empty?
            []
          );

          this.setQuery1OK({
            ...pageState,
            cursor: nextCursor,
            hasFetchedAll,
            fetchMoreError: undefined,
            isFetchingMore: false,
          });
        });
      })
      .catch((err) => {
        this.setQuery1OK({
          ...pageState,
          fetchMoreError: err,
          isFetchingMore: false,
        });
      });
  }

  // NOTE: This will read the async result, but WILL NOT start loading at the moment!
  public getInboxNotificationsAsync(): InboxNotificationsAsyncResult {
    const internalState = this._store.get();

    const query = internalState.query1;
    if (query === undefined || query.isLoading) {
      return ASYNC_LOADING;
    }

    if (query.error !== undefined) {
      return query;
    }

    const pageState = query.data;
    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      inboxNotifications: this.getFullState().inboxNotifications,
      fetchMore: this.fetchMoreInboxNotifications,
      isFetchingMore: pageState.isFetchingMore,
      fetchMoreError: pageState.fetchMoreError,
      hasFetchedAll: pageState.hasFetchedAll,
    };
  }

  // NOTE: This will read the async result, but WILL NOT start loading at the moment!
  public getNotificationSettingsAsync(
    roomId: string
  ): RoomNotificationSettingsAsyncResult {
    const state = this.get();

    const query = state.queries3[makeNotificationSettingsQueryKey(roomId)];
    if (query === undefined || query.isLoading) {
      return ASYNC_LOADING;
    }

    if (query.error !== undefined) {
      return query;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      settings: nn(state.notificationSettingsByRoomId[roomId]),
    };
  }

  public getVersionsAsync(
    roomId: string
  ): AsyncResult<HistoryVersion[], "versions"> {
    const state = this.get();

    const query = state.queries4[makeVersionsQueryKey(roomId)];
    if (query === undefined || query.isLoading) {
      return ASYNC_LOADING;
    }

    if (query.error !== undefined) {
      return query;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      versions: nn(state.versionsByRoomId[roomId]),
    };
  }

  /**
   * @private Only used by the E2E test suite.
   */
  public _hasOptimisticUpdates(): boolean {
    return this._store.get().optimisticUpdates.length > 0;
  }

  private subscribe(callback: () => void): () => void {
    return this._store.subscribe(callback);
  }

  /**
   * @private Only used by the E2E test suite.
   */
  public _subscribeOptimisticUpdates(callback: () => void): () => void {
    // TODO Make this actually only update when optimistic updates are changed
    return this.subscribe(callback);
  }

  public subscribeThreads(callback: () => void): () => void {
    // TODO Make this actually only update when threads are invalidated
    return this.subscribe(callback);
  }

  public subscribeUserThreads(callback: () => void): () => void {
    // TODO Make this actually only update when threads are invalidated
    return this.subscribe(callback);
  }

  public subscribeThreadsOrInboxNotifications(
    callback: () => void
  ): () => void {
    // TODO Make this actually only update when inbox notifications are invalidated
    return this.subscribe(callback);
  }

  public subscribeNotificationSettings(callback: () => void): () => void {
    // TODO Make this actually only update when notification settings are invalidated
    return this.subscribe(callback);
  }

  public subscribeVersions(callback: () => void): () => void {
    // TODO Make this actually only update when versions are invalidated
    return this.subscribe(callback);
  }

  // Direct low-level cache mutations ------------------------------------------------- {{{

  private updateThreadsCache(
    mapFn: (
      cache: Readonly<Record<string, ThreadDataWithDeleteInfo<M>>>
    ) => Readonly<Record<string, ThreadDataWithDeleteInfo<M>>>
  ): void {
    this._store.set((state) => {
      const threads = mapFn(state.rawThreadsById);
      return threads !== state.rawThreadsById
        ? { ...state, rawThreadsById: threads }
        : state;
    });
  }

  private updateInboxNotificationsCache(
    mapFn: (
      cache: Readonly<Record<string, InboxNotificationData>>
    ) => Readonly<Record<string, InboxNotificationData>>
  ): void {
    this._store.set((state) => {
      const inboxNotifications = mapFn(state.inboxNotificationsById);
      return inboxNotifications !== state.inboxNotificationsById
        ? { ...state, inboxNotificationsById: inboxNotifications }
        : state;
    });
  }

  private setNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings
  ): void {
    this._store.set((state) => ({
      ...state,
      notificationSettingsByRoomId: {
        ...state.notificationSettingsByRoomId,
        [roomId]: settings,
      },
    }));
  }

  private setVersions(roomId: string, versions: HistoryVersion[]): void {
    this._store.set((state) => ({
      ...state,
      versionsByRoomId: {
        ...state.versionsByRoomId,
        [roomId]: versions,
      },
    }));
  }

  private setQuery1State(queryState: PaginatedAsyncResult): void {
    this._store.set((state) => ({
      ...state,
      query1: queryState,
    }));
  }

  private setQuery2State(queryKey: string, queryState: QueryAsyncResult): void {
    this._store.set((state) => ({
      ...state,
      queries2: {
        ...state.queries2,
        [queryKey]: queryState,
      },
    }));
  }
  private setQuery3State(queryKey: string, queryState: QueryAsyncResult): void {
    this._store.set((state) => ({
      ...state,
      queries3: {
        ...state.queries3,
        [queryKey]: queryState,
      },
    }));
  }

  private setQuery4State(queryKey: string, queryState: QueryAsyncResult): void {
    this._store.set((state) => ({
      ...state,
      queries4: {
        ...state.queries4,
        [queryKey]: queryState,
      },
    }));
  }

  private updateOptimisticUpdatesCache(
    mapFn: (
      cache: readonly OptimisticUpdate<M>[]
    ) => readonly OptimisticUpdate<M>[]
  ): void {
    this._store.set((state) => ({
      ...state,
      optimisticUpdates: mapFn(state.optimisticUpdates),
    }));
  }

  // ---------------------------------------------------------------------------------- }}}

  /** @internal - Only call this method from unit tests. */
  public force_set(
    callback: (currentState: InternalState<M>) => InternalState<M>
  ): void {
    return this._store.set(callback);
  }

  /**
   * Updates an existing inbox notification with a new value, replacing the
   * corresponding optimistic update.
   *
   * This will not update anything if the inbox notification ID isn't found in
   * the cache.
   */
  public updateInboxNotification(
    inboxNotificationId: string,
    optimisticUpdateId: string,
    callback: (
      notification: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣

      // 2️⃣
      this.updateInboxNotificationsCache((cache) => {
        const existing = cache[inboxNotificationId];
        if (!existing) {
          // If the inbox notification doesn't exist in the cache, we do not
          // change anything
          return cache;
        }

        const inboxNotifications = {
          ...cache,
          [inboxNotificationId]: callback(existing),
        };
        return inboxNotifications;
      });
    });
  }

  /**
   * Updates *all* inbox notifications by running a mapper function over all of
   * them, replacing the corresponding optimistic update.
   */
  public updateAllInboxNotifications(
    optimisticUpdateId: string,
    mapFn: (
      notification: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.updateInboxNotificationsCache((cache) => mapValues(cache, mapFn)); // 2️⃣
    });
  }

  /**
   * Deletes an existing inbox notification, replacing the corresponding
   * optimistic update.
   */
  public deleteInboxNotification(
    inboxNotificationId: string,
    optimisticUpdateId: string
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣

      // 2️⃣
      this.updateInboxNotificationsCache((cache) => {
        // Delete it
        const { [inboxNotificationId]: removed, ...newCache } = cache;
        return removed === undefined ? cache : newCache;
      });
    });
  }

  /**
   * Deletes *all* inbox notifications, replacing the corresponding optimistic
   * update.
   */
  public deleteAllInboxNotifications(optimisticUpdateId: string): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.updateInboxNotificationsCache(() => ({})); // 2️⃣ empty the cache
    });
  }

  /**
   * Creates an new thread, replacing the corresponding optimistic update.
   */
  public createThread(
    optimisticUpdateId: string,
    thread: Readonly<ThreadDataWithDeleteInfo<M>>
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣j
      this.updateThreadsCache((cache) => ({ ...cache, [thread.id]: thread })); // 2️⃣
    });
  }

  /**
   * Updates an existing thread with a new value, replacing the corresponding
   * optimistic update.
   *
   * This will not update anything if:
   * - The thread ID isn't found in the cache; or
   * - The thread ID was already deleted from the cache; or
   * - The thread ID in the cache was updated more recently than the optimistic
   *   update's timestamp (if given)
   */
  private updateThread(
    threadId: string,
    optimisticUpdateId: string | null,
    callback: (
      thread: Readonly<ThreadDataWithDeleteInfo<M>>
    ) => Readonly<ThreadDataWithDeleteInfo<M>>,
    updatedAt?: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      if (optimisticUpdateId !== null) {
        this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      }

      // 2️⃣
      this.updateThreadsCache((cache) => {
        const existing = cache[threadId];

        // If the thread doesn't exist in the cache, we do not update the metadata
        if (!existing) {
          return cache;
        }

        // If the thread has been deleted, we do not update the metadata
        if (existing.deletedAt !== undefined) {
          return cache;
        }

        if (
          !!updatedAt &&
          !!existing.updatedAt &&
          existing.updatedAt > updatedAt
        ) {
          return cache;
        }

        return { ...cache, [threadId]: callback(existing) };
      });
    });
  }

  public patchThread(
    threadId: string,
    optimisticUpdateId: string | null,
    patch: {
      // Only these fields are currently supported to patch
      metadata?: M;
      resolved?: boolean;
    },
    updatedAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    return this.updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => ({ ...thread, ...compactObject(patch) }),
      updatedAt
    );
  }

  public addReaction(
    threadId: string,
    optimisticUpdateId: string | null,
    commentId: string,
    reaction: CommentUserReaction,
    createdAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    this.updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => applyAddReaction(thread, commentId, reaction),
      createdAt
    );
  }

  public removeReaction(
    threadId: string,
    optimisticUpdateId: string | null,
    commentId: string,
    emoji: string,
    userId: string,
    removedAt: Date
  ): void {
    this.updateThread(
      threadId,
      optimisticUpdateId,
      (thread) =>
        applyRemoveReaction(thread, commentId, emoji, userId, removedAt),
      removedAt
    );
  }

  /**
   * Soft-deletes an existing thread by setting its `deletedAt` value,
   * replacing the corresponding optimistic update.
   *
   * This will not update anything if:
   * - The thread ID isn't found in the cache; or
   * - The thread ID was already deleted from the cache
   */
  public deleteThread(
    threadId: string,
    optimisticUpdateId: string | null
  ): void {
    return this.updateThread(
      threadId,
      optimisticUpdateId,

      // A deletion is actually an update of the deletedAt property internally
      (thread) => ({ ...thread, updatedAt: new Date(), deletedAt: new Date() })
    );
  }

  /**
   * Creates an existing comment and ensures the associated notification is
   * updated correctly, replacing the corresponding optimistic update.
   */
  public createComment(
    newComment: CommentData,
    optimisticUpdateId: string
  ): void {
    // Batch 1️⃣ + 2️⃣ + 3️⃣
    this._store.batch(() => {
      // 1️⃣
      this.removeOptimisticUpdate(optimisticUpdateId);

      // If the associated thread is not found, we cannot create a comment under it
      const existingThread =
        this._store.get().rawThreadsById[newComment.threadId];
      if (!existingThread) {
        return;
      }

      // 2️⃣ Update the thread instance by adding a comment under it
      this.updateThreadsCache((cache) => ({
        ...cache,
        [newComment.threadId]: applyUpsertComment(existingThread, newComment),
      }));

      // 3️⃣ Update the associated inbox notification (if any)
      this.updateInboxNotificationsCache((cache) => {
        const existingNotification = Object.values(cache).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === newComment.threadId
        );

        if (!existingNotification) {
          // Nothing to update here
          return cache;
        }

        // If the thread has an inbox notification associated with it, we update the notification's `notifiedAt` and `readAt` values
        return {
          ...cache,
          [existingNotification.id]: {
            ...existingNotification,
            notifiedAt: newComment.createdAt,
            readAt: newComment.createdAt,
          },
        };
      });
    });
  }

  public editComment(
    threadId: string,
    optimisticUpdateId: string,
    editedComment: CommentData
  ): void {
    return this.updateThread(threadId, optimisticUpdateId, (thread) =>
      applyUpsertComment(thread, editedComment)
    );
  }

  public deleteComment(
    threadId: string,
    optimisticUpdateId: string,
    commentId: string,
    deletedAt: Date
  ): void {
    return this.updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => applyDeleteComment(thread, commentId, deletedAt),
      deletedAt
    );
  }

  public updateThreadAndNotification(
    thread: ThreadData<M>,
    inboxNotification?: InboxNotificationData
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      // 1️⃣
      this.updateThreadsCache((cache) => {
        const existingThread = cache[thread.id];
        return existingThread === undefined ||
          isMoreRecentlyUpdated(thread, existingThread)
          ? { ...cache, [thread.id]: thread }
          : cache;
      });

      // 2️⃣
      if (inboxNotification !== undefined) {
        this.updateInboxNotificationsCache((cache) => ({
          ...cache,
          [inboxNotification.id]: inboxNotification,
        }));
      }
    });
  }

  public updateThreadsAndNotifications(
    threads: ThreadData<M>[],
    inboxNotifications: InboxNotificationData[],
    deletedThreads: ThreadDeleteInfo[],
    deletedInboxNotifications: InboxNotificationDeleteInfo[]
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      // 1️⃣
      this.updateThreadsCache((cache) =>
        applyThreadUpdates(cache, {
          newThreads: threads,
          deletedThreads,
        })
      );

      // 2️⃣
      this.updateInboxNotificationsCache((cache) =>
        applyNotificationsUpdates(cache, {
          newInboxNotifications: inboxNotifications,
          deletedNotifications: deletedInboxNotifications,
        })
      );
    });
  }

  /**
   * Updates existing notification setting for a room with a new value,
   * replacing the corresponding optimistic update.
   */
  public updateRoomInboxNotificationSettings2(
    roomId: string,
    optimisticUpdateId: string,
    settings: Readonly<RoomNotificationSettings>
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.setNotificationSettings(roomId, settings); // 2️⃣
    });
  }

  public updateRoomInboxNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings,
    queryKey: string
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.setQuery3OK(queryKey); // 1️⃣
      this.setNotificationSettings(roomId, settings); // 2️⃣
    });
  }

  public updateRoomVersions(
    roomId: string,
    versions: HistoryVersion[],
    queryKey?: string
  ): void {
    // Batch 1️⃣ + 2️⃣
    this._store.batch(() => {
      this.setVersions(roomId, versions); // 1️⃣

      // 2️⃣
      if (queryKey !== undefined) {
        this.setQuery4OK(queryKey);
      }
    });
  }

  public addOptimisticUpdate(
    optimisticUpdate: DistributiveOmit<OptimisticUpdate<M>, "id">
  ): string {
    const id = nanoid();
    const newUpdate: OptimisticUpdate<M> = { ...optimisticUpdate, id };
    this.updateOptimisticUpdatesCache((cache) => [...cache, newUpdate]);
    return id;
  }

  public removeOptimisticUpdate(optimisticUpdateId: string): void {
    this.updateOptimisticUpdatesCache((cache) =>
      cache.filter((ou) => ou.id !== optimisticUpdateId)
    );
  }

  //
  // Query State APIs
  //

  // Query 1
  public setQuery1Loading(): void {
    this.setQuery1State(ASYNC_LOADING);
  }

  public setQuery1OK(pageState: PaginationState): void {
    this.setQuery1State({ isLoading: false, data: pageState });
  }

  public setQuery1Error(error: Error): void {
    this.setQuery1State({ isLoading: false, error });
  }

  // Query 2
  public setQuery2Loading(queryKey: string): void {
    this.setQuery2State(queryKey, ASYNC_LOADING);
  }

  public setQuery2OK(queryKey: string): void {
    this.setQuery2State(queryKey, ASYNC_OK);
  }

  public setQuery2Error(queryKey: string, error: Error): void {
    this.setQuery2State(queryKey, { isLoading: false, error });
  }

  // Query 3
  public setQuery3Loading(queryKey: string): void {
    this.setQuery3State(queryKey, ASYNC_LOADING);
  }

  private setQuery3OK(queryKey: string): void {
    this.setQuery3State(queryKey, ASYNC_OK);
  }

  public setQuery3Error(queryKey: string, error: Error): void {
    this.setQuery3State(queryKey, { isLoading: false, error });
  }

  // Query 4
  public setQuery4Loading(queryKey: string): void {
    this.setQuery4State(queryKey, ASYNC_LOADING);
  }

  private setQuery4OK(queryKey: string): void {
    this.setQuery4State(queryKey, ASYNC_OK);
  }

  public setQuery4Error(queryKey: string, error: Error): void {
    this.setQuery4State(queryKey, { isLoading: false, error });
  }
}

/**
 * Applies optimistic updates, removes deleted threads, sorts results in
 * a stable way, removes internal fields that should not be exposed publicly.
 */
function internalToExternalState<M extends BaseMetadata>(
  state: InternalState<M>
): UmbrellaStoreState<M> {
  const computed = {
    threadsById: { ...state.rawThreadsById },
    inboxNotificationsById: { ...state.inboxNotificationsById },
    notificationSettingsByRoomId: { ...state.notificationSettingsByRoomId },
  };

  for (const optimisticUpdate of state.optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "create-thread": {
        computed.threadsById[optimisticUpdate.thread.id] =
          optimisticUpdate.thread;
        break;
      }
      case "edit-thread-metadata": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        // If the thread has been updated since the optimistic update, we do not apply the update
        if (
          thread.updatedAt !== undefined &&
          thread.updatedAt > optimisticUpdate.updatedAt
        ) {
          break;
        }

        computed.threadsById[thread.id] = {
          ...thread,
          updatedAt: optimisticUpdate.updatedAt,
          metadata: {
            ...thread.metadata,
            ...optimisticUpdate.metadata,
          },
        };

        break;
      }
      case "mark-thread-as-resolved": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        computed.threadsById[thread.id] = {
          ...thread,
          resolved: true,
        };

        break;
      }
      case "mark-thread-as-unresolved": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        computed.threadsById[thread.id] = {
          ...thread,
          resolved: false,
        };

        break;
      }
      case "create-comment": {
        const thread = computed.threadsById[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[thread.id] = applyUpsertComment(
          thread,
          optimisticUpdate.comment
        );

        const inboxNotification = Object.values(
          computed.inboxNotificationsById
        ).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === thread.id
        );

        if (inboxNotification === undefined) {
          break;
        }

        computed.inboxNotificationsById[inboxNotification.id] = {
          ...inboxNotification,
          notifiedAt: optimisticUpdate.comment.createdAt,
          readAt: optimisticUpdate.comment.createdAt,
        };

        break;
      }
      case "edit-comment": {
        const thread = computed.threadsById[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[thread.id] = applyUpsertComment(
          thread,
          optimisticUpdate.comment
        );

        break;
      }
      case "delete-comment": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[thread.id] = applyDeleteComment(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.deletedAt
        );

        break;
      }

      case "delete-thread": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[optimisticUpdate.threadId] = {
          ...thread,
          deletedAt: optimisticUpdate.deletedAt,
          updatedAt: optimisticUpdate.deletedAt,
          comments: [],
        };
        break;
      }
      case "add-reaction": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[thread.id] = applyAddReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.reaction
        );

        break;
      }
      case "remove-reaction": {
        const thread = computed.threadsById[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        computed.threadsById[thread.id] = applyRemoveReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.emoji,
          optimisticUpdate.userId,
          optimisticUpdate.removedAt
        );

        break;
      }
      case "mark-inbox-notification-as-read": {
        const ibn =
          computed.inboxNotificationsById[optimisticUpdate.inboxNotificationId];

        // If the inbox notification doesn't exist in the cache, we do not apply the update
        if (ibn === undefined) {
          break;
        }

        computed.inboxNotificationsById[optimisticUpdate.inboxNotificationId] =
          { ...ibn, readAt: optimisticUpdate.readAt };
        break;
      }
      case "mark-all-inbox-notifications-as-read": {
        for (const id in computed.inboxNotificationsById) {
          const ibn = computed.inboxNotificationsById[id];

          // If the inbox notification doesn't exist in the cache, we do not apply the update
          if (ibn === undefined) {
            break;
          }

          computed.inboxNotificationsById[id] = {
            ...ibn,
            readAt: optimisticUpdate.readAt,
          };
        }
        break;
      }
      case "delete-inbox-notification": {
        delete computed.inboxNotificationsById[
          optimisticUpdate.inboxNotificationId
        ];
        break;
      }
      case "delete-all-inbox-notifications": {
        computed.inboxNotificationsById = {};
        break;
      }

      case "update-notification-settings": {
        const settings =
          computed.notificationSettingsByRoomId[optimisticUpdate.roomId];

        // If the inbox notification doesn't exist in the cache, we do not apply the update
        if (settings === undefined) {
          break;
        }

        computed.notificationSettingsByRoomId[optimisticUpdate.roomId] = {
          ...settings,
          ...optimisticUpdate.settings,
        };
      }
    }
  }

  const cleanedThreads =
    // Don't expose any soft-deleted threads
    Object.values(computed.threadsById)
      .filter((thread): thread is ThreadData<M> => !thread.deletedAt)

      .filter((thread) =>
        // Only keep a thread if there is at least one non-deleted comment
        thread.comments.some((c) => c.deletedAt === undefined)
      );

  // TODO Maybe consider also removing these from the inboxNotificationsById registry?
  const cleanedNotifications =
    // Sort so that the most recent notifications are first
    Object.values(computed.inboxNotificationsById)
      .filter((ibn) =>
        ibn.kind === "thread"
          ? computed.threadsById[ibn.threadId] &&
            computed.threadsById[ibn.threadId]?.deletedAt === undefined
          : true
      )
      .sort((a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime());

  return {
    inboxNotifications: cleanedNotifications,
    inboxNotificationsById: computed.inboxNotificationsById,
    notificationSettingsByRoomId: computed.notificationSettingsByRoomId,
    queries2: state.queries2,
    queries3: state.queries3,
    queries4: state.queries4,
    threads: cleanedThreads,
    threadsById: computed.threadsById,
    versionsByRoomId: state.versionsByRoomId,
  };
}

export function applyThreadUpdates<M extends BaseMetadata>(
  existingThreads: Record<string, ThreadDataWithDeleteInfo<M>>,
  updates: {
    newThreads: ThreadData<M>[];
    deletedThreads: ThreadDeleteInfo[];
  }
): Record<string, ThreadData<M>> {
  const updatedThreads = { ...existingThreads };

  // Add new threads or update existing threads if the existing thread is older than the new thread.
  updates.newThreads.forEach((thread) => {
    const existingThread = updatedThreads[thread.id];

    // If a thread already exists but it's been already more recent, don't update it
    if (existingThread) {
      if (isMoreRecentlyUpdated(existingThread, thread)) {
        return; // Do not update the existing thread
      }
    }

    updatedThreads[thread.id] = thread;
  });

  // Mark threads in the deletedThreads list as deleted
  updates.deletedThreads.forEach(({ id, deletedAt }) => {
    const existingThread = updatedThreads[id];
    if (existingThread === undefined) return;

    existingThread.deletedAt = deletedAt;
    existingThread.updatedAt = deletedAt;
    existingThread.comments = [];
  });

  return updatedThreads;
}

export function applyNotificationsUpdates(
  existingInboxNotifications: Record<string, InboxNotificationData>,
  updates: {
    newInboxNotifications: InboxNotificationData[];
    deletedNotifications: InboxNotificationDeleteInfo[];
  }
): Record<string, InboxNotificationData> {
  const updatedInboxNotifications = { ...existingInboxNotifications };

  // Add new notifications or update existing notifications if the existing notification is older than the new notification.
  updates.newInboxNotifications.forEach((notification) => {
    const existingNotification = updatedInboxNotifications[notification.id];
    // If the notification already exists, we need to compare the two notifications to determine which one is newer.
    if (existingNotification) {
      const result = compareInboxNotifications(
        existingNotification,
        notification
      );

      // If the existing notification is newer than the new notification, we do not update the existing notification.
      if (result === 1) return;
    }

    // If the new notification is newer than the existing notification, we update the existing notification.
    updatedInboxNotifications[notification.id] = notification;
  });

  updates.deletedNotifications.forEach(
    ({ id }) => delete updatedInboxNotifications[id]
  );

  return updatedInboxNotifications;
}

/**
 * Compares two inbox notifications to determine which one is newer.
 * @param inboxNotificationA The first inbox notification to compare.
 * @param inboxNotificationB The second inbox notification to compare.
 * @returns 1 if inboxNotificationA is newer, -1 if inboxNotificationB is newer, or 0 if they are the same age or can't be compared.
 */
export function compareInboxNotifications(
  inboxNotificationA: InboxNotificationData,
  inboxNotificationB: InboxNotificationData
): number {
  if (inboxNotificationA.notifiedAt > inboxNotificationB.notifiedAt) {
    return 1;
  } else if (inboxNotificationA.notifiedAt < inboxNotificationB.notifiedAt) {
    return -1;
  }

  // notifiedAt times are the same, compare readAt times if both are not null
  if (inboxNotificationA.readAt && inboxNotificationB.readAt) {
    return inboxNotificationA.readAt > inboxNotificationB.readAt
      ? 1
      : inboxNotificationA.readAt < inboxNotificationB.readAt
        ? -1
        : 0;
  } else if (inboxNotificationA.readAt || inboxNotificationB.readAt) {
    return inboxNotificationA.readAt ? 1 : -1;
  }

  // If all dates are equal, return 0
  return 0;
}

/** @internal Exported for unit tests only. */
export function applyUpsertComment<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  comment: CommentData
): ThreadDataWithDeleteInfo<M> {
  // If the thread has been deleted, we do not apply the update
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  // Validate that the comment belongs to the thread
  if (comment.threadId !== thread.id) {
    console.warn(
      `Comment ${comment.id} does not belong to thread ${thread.id}`
    );
    return thread;
  }

  const existingComment = thread.comments.find(
    (existingComment) => existingComment.id === comment.id
  );

  // If the comment doesn't exist in the thread, add the comment
  if (existingComment === undefined) {
    const updatedAt = new Date(
      Math.max(thread.updatedAt?.getTime() || 0, comment.createdAt.getTime())
    );

    const updatedThread = {
      ...thread,
      updatedAt,
      comments: [...thread.comments, comment],
    };

    return updatedThread;
  }

  // If the comment exists in the thread and has been deleted, do not apply the update
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  // Proceed to update the comment if:
  // 1. The existing comment has not been edited
  // 2. The incoming comment has not been edited (i.e. it's a new comment)
  // 3. The incoming comment has been edited more recently than the existing comment
  if (
    existingComment.editedAt === undefined ||
    comment.editedAt === undefined ||
    existingComment.editedAt <= comment.editedAt
  ) {
    const updatedComments = thread.comments.map((existingComment) =>
      existingComment.id === comment.id ? comment : existingComment
    );

    const updatedThread = {
      ...thread,
      updatedAt: new Date(
        Math.max(
          thread.updatedAt?.getTime() || 0,
          comment.editedAt?.getTime() || comment.createdAt.getTime()
        )
      ),
      comments: updatedComments,
    };
    return updatedThread;
  }

  return thread;
}

/** @internal Exported for unit tests only. */
export function applyDeleteComment<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  deletedAt: Date
): ThreadDataWithDeleteInfo<M> {
  // If the thread has been deleted, we do not delete the comment
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we cannot perform the deletion
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the deletion request, we do not delete the comment
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          deletedAt,
          // We optimistically remove the comment body and attachments when marking it as deleted
          body: undefined,
          attachments: [],
        }
      : comment
  );

  // If all comments have been deleted (or there are no comments in the first
  // place), we mark the thread as deleted.
  if (updatedComments.every((comment) => comment.deletedAt !== undefined)) {
    return {
      ...thread,
      deletedAt,
      updatedAt: deletedAt,
    };
  }

  return {
    ...thread,
    updatedAt: deletedAt,
    comments: updatedComments,
  };
}

/** @internal Exported for unit tests only. */
export function applyAddReaction<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  reaction: CommentUserReaction
): ThreadDataWithDeleteInfo<M> {
  // If the thread has been deleted, we do not add the reaction
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we do not add the reaction
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction addition request, we do not add the reaction
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          reactions: upsertReaction(comment.reactions, reaction),
        }
      : comment
  );

  return {
    ...thread,
    updatedAt: new Date(
      Math.max(reaction.createdAt.getTime(), thread.updatedAt?.getTime() || 0)
    ),
    comments: updatedComments,
  };
}

/** @internal Exported for unit tests only. */
export function applyRemoveReaction<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  emoji: string,
  userId: string,
  removedAt: Date
): ThreadDataWithDeleteInfo<M> {
  // If the thread has been deleted, we do not remove the reaction
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we do not remove the reaction
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction removal request, we do not remove the reaction
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          reactions: comment.reactions
            .map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    users: reaction.users.filter((user) => user.id !== userId),
                  }
                : reaction
            )
            .filter((reaction) => reaction.users.length > 0), // Remove reactions with no users left
        }
      : comment
  );

  return {
    ...thread,
    updatedAt: new Date(
      Math.max(removedAt.getTime(), thread.updatedAt?.getTime() || 0)
    ),
    comments: updatedComments,
  };
}

function upsertReaction(
  reactions: CommentReaction[],
  reaction: CommentUserReaction
): CommentReaction[] {
  const existingReaction = reactions.find(
    (existingReaction) => existingReaction.emoji === reaction.emoji
  );

  // If the reaction doesn't exist in the comment, we add it
  if (existingReaction === undefined) {
    return [
      ...reactions,
      {
        emoji: reaction.emoji,
        createdAt: reaction.createdAt,
        users: [{ id: reaction.userId }],
      },
    ];
  }

  // If the reaction exists in the comment, we add the user to the reaction if they are not already in it
  if (
    existingReaction.users.some((user) => user.id === reaction.userId) === false
  ) {
    return reactions.map((existingReaction) =>
      existingReaction.emoji === reaction.emoji
        ? {
            ...existingReaction,
            users: [...existingReaction.users, { id: reaction.userId }],
          }
        : existingReaction
    );
  }

  return reactions;
}
