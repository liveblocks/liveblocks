import type { Store } from "./lib/create-store";
import { createStore } from "./lib/create-store";
import type { Resolve } from "./lib/Resolve";
import type { BaseMetadata } from "./types/BaseMetadata";
import type { CommentData, CommentReaction } from "./types/CommentData";
import type { CommentUserReaction } from "./types/CommentReaction";
import type { InboxNotificationData } from "./types/InboxNotificationData";
import type { InboxNotificationDeleteInfo } from "./types/InboxNotificationDeleteInfo";
import type { PartialNullable } from "./types/PartialNullable";
import type { RoomNotificationSettings } from "./types/RoomNotificationSettings";
import type { ThreadData, ThreadDataWithDeleteInfo } from "./types/ThreadData";
import type { ThreadDeleteInfo } from "./types/ThreadDeleteInfo";

type OptimisticUpdate<TThreadMetadata extends BaseMetadata> =
  | CreateThreadOptimisticUpdate<TThreadMetadata>
  | EditThreadMetadataOptimisticUpdate<TThreadMetadata>
  | CreateCommentOptimisticUpdate
  | EditCommentOptimisticUpdate
  | DeleteCommentOptimisticUpdate
  | AddReactionOptimisticUpdate
  | RemoveReactionOptimisticUpdate
  | MarkInboxNotificationAsReadOptimisticUpdate
  | MarkAllInboxNotificationsAsReadOptimisticUpdate
  | UpdateNotificationSettingsOptimisticUpdate;

type CreateThreadOptimisticUpdate<TThreadMetadata extends BaseMetadata> = {
  type: "create-thread";
  id: string;
  thread: ThreadData<TThreadMetadata>;
};

type EditThreadMetadataOptimisticUpdate<TThreadMetadata extends BaseMetadata> =
  {
    type: "edit-thread-metadata";
    id: string;
    threadId: string;
    metadata: Resolve<PartialNullable<TThreadMetadata>>;
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
  editedAt: Date;
  comment: CommentData;
};

type DeleteCommentOptimisticUpdate = {
  type: "delete-comment";
  id: string;
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
};

type MarkInboxNotificationAsReadOptimisticUpdate = {
  type: "mark-inbox-notification-as-read";
  id: string;
  inboxNotificationId: string;
  readAt: Date;
};

type MarkAllInboxNotificationsAsReadOptimisticUpdate = {
  type: "mark-inbox-notifications-as-read";
  id: string;
  readAt: Date;
};

type UpdateNotificationSettingsOptimisticUpdate = {
  type: "update-notification-settings";
  id: string;
  roomId: string;
  settings: Partial<RoomNotificationSettings>;
};

type QueryState =
  | { isLoading: true; error?: never }
  | { isLoading: false; error?: Error };

export type CacheState<TThreadMetadata extends BaseMetadata> = {
  /**
   * Threads by ID.
   */
  threads: Record<string, ThreadDataWithDeleteInfo<TThreadMetadata>>;
  /**
   * Keep track of loading and error status of all the queries made by the client.
   */
  queries: Record<string, QueryState>;
  /**
   * Optimistic updates that have not been acknowledged by the server yet.
   * They are applied on top of the threads in selectors.
   */
  optimisticUpdates: OptimisticUpdate<TThreadMetadata>[];
  /**
   * Inbox notifications by ID.
   */
  inboxNotifications: Record<string, InboxNotificationData>;
  /**
   * Notification settings per room id
   */
  notificationSettings: Record<string, RoomNotificationSettings>;
};

