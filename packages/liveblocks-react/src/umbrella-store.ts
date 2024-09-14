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
} from "@liveblocks/core";

import { isMoreRecentlyUpdated } from "./lib/compare";

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

type QueryState = AsyncResult<undefined>;
//                            ^^^^^^^^^ We don't store the actual query result in this status

type InternalState<M extends BaseMetadata> = Readonly<{
  queries: Record<string, QueryState>;
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
  queries: Record<string, QueryState>;

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
  private _store: Store<InternalState<M>>;
  private _prevState: InternalState<M> | null = null;
  private _stateCached: UmbrellaStoreState<M> | null = null;

  constructor() {
    this._store = createStore<InternalState<M>>({
      rawThreadsById: {},
      queries: {},
      optimisticUpdates: [],
      inboxNotificationsById: {},
      notificationSettingsByRoomId: {},
      versionsByRoomId: {},
    });

    // Auto-bind all of this class methods once here, so we can use stable
    // references to them (most important for use in useSyncExternalStore)
    this.getThreads = this.getThreads.bind(this);
    this.getInboxNotifications = this.getInboxNotifications.bind(this);
    this.getNotificationSettings = this.getNotificationSettings.bind(this);
    this.getVersions = this.getVersions.bind(this);
    this.subscribeThreads = this.subscribeThreads.bind(this);
    this.subscribeInboxNotifications =
      this.subscribeInboxNotifications.bind(this);
    this.subscribeNotificationSettings =
      this.subscribeNotificationSettings.bind(this);
    this.subscribeVersions = this.subscribeVersions.bind(this);
  }

  private get(): UmbrellaStoreState<M> {
    // Don't return the raw internal state immediately! Return a new computed
    // cached state (with optimistic updates applied) instead, and cache that
    // until the next .set() call invalidates it.
    const rawState = this._store.get();
    if (this._prevState !== rawState || this._stateCached === null) {
      this._prevState = rawState;
      this._stateCached = applyOptimisticUpdates(rawState);
    }
    return this._stateCached;
  }

  public getThreads(): UmbrellaStoreState<M> {
    return this.get();
  }

  public getInboxNotifications(): UmbrellaStoreState<M> {
    // XXX Return only the stable reference to the inboxNotifications property
    return this.get();
  }

  public getNotificationSettings(): UmbrellaStoreState<M> {
    // XXX Return only the stable reference to the notificationSettings property
    return this.get();
  }

  public getVersions(): UmbrellaStoreState<M> {
    return this.get();
  }

  private subscribe(callback: () => void): () => void {
    return this._store.subscribe(callback);
  }

  public subscribeThreads(callback: () => void): () => void {
    // XXX Make this actually only update when threads are invalidated
    return this.subscribe(callback);
  }

  public subscribeInboxNotifications(callback: () => void): () => void {
    // XXX Make this actually only update when inbox notifications are invalidated
    return this.subscribe(callback);
  }

  public subscribeNotificationSettings(callback: () => void): () => void {
    // XXX Make this actually only update when notification settings are invalidated
    return this.subscribe(callback);
  }

  public subscribeVersions(callback: () => void): () => void {
    // XXX Make this actually only update when versions are invalidated
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

  private setQueryState(queryKey: string, queryState: QueryState): void {
    this._store.set((state) => ({
      ...state,
      queries: {
        ...state.queries,
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
    deletedInboxNotifications: InboxNotificationDeleteInfo[],
    queryKey?: string
  ): void {
    // Batch 1️⃣ + 2️⃣ + 3️⃣
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

      // 3️⃣
      if (queryKey !== undefined) {
        this.setQueryOK(queryKey);
      }
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
      this.setQueryOK(queryKey); // 1️⃣
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
        this.setQueryOK(queryKey);
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

  public setQueryLoading(queryKey: string): void {
    this.setQueryState(queryKey, { isLoading: true });
  }

  private setQueryOK(queryKey: string): void {
    this.setQueryState(queryKey, { isLoading: false, data: undefined });
  }

  public setQueryError(queryKey: string, error: Error): void {
    this.setQueryState(queryKey, { isLoading: false, error });
  }
}

function applyOptimisticUpdates<M extends BaseMetadata>(
  state: InternalState<M>
): UmbrellaStoreState<M> {
  const output = {
    threads: { ...state.rawThreadsById },
    inboxNotifications: { ...state.inboxNotificationsById },
    notificationSettings: { ...state.notificationSettingsByRoomId },
  };

  for (const optimisticUpdate of state.optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "create-thread": {
        output.threads[optimisticUpdate.thread.id] = optimisticUpdate.thread;
        break;
      }
      case "edit-thread-metadata": {
        const thread = output.threads[optimisticUpdate.threadId];
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

        output.threads[thread.id] = {
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
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        output.threads[thread.id] = {
          ...thread,
          resolved: true,
        };

        break;
      }
      case "mark-thread-as-unresolved": {
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        output.threads[thread.id] = {
          ...thread,
          resolved: false,
        };

        break;
      }
      case "create-comment": {
        const thread = output.threads[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[thread.id] = applyUpsertComment(
          thread,
          optimisticUpdate.comment
        );

        const inboxNotification = Object.values(output.inboxNotifications).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === thread.id
        );

        if (inboxNotification === undefined) {
          break;
        }

        output.inboxNotifications[inboxNotification.id] = {
          ...inboxNotification,
          notifiedAt: optimisticUpdate.comment.createdAt,
          readAt: optimisticUpdate.comment.createdAt,
        };

        break;
      }
      case "edit-comment": {
        const thread = output.threads[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[thread.id] = applyUpsertComment(
          thread,
          optimisticUpdate.comment
        );

        break;
      }
      case "delete-comment": {
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[thread.id] = applyDeleteComment(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.deletedAt
        );

        break;
      }

      case "delete-thread": {
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[optimisticUpdate.threadId] = {
          ...output.threads[optimisticUpdate.threadId],
          deletedAt: optimisticUpdate.deletedAt,
          updatedAt: optimisticUpdate.deletedAt,
          comments: [],
        };
        break;
      }
      case "add-reaction": {
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[thread.id] = applyAddReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.reaction
        );

        break;
      }
      case "remove-reaction": {
        const thread = output.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        output.threads[thread.id] = applyRemoveReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.emoji,
          optimisticUpdate.userId,
          optimisticUpdate.removedAt
        );

        break;
      }
      case "mark-inbox-notification-as-read": {
        output.inboxNotifications[optimisticUpdate.inboxNotificationId] = {
          ...state.inboxNotificationsById[optimisticUpdate.inboxNotificationId],
          readAt: optimisticUpdate.readAt,
        };
        break;
      }
      case "mark-all-inbox-notifications-as-read": {
        for (const id in output.inboxNotifications) {
          output.inboxNotifications[id] = {
            ...output.inboxNotifications[id],
            readAt: optimisticUpdate.readAt,
          };
        }
        break;
      }
      case "delete-inbox-notification": {
        const {
          [optimisticUpdate.inboxNotificationId]: _,
          ...inboxNotifications
        } = output.inboxNotifications;
        output.inboxNotifications = inboxNotifications;
        break;
      }
      case "delete-all-inbox-notifications": {
        output.inboxNotifications = {};
        break;
      }
      case "update-notification-settings": {
        output.notificationSettings[optimisticUpdate.roomId] = {
          ...output.notificationSettings[optimisticUpdate.roomId],
          ...optimisticUpdate.settings,
        };
      }
    }
  }

  const cleanedThreads =
    // Don't expose any soft-deleted threads
    Object.values(output.threads).filter(
      (thread): thread is ThreadData<M> => !thread.deletedAt
    );

  return {
    inboxNotificationsById: output.inboxNotifications,
    notificationSettingsByRoomId: output.notificationSettings,
    queries: state.queries,
    threads: cleanedThreads,
    threadsById: output.threads,
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
          body: undefined,
        }
      : comment
  );

  // If all comments have been deleted, we mark the thread as deleted
  if (!updatedComments.some((comment) => comment.deletedAt === undefined)) {
    return {
      ...thread,
      deletedAt,
      updatedAt: deletedAt,
      comments: [],
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
