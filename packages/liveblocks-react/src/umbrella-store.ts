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
import { console, createStore, mapValues, nanoid } from "@liveblocks/core";

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

type RawUmbrellaStoreState<M extends BaseMetadata> = Readonly<{
  /**
   * Keep track of loading and error status of all the queries made by the client.
   * e.g. 'room-abc-{"color":"red"}'  - ok
   * e.g. 'room-abc-{}'               - loading
   */
  queries: Record<string, QueryState>;
  /**
   * Optimistic updates that have not been acknowledged by the server yet.
   * They are applied on top of the threads in selectors.
   */
  optimisticUpdates: readonly OptimisticUpdate<M>[];

  /**
   * Threads by ID
   * e.g. `th_${string}`
   */
  threads: Record<string, ThreadDataWithDeleteInfo<M>>;
  /**
   * Inbox notifications by ID.
   * e.g. `in_${string}`
   */
  inboxNotifications: Record<string, InboxNotificationData>;
  /**
   * Notification settings by room ID.
   * e.g. { 'room-abc': { threads: "all" },
   *        'room-def': { threads: "replies_and_mentions" },
   *        'room-xyz': { threads: "none" },
   *      }
   */
  notificationSettings: Record<string, RoomNotificationSettings>;
  /**
   * Versions per roomId
   * e.g. { 'room-abc': {versions: "all versions"}}
   */
  versions: Record<string, HistoryVersion[]>;
}>;

// XXX Replace with definition below
type BeautifulUmbrellaStoreState<M extends BaseMetadata> =
  RawUmbrellaStoreState<M>;
// type BeautifulUmbrellaStoreState<M extends BaseMetadata> = Omit<
//   RawUmbrellaStoreState<M>,
//   | "optimisticUpdates" // This field is no longer accessible from the outside...
//   | "threads" // This field is refined to the version below...
// > & {
//   threads: Record<string, ThreadData<M>>; // Where ThreadDataWithDeleteInfo is replaced by ThreadData
// };

export type UmbrellaState_forThreads<M extends BaseMetadata> = Pick<
  RawUmbrellaStoreState<M>,
  // XXX Shrink the payload type by removing as much as possible here
  | "queries"
  | "optimisticUpdates"
  | "threads"
  | "inboxNotifications"
  | "notificationSettings"
>;

export type UmbrellaState_forInboxNotifications<M extends BaseMetadata> = Pick<
  RawUmbrellaStoreState<M>,
  // XXX Shrink the payload type by removing as much as possible here
  | "queries"
  | "optimisticUpdates"
  | "threads"
  | "inboxNotifications"
  | "notificationSettings"
>;

export type UmbrellaState_forNotificationSettings<M extends BaseMetadata> =
  Pick<
    RawUmbrellaStoreState<M>,
    // XXX Shrink the payload type by removing as much as possible here
    | "queries"
    | "optimisticUpdates"
    | "threads"
    | "inboxNotifications"
    | "notificationSettings"
  >;

export type UmbrellaState_forVersions<M extends BaseMetadata> = Pick<
  RawUmbrellaStoreState<M>,
  // XXX Shrink the payload type by removing as much as possible here
  "queries" | "versions"
>;

export class UmbrellaStore<M extends BaseMetadata> {
  private _store: Store<RawUmbrellaStoreState<M>>;
  private _prevState: RawUmbrellaStoreState<M> | null = null;
  private _stateCached: BeautifulUmbrellaStoreState<M> | null = null;

  constructor() {
    this._store = createStore<RawUmbrellaStoreState<M>>({
      threads: {},
      queries: {},
      optimisticUpdates: [],
      inboxNotifications: {},
      notificationSettings: {},
      versions: {},
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

  private get(): BeautifulUmbrellaStoreState<M> {
    function f<T>(x: T): T {
      return x;
    }

    // Don't return the raw internal state immediately! Return a new computed
    // cached state (with optimistic updates applied) instead, and cache that
    // until the next .set() call invalidates it.
    const rawState = this._store.get();
    if (this._prevState !== rawState || this._stateCached === null) {
      this._prevState = rawState;
      this._stateCached = f(rawState);
      //                  ^ This should become applyOptimisticUpdates()
    }
    return this._stateCached;
  }

  public getThreads(): UmbrellaState_forThreads<M> {
    return this.get();
  }

  public getInboxNotifications(): UmbrellaState_forInboxNotifications<M> {
    return this.get();
  }

  public getNotificationSettings(): UmbrellaState_forNotificationSettings<M> {
    return this.get();
  }

  public getVersions(): UmbrellaState_forVersions<M> {
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
      const threads = mapFn(state.threads);
      return threads !== state.threads ? { ...state, threads } : state;
    });
  }

  private updateInboxNotificationsCache(
    mapFn: (
      cache: Readonly<Record<string, InboxNotificationData>>
    ) => Readonly<Record<string, InboxNotificationData>>
  ): void {
    this._store.set((state) => {
      const inboxNotifications = mapFn(state.inboxNotifications);
      return inboxNotifications !== state.inboxNotifications
        ? { ...state, inboxNotifications }
        : state;
    });
  }

  private setNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings
  ): void {
    this._store.set((state) => ({
      ...state,
      notificationSettings: {
        ...state.notificationSettings,
        [roomId]: settings,
      },
    }));
  }

