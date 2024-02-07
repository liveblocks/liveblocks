import type { Store } from "./lib/create-store";
import { createStore } from "./lib/create-store";
import type { Resolve } from "./lib/Resolve";
import type { BaseMetadata } from "./types/BaseMetadata";
import type { CommentBody } from "./types/CommentBody";
import type { CommentData, CommentReaction } from "./types/CommentData";
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
  };

type CreateCommentOptimisticUpdate = {
  type: "create-comment";
  id: string;
  comment: CommentData;
  inboxNotificationId?: string;
};

type EditCommentOptimisticUpdate = {
  type: "edit-comment";
  id: string;
  threadId: string;
  editedAt: Date;
  commentId: string;
  body: CommentBody;
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
  emoji: string;
  createdAt: Date;
  userId: string;
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

  function applyThreadUpdates(
    existingThreads: Record<string, ThreadDataWithDeleteInfo<TThreadMetadata>>,
    updates: {
      newThreads: Record<string, ThreadData<TThreadMetadata>>;
      deletedThreads: ThreadDeleteInfo[];
    }
  ): Record<string, ThreadData<TThreadMetadata>> {
    const updatedThreads = { ...existingThreads };

    // Add new threads or update existing threads if the existing thread is older than the new thread.
    Object.entries(updates.newThreads).forEach(([id, thread]) => {
      const existingThread = updatedThreads[id];

      // If the thread already exists, we need to compare the two threads to determine which one is newer.
      if (existingThread) {
        const result = compareThreads(existingThread, thread);
        // If the existing thread is newer than the new thread, we do not update the existing thread.
        if (result === 1) return;
      }
      updatedThreads[id] = thread;
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

  function applyNotificationsUpdates(
    existingInboxNotifications: Record<string, InboxNotificationData>,
    updates: {
      newInboxNotifications: Record<string, InboxNotificationData>;
      deletedNotifications: InboxNotificationDeleteInfo[];
    }
  ) {
    // TODO: Do not replace existing inboxNotifications if it has been updated more recently than the incoming inbox notifications (including checking for deleted notifications)
    const updatedInboxNotifications = {
      ...existingInboxNotifications,
      ...updates.newInboxNotifications,
    };

    updates.deletedNotifications.forEach(
      ({ id }) => delete updatedInboxNotifications[id]
    );

    return updatedInboxNotifications;
  }

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
          newThreads: Object.fromEntries(
            threads.map((thread) => [thread.id, thread])
          ),
          deletedThreads,
        }),
        inboxNotifications: applyNotificationsUpdates(
          state.inboxNotifications,
          {
            newInboxNotifications: Object.fromEntries(
              inboxNotifications.map((notification) => [
                notification.id,
                notification,
              ])
            ),
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
        if (thread === undefined) {
          break;
        }
        result.threads[thread.id] = {
          ...thread,
          metadata: {
            ...thread.metadata,
            ...optimisticUpdate.metadata,
          },
        };
        break;
      }
      case "create-comment": {
        const thread = result.threads[optimisticUpdate.comment.threadId];
        if (thread === undefined) {
          break;
        }
        result.threads[thread.id] = {
          ...thread,
          comments: [...thread.comments, optimisticUpdate.comment], // TODO: Handle replace comment
        };
        if (!optimisticUpdate.inboxNotificationId) {
          break;
        }
        const inboxNotification =
          result.inboxNotifications[optimisticUpdate.inboxNotificationId];
        result.inboxNotifications[optimisticUpdate.inboxNotificationId] = {
          ...inboxNotification,
          notifiedAt: optimisticUpdate.comment.createdAt,
          readAt: optimisticUpdate.comment.createdAt,
        };
        break;
      }
      case "edit-comment": {
        const thread = result.threads[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          comments: thread.comments.map((comment) =>
            comment.id === optimisticUpdate.commentId
              ? ({
                  ...comment,
                  editedAt: optimisticUpdate.editedAt,
                  body: optimisticUpdate.body,
                } as CommentData) // TODO: Should we handle deleted CommentData?
              : comment
          ),
        };
        break;
      }
      case "delete-comment": {
        const thread = result.threads[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          comments: thread.comments.map((comment) =>
            comment.id === optimisticUpdate.commentId
              ? {
                  ...comment,
                  deletedAt: optimisticUpdate.deletedAt,
                  body: undefined,
                }
              : comment
          ),
        };

        if (
          !result.threads[thread.id].comments.some(
            (comment) => comment.deletedAt === undefined
          )
        ) {
          delete result.threads[thread.id];
        }

        break;
      }
      case "add-reaction": {
        const thread = result.threads[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          comments: thread.comments.map((comment) => {
            if (comment.id === optimisticUpdate.commentId) {
              if (
                comment.reactions.some(
                  (reaction) => reaction.emoji === optimisticUpdate.emoji
                )
              ) {
                return {
                  ...comment,
                  reactions: comment.reactions.map((reaction) =>
                    reaction.emoji === optimisticUpdate.emoji
                      ? {
                          ...reaction,
                          users: [
                            ...reaction.users,
                            { id: optimisticUpdate.userId },
                          ],
                        }
                      : reaction
                  ),
                };
              } else {
                return {
                  ...comment,
                  reactions: [
                    ...comment.reactions,
                    {
                      emoji: optimisticUpdate.emoji,
                      createdAt: optimisticUpdate.createdAt,
                      users: [{ id: optimisticUpdate.userId }],
                    },
                  ],
                };
              }
            } else {
              return comment;
            }
          }),
        };
        break;
      }
      case "remove-reaction": {
        const thread = result.threads[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result.threads[thread.id] = {
          ...thread,
          comments: thread.comments.map((comment) => {
            if (comment.id !== optimisticUpdate.commentId) {
              return comment;
            }

            const reactionIndex = comment.reactions.findIndex(
              (reaction) => reaction.emoji === optimisticUpdate.emoji
            );
            let reactions: CommentReaction[] = comment.reactions;

            if (
              reactionIndex >= 0 &&
              comment.reactions[reactionIndex].users.some(
                (user) => user.id === optimisticUpdate.userId
              )
            ) {
              if (comment.reactions[reactionIndex].users.length <= 1) {
                reactions = [...comment.reactions];
                reactions.splice(reactionIndex, 1);
              } else {
                reactions[reactionIndex] = {
                  ...reactions[reactionIndex],
                  users: reactions[reactionIndex].users.filter(
                    (user) => user.id !== optimisticUpdate.userId
                  ),
                };
              }
            }

            return {
              ...comment,
              reactions,
            };
          }),
        };
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