export interface CacheStore<TThreadMetadata extends BaseMetadata>
  extends Store<CacheState<TThreadMetadata>> {
  deleteThread(threadId: string): void;
  updateThreadAndNotification(
    thread: ThreadData<TThreadMetadata>,
    inboxNotification?: InboxNotificationData
  ): void;
  updateThreadsAndNotifications(
    threads: ThreadData<TThreadMetadata>[],
    inboxNotifications: InboxNotificationData[],
    deletedThreads: ThreadDeleteInfo[],
    deletedInboxNotifications: InboxNotificationDeleteInfo[],
    queryKey?: string
  ): void;
  updateRoomInboxNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings,
    queryKey: string
  ): void;
  pushOptimisticUpdate(
    optimisticUpdate: OptimisticUpdate<TThreadMetadata>
  ): void;
  setQueryState(queryKey: string, queryState: QueryState): void;
}

/**
 * Create internal immutable store for comments and notifications.
 * Keep all the state required to return data from our hooks.
 */
export function createClientStore<
  TThreadMetadata extends BaseMetadata,
>(): CacheStore<TThreadMetadata> {
  const store = createStore<CacheState<TThreadMetadata>>({
    threads: {},
    queries: {},
    optimisticUpdates: [],
    inboxNotifications: {},
    notificationSettings: {},
  });

  return {
    ...store,

    deleteThread(threadId: string) {
      store.set((state) => {
        return {
          ...state,
          threads: deleteKeyImmutable(state.threads, threadId),
          inboxNotifications: Object.fromEntries(
            Object.entries(state.inboxNotifications).filter(
              ([_id, notification]) => notification.threadId !== threadId
            )
          ),
        };
      });
    },

    updateThreadAndNotification(
      thread: ThreadData<TThreadMetadata>,
      inboxNotification?: InboxNotificationData
    ) {
      store.set((state) => {
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
    },

    updateThreadsAndNotifications(
      threads: ThreadData<TThreadMetadata>[],
      inboxNotifications: InboxNotificationData[],
      deletedThreads: ThreadDeleteInfo[],
      deletedInboxNotifications: InboxNotificationDeleteInfo[],
      queryKey?: string
    ) {
      store.set((state) => ({
        ...state,
        threads: applyThreadUpdates(state.threads, {
          newThreads: threads,
          deletedThreads,
        }),
        inboxNotifications: applyNotificationsUpdates(
          state.inboxNotifications,
          {
            newInboxNotifications: inboxNotifications,
            deletedNotifications: deletedInboxNotifications,
          }
        ),
        queries:
          queryKey !== undefined
            ? {
                ...state.queries,
                [queryKey]: {
                  isLoading: false,
                },
              }
            : state.queries,
      }));
    },

    updateRoomInboxNotificationSettings(
      roomId: string,
      settings: RoomNotificationSettings,
      queryKey: string
    ) {
      store.set((state) => ({
        ...state,
        notificationSettings: {
          ...state.notificationSettings,
          [roomId]: settings,
        },
        queries: {
          ...state.queries,
          [queryKey]: {
            isLoading: false,
          },
        },
      }));
    },

    pushOptimisticUpdate(optimisticUpdate: OptimisticUpdate<TThreadMetadata>) {
      store.set((state) => ({
        ...state,
        optimisticUpdates: [...state.optimisticUpdates, optimisticUpdate],
      }));
    },

    setQueryState(queryKey: string, queryState: QueryState) {
      store.set((state) => ({
        ...state,
        queries: {
          ...state.queries,
          [queryKey]: queryState,
        },
      }));
    },
  };
}

function deleteKeyImmutable<TKey extends string | number | symbol, TValue>(
  record: Record<TKey, TValue>,
  key: TKey
) {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    const { [key]: _toDelete, ...rest } = record;
    return rest;
  }

  return record;
}

/**
 * Compares two threads to determine which one is newer.
 * @param threadA The first thread to compare.
 * @param threadB The second thread to compare.
 * @returns 1 if threadA is newer, -1 if threadB is newer, or 0 if they are the same age or can't be compared.
 */
export function compareThreads<TThreadMetadata extends BaseMetadata>(
  thread1: ThreadData<TThreadMetadata>,
  thread2: ThreadData<TThreadMetadata>
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

export function applyOptimisticUpdates<TThreadMetadata extends BaseMetadata>(
  state: CacheState<TThreadMetadata>
): Pick<
  CacheState<TThreadMetadata>,
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
          (notification) => notification.threadId === thread.id
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
          optimisticUpdate.userId
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
      case "mark-inbox-notifications-as-read": {
        for (const id in result.inboxNotifications) {
          result.inboxNotifications[id] = {
            ...result.inboxNotifications[id],
            readAt: optimisticUpdate.readAt,
          };
        }
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

export function applyThreadUpdates<TThreadMetadata extends BaseMetadata>(
  existingThreads: Record<string, ThreadDataWithDeleteInfo<TThreadMetadata>>,
  updates: {
    newThreads: ThreadData<TThreadMetadata>[];
    deletedThreads: ThreadDeleteInfo[];
  }
): Record<string, ThreadData<TThreadMetadata>> {
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

export function upsertComment<TThreadMetadata extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<TThreadMetadata>,
  comment: CommentData
): ThreadDataWithDeleteInfo<TThreadMetadata> {
  // If the thread has been deleted, we do not apply the update
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  // If the thread has been updated since the optimistic update, we do not apply the update
  if (thread.updatedAt !== undefined && thread.updatedAt > comment.createdAt) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (existingComment) => existingComment.id === comment.id
  );

  if (existingComment === undefined) {
    return {
      ...thread,
      comments: [...thread.comments, comment],
    };
  }

  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  if (
    existingComment.editedAt !== undefined &&
    existingComment.editedAt > comment.createdAt
  ) {
    return thread;
  }

  const newComments = thread.comments.map((existingComment) =>
    existingComment.id === comment.id ? comment : existingComment
  );

  return {
    ...thread,
    comments: newComments,
  };
}

export function deleteComment<TThreadMetadata extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<TThreadMetadata>,
  commentId: string,
  deletedAt: Date
): ThreadDataWithDeleteInfo<TThreadMetadata> {
  // If the thread has been deleted, we do not delete the comment
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  // If the thread has been updated since the deletion request, we do not delete the comment
  if (thread.updatedAt !== undefined && thread.updatedAt > deletedAt) {
    return thread;
  }

  const comment = thread.comments.find((comment) => comment.id === commentId);

  // If the comment doesn't exist in the thread, we do not delete the comment
  if (comment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the deletion request, we do not delete the comment
  if (comment.deletedAt !== undefined && comment.deletedAt > deletedAt) {
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

  if (!updatedComments.some((comment) => comment.deletedAt === undefined)) {
    return {
      ...thread,
      deletedAt,
      comments: [],
    };
  }

  return {
    ...thread,
    comments: updatedComments,
  };
}

export function addReaction<TThreadMetadata extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<TThreadMetadata>,
  commentId: string,
  reaction: CommentUserReaction
): ThreadDataWithDeleteInfo<TThreadMetadata> {
  // If the thread has been deleted, we do not delete the comment
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  // If the thread has been updated since the reaction addition request, we do not add the reaction
  if (thread.updatedAt !== undefined && thread.updatedAt > reaction.createdAt) {
    return thread;
  }

  const comment = thread.comments.find((comment) => comment.id === commentId);

  // If the comment doesn't exist in the thread, we do not add the reaction
  if (comment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction addition request, we do not add the reaction
  if (comment.deletedAt !== undefined) {
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
    comments: updatedComments,
  };
}

export function removeReaction<TThreadMetadata extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<TThreadMetadata>,
  commentId: string,
  emoji: string,
  userId: string
): ThreadDataWithDeleteInfo<TThreadMetadata> {
  // If the thread has been deleted, we do not remove the reaction
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  // If the thread has been updated since the reaction removal request, we do not remove the reaction
  if (thread.updatedAt !== undefined) {
    return thread;
  }

  const comment = thread.comments.find((comment) => comment.id === commentId);

  // If the comment doesn't exist in the thread, we do not remove the reaction
  if (comment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction removal request, we do not remove the reaction
  if (comment.deletedAt !== undefined) {
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