  private setVersions(roomId: string, versions: HistoryVersion[]): void {
    this._store.set((state) => ({
      ...state,
      versions: {
        ...state.versions,
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
    callback: (
      currentState: RawUmbrellaStoreState<M>
    ) => RawUmbrellaStoreState<M>
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
  public updateThread(
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
      const existingThread = this._store.get().threads[newComment.threadId];
      if (!existingThread) {
        return;
      }

      // 2️⃣ Update the thread instance by adding a comment under it
      this.updateThreadsCache((cache) => ({
        ...cache,
        [newComment.threadId]: upsertComment(existingThread, newComment),
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

export function applyOptimisticUpdates_threads<M extends BaseMetadata>(
  // XXX Shrink as much as possible
  state: Pick<
    RawUmbrellaStoreState<M>,
    | "optimisticUpdates"
    | "threads"
    | "inboxNotifications"
    | "notificationSettings"
  >
): ThreadData<M>[] {
  const allThreads = Object.values(applyOptimisticUpdates(state).threads);

  // Don't expose any soft-deleted threads
  return allThreads.filter(
    (thread): thread is ThreadData<M> => !thread.deletedAt
  );
}

export function applyOptimisticUpdates_inboxNotifications<
  M extends BaseMetadata,
>(
  // XXX Shrink as much as possible
  state: Pick<
    RawUmbrellaStoreState<M>,
    | "optimisticUpdates"
    | "threads"
    | "inboxNotifications"
    | "notificationSettings"
  >
): RawUmbrellaStoreState<M>["inboxNotifications"] {
  return applyOptimisticUpdates(state).inboxNotifications;
}

export function applyOptimisticUpdates_notificationSettings<
  M extends BaseMetadata,
>(
  // XXX Shrink as much as possible
  state: Pick<
    RawUmbrellaStoreState<M>,
    | "optimisticUpdates"
    | "threads"
    | "inboxNotifications"
    | "notificationSettings"
  >
): RawUmbrellaStoreState<M>["notificationSettings"] {
  return applyOptimisticUpdates(state).notificationSettings;
}

function applyOptimisticUpdates<M extends BaseMetadata>(
  // XXX Shrink as much as possible
  state: Pick<
    RawUmbrellaStoreState<M>,
    | "optimisticUpdates"
    | "threads"
    | "inboxNotifications"
    | "notificationSettings"
  >
): Pick<
  RawUmbrellaStoreState<M>,
  "threads" | "inboxNotifications" | "notificationSettings"
> {
  const result = {
    threads: {
      ...state.threads,
    },
    inboxNotifications: {
      ...state.inboxNotifications,
    },
    notificationSettings: {
      ...state.notificationSettings,
    },
  };

  for (const optimisticUpdate of state.optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "create-thread": {
        result.threads[optimisticUpdate.thread.id] = optimisticUpdate.thread;
        break;
      }
      case "edit-thread-metadata": {
        const thread = result.threads[optimisticUpdate.threadId];
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

        result.threads[thread.id] = {
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
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          resolved: true,
        };

        break;
      }
      case "mark-thread-as-unresolved": {
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        // If the thread has been deleted, we do not apply the update
        if (thread.deletedAt !== undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          resolved: false,
        };

        break;
      }
      case "create-comment": {
        const thread = result.threads[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = upsertComment(
          thread,
          optimisticUpdate.comment
        );

        const inboxNotification = Object.values(result.inboxNotifications).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === thread.id
        );

        if (inboxNotification === undefined) {
          break;
        }

        result.inboxNotifications[inboxNotification.id] = {
          ...inboxNotification,
          notifiedAt: optimisticUpdate.comment.createdAt,
          readAt: optimisticUpdate.comment.createdAt,
        };

        break;
      }
      case "edit-comment": {
        const thread = result.threads[optimisticUpdate.comment.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = upsertComment(
          thread,
          optimisticUpdate.comment
        );

        break;
      }
      case "delete-comment": {
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = deleteComment(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.deletedAt
        );

        break;
      }

      case "delete-thread": {
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[optimisticUpdate.threadId] = {
          ...result.threads[optimisticUpdate.threadId],
          deletedAt: optimisticUpdate.deletedAt,
          updatedAt: optimisticUpdate.deletedAt,
          comments: [],
        };
        break;
      }
      case "add-reaction": {
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = addReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.reaction
        );

        break;
      }
      case "remove-reaction": {
        const thread = result.threads[optimisticUpdate.threadId];
        // If the thread doesn't exist in the cache, we do not apply the update
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = removeReaction(
          thread,
          optimisticUpdate.commentId,
          optimisticUpdate.emoji,
          optimisticUpdate.userId,
          optimisticUpdate.removedAt
        );

        break;
      }
      case "mark-inbox-notification-as-read": {
        result.inboxNotifications[optimisticUpdate.inboxNotificationId] = {
          ...state.inboxNotifications[optimisticUpdate.inboxNotificationId],
          readAt: optimisticUpdate.readAt,
        };
        break;
      }
      case "mark-all-inbox-notifications-as-read": {
        for (const id in result.inboxNotifications) {
          result.inboxNotifications[id] = {
            ...result.inboxNotifications[id],
            readAt: optimisticUpdate.readAt,
          };
        }
        break;
      }
      case "delete-inbox-notification": {
        const {
          [optimisticUpdate.inboxNotificationId]: _,
          ...inboxNotifications
        } = result.inboxNotifications;
        result.inboxNotifications = inboxNotifications;
        break;
      }
      case "delete-all-inbox-notifications": {
        result.inboxNotifications = {};
        break;
      }
      case "update-notification-settings": {
        result.notificationSettings[optimisticUpdate.roomId] = {
          ...result.notificationSettings[optimisticUpdate.roomId],
          ...optimisticUpdate.settings,
        };
      }
    }
  }

  return result;
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

export function upsertComment<M extends BaseMetadata>(
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

export function deleteComment<M extends BaseMetadata>(
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

export function addReaction<M extends BaseMetadata>(
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

export function removeReaction<M extends BaseMetadata>(
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
