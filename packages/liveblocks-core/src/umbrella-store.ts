import type { AsyncResult } from "./lib/AsyncResult";
import type { Store } from "./lib/create-store";
import { createStore } from "./lib/create-store";
import * as console from "./lib/fancy-console";
import { nanoid } from "./lib/nanoid";
import type { Resolve } from "./lib/Resolve";
import type { DistributiveOmit } from "./lib/utils";
import { mapValues } from "./lib/utils";
import type {
  BaseMetadata,
  CommentData,
  CommentReaction,
  CommentUserReaction,
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
} from "./protocol/Comments";
import type {
  InboxNotificationData,
  InboxNotificationDeleteInfo,
} from "./protocol/InboxNotifications";
import type { Patchable } from "./types/Patchable";
import type { RoomNotificationSettings } from "./types/RoomNotificationSettings";

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

export type UmbrellaStoreState<M extends BaseMetadata> = Readonly<{
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
}>;

export class UmbrellaStore<M extends BaseMetadata> {
  private _store: Store<UmbrellaStoreState<M>>;

  constructor() {
    this._store = createStore<UmbrellaStoreState<M>>({
      threads: {},
      queries: {},
      optimisticUpdates: [],
      inboxNotifications: {},
      notificationSettings: {},
    });

    // Auto-bind all of this class methods once here, so we can use stable
    // references to them (most important for use in useSyncExternalStore)
    this.get = this.get.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  public get(): Readonly<UmbrellaStoreState<M>> {
    return this._store.get();
  }

  public subscribe(
    callback: (state: Readonly<UmbrellaStoreState<M>>) => void
  ): () => void {
    return this._store.subscribe(callback);
  }

  /**
   * Only call this method from unit tests.
   *
   * @private
   */
  public force_set(
    callback: (
      currentState: Readonly<UmbrellaStoreState<M>>
    ) => Readonly<UmbrellaStoreState<M>>
  ): void {
    return this._store.set(callback);
  }

  /**
   * Mutate the state by returning a newly computed state, and removing the
   * optimistic update. This helper lies at the core of all state updates.
   */
  private replaceOptimisticUpdate(
    optimisticUpdateId: string | null,
    callback: (
      state: Readonly<UmbrellaStoreState<M>>
    ) => Readonly<UmbrellaStoreState<M>>
  ): void {
    return this._store.set((state) => {
      const newState = callback(state);
      const newOptimisticUpdates =
        optimisticUpdateId !== null
          ? newState.optimisticUpdates.filter(
              (ou) => ou.id !== optimisticUpdateId
            )
          : newState.optimisticUpdates;
      return { ...newState, optimisticUpdates: newOptimisticUpdates };
    });
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
      ibn: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        const existing = state.inboxNotifications[inboxNotificationId];

        // If the inbox notification doesn't exist in the cache, we do not change anything
        if (!existing) {
          return state;
        }

        const inboxNotifications = {
          ...state.inboxNotifications,
          [inboxNotificationId]: callback(existing),
        };
        return { ...state, inboxNotifications };
      }
    );
  }

  /**
   * Updates *all* inbox notifications by running a mapper function over all of
   * them, replacing the corresponding optimistic update.
   */
  public updateAllInboxNotifications(
    optimisticUpdateId: string,
    mapFn: (
      ibn: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        const inboxNotifications = mapValues(state.inboxNotifications, mapFn);
        return { ...state, inboxNotifications };
      }
    );
  }

  /**
   * Deletes an existing inbox notification, replacing the corresponding
   * optimistic update.
   */
  public deleteInboxNotification(
    inboxNotificationId: string,
    optimisticUpdateId: string
  ): void {
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        // If the inbox notification doesn't exist in the cache, we do not
        // change anything
        const existing = state.inboxNotifications[inboxNotificationId];
        if (!existing) {
          return state;
        }

        // Delete it
        const { [inboxNotificationId]: _, ...inboxNotifications } =
          state.inboxNotifications;

        return { ...state, inboxNotifications };
      }
    );
  }

  /**
   * Deletes *all* inbox notifications, replacing the corresponding optimistic
   * update.
   */
  public deleteAllInboxNotifications(optimisticUpdateId: string): void {
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        // Set empty
        return { ...state, inboxNotifications: {} };
      }
    );
  }

  /**
   * Creates an new thread, replacing the corresponding optimistic update.
   */
  public createThread(
    optimisticUpdateId: string,
    thread: Readonly<ThreadDataWithDeleteInfo<M>>
  ): void {
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        return {
          ...state,
          threads: { ...state.threads, [thread.id]: thread },
        };
      }
    );
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
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        const existing = state.threads[threadId];

        // If the thread doesn't exist in the cache, we do not update the metadata
        if (!existing) {
          return state;
        }

        // If the thread has been deleted, we do not update the metadata
        if (existing.deletedAt !== undefined) {
          return state;
        }

        if (
          !!updatedAt &&
          !!existing.updatedAt &&
          existing.updatedAt > updatedAt
        ) {
          return state;
        }

        const threads = { ...state.threads, [threadId]: callback(existing) };
        return { ...state, threads };
      }
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
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        const existingThread = state.threads[newComment.threadId];
        if (!existingThread) {
          return state;
        }

        const inboxNotification = Object.values(state.inboxNotifications).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === newComment.threadId
        );

        const threads = {
          ...state.threads,
          [newComment.threadId]: upsertComment(existingThread, newComment),
        };

        // If the thread has an inbox notification associated with it, we update the notification's `notifiedAt` and `readAt` values
        const inboxNotifications =
          inboxNotification !== undefined
            ? {
                ...state.inboxNotifications,
                [inboxNotification.id]: {
                  ...inboxNotification,
                  notifiedAt: newComment.createdAt,
                  readAt: newComment.createdAt,
                },
              }
            : state.inboxNotifications;

        return {
          ...state,
          threads,
          inboxNotifications,
        };
      }
    );
  }

  public updateThreadAndNotification(
    thread: ThreadData<M>,
    inboxNotification?: InboxNotificationData
  ): void {
    this._store.set((state) => {
      const existingThread = state.threads[thread.id];

      return {
        ...state,
        threads:
          existingThread === undefined ||
          compareThreads(thread, existingThread) === 1
            ? { ...state.threads, [thread.id]: thread }
            : state.threads,
        inboxNotifications:
          inboxNotification === undefined // TODO: Compare notification dates to make sure it's not stale
            ? state.inboxNotifications
            : {
                ...state.inboxNotifications,
                [inboxNotification.id]: inboxNotification,
              },
      };
    });
  }

  public updateThreadsAndNotifications(
    threads: ThreadData<M>[],
    inboxNotifications: InboxNotificationData[],
    deletedThreads: ThreadDeleteInfo[],
    deletedInboxNotifications: InboxNotificationDeleteInfo[],
    queryKey?: string
  ): void {
    this._store.set((state) => ({
      ...state,
      threads: applyThreadUpdates(state.threads, {
        newThreads: threads,
        deletedThreads,
      }),
      inboxNotifications: applyNotificationsUpdates(state.inboxNotifications, {
        newInboxNotifications: inboxNotifications,
        deletedNotifications: deletedInboxNotifications,
      }),

      // XXX Direct mutation of query state here (this should ideally only happen through setQueryOK()
      queries:
        queryKey !== undefined
          ? {
              ...state.queries,
              [queryKey]: { isLoading: false, data: undefined },
            }
          : state.queries,
    }));
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
    return this.replaceOptimisticUpdate(
      optimisticUpdateId,

      (state) => {
        // If the notification setting doesn't exist in the cache, we do not change anything
        const existing = state.notificationSettings[roomId];
        if (!existing) {
          return state;
        }

        const notificationSettings = {
          ...state.notificationSettings,
          [roomId]: settings,
        };
        return { ...state, notificationSettings };
      }
    );
  }

  public updateRoomInboxNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings,
    queryKey: string
  ): void {
    this._store.set((state) => ({
      ...state,
      notificationSettings: {
        ...state.notificationSettings,
        [roomId]: settings,
      },

      // XXX Direct mutation of query state here (this should ideally only happen through setQueryOK()
      queries: {
        ...state.queries,
        [queryKey]: { isLoading: false, data: undefined },
      },
    }));
  }

  public addOptimisticUpdate(
    optimisticUpdate: DistributiveOmit<OptimisticUpdate<M>, "id">
  ): string {
    const id = nanoid();
    const newUpdate: OptimisticUpdate<M> = { ...optimisticUpdate, id };
    this._store.set((state) => ({
      ...state,
      optimisticUpdates: [...state.optimisticUpdates, newUpdate],
    }));
    return id;
  }

  public removeOptimisticUpdate(optimisticUpdateId: string): void {
    return this.replaceOptimisticUpdate(optimisticUpdateId, (state) => state);
  }

  //
  // Query State APIs
  //

  private setQueryState(queryKey: string, queryState: QueryState): void {
    this._store.set((state) => ({
      ...state,
      queries: {
        ...state.queries,
        [queryKey]: queryState,
      },
    }));
  }

  public setQueryLoading(queryKey: string): void {
    this.setQueryState(queryKey, { isLoading: true });
  }

  // public setQueryOK(queryKey: string): void {
  //   this.setQueryState(queryKey, { isLoading: false, data: undefined });
  // }

  public setQueryError(queryKey: string, error: Error): void {
    this.setQueryState(queryKey, { isLoading: false, error });
  }
}

/**
 * Compares two threads to determine which one is newer.
 * @param threadA The first thread to compare.
 * @param threadB The second thread to compare.
 * @returns 1 if threadA is newer, -1 if threadB is newer, or 0 if they are the same age or can't be compared.
 */
export function compareThreads<M extends BaseMetadata>(
  thread1: ThreadData<M>,
  thread2: ThreadData<M>
): number {
  // Compare updatedAt if available
  if (thread1.updatedAt && thread2.updatedAt) {
    return thread1.updatedAt > thread2.updatedAt
      ? 1
      : thread1.updatedAt < thread2.updatedAt
        ? -1
        : 0;
  } else if (thread1.updatedAt || thread2.updatedAt) {
    return thread1.updatedAt ? 1 : -1;
  }

  // Finally, compare createdAt
  if (thread1.createdAt > thread2.createdAt) {
    return 1;
  } else if (thread1.createdAt < thread2.createdAt) {
    return -1;
  }

  // If all dates are equal, return 0
  return 0;
}

export function applyOptimisticUpdates<M extends BaseMetadata>(
  state: UmbrellaStoreState<M>
): Pick<
  UmbrellaStoreState<M>,
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

    // If the thread already exists, we need to compare the two threads to determine which one is newer.
    if (existingThread) {
      const result = compareThreads(existingThread, thread);
      // If the existing thread is newer than the new thread, we do not update the existing thread.
      if (result === 1) return;
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
