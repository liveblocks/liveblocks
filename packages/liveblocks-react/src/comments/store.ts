import type {
  BaseMetadata,
  CommentBody,
  CommentData,
  CommentReaction,
  PartialInboxNotificationData,
  Resolve,
  ThreadData,
} from "@liveblocks/core";

import type { UseThreadsOptions } from "../types";
import { createStore } from "./lib/createStore";

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

type OptimisticUpdate<TThreadMetadata extends BaseMetadata> =
  | CreateThreadOptimisticUpdate<TThreadMetadata>
  | EditThreadMetadataOptimisticUpdate<TThreadMetadata>
  | CreateCommentOptimisticUpdate
  | EditCommentOptimisticUpdate
  | DeleteCommentOptimisticUpdate
  | AddReactionOptimisticUpdate
  | RemoveReactionOptimisticUpdate;

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

type ThreadsQueryState =
  | { isLoading: true; error?: never }
  | { isLoading: false; error?: Error };

export type State<TThreadMetadata extends BaseMetadata> = {
  /**
   * Threads by id
   */
  threads: Record<string, ThreadData<TThreadMetadata>>;
  /**
   * Keep tracks of loading and error status of the threads queries
   */
  threadsQueries: Record<string, ThreadsQueryState>;
  /**
   * Optimistic updates that have not been acknowledged by the server yet.
   * They are applied on top of the threads in selectors
   */
  optimisticUpdates: OptimisticUpdate<TThreadMetadata>[];
  /**
   * InboxNotifications by id
   */
  inboxNotifications: Record<string, PartialInboxNotificationData>;
};

/**
 * Create internal immtuable store for comments and notifications.
 * Keep all the state required to return data from our hooks.
 */
export function createClientStore<TThreadMetadata extends BaseMetadata>() {
  const store = createStore<State<TThreadMetadata>>({
    threads: {},
    threadsQueries: {},
    optimisticUpdates: [],
    inboxNotifications: {},
  });

  function mergeThreads(
    existingThreads: Record<string, ThreadData<TThreadMetadata>>,
    newThreads: Record<string, ThreadData<TThreadMetadata>>
  ): Record<string, ThreadData<TThreadMetadata>> {
    const updatedThreads = { ...existingThreads };

    Object.entries(newThreads).forEach(([id, thread]) => {
      const existingThread = updatedThreads[id];

      // If the thread already exists, we need to compare the two threads to determine which one is newer.
      if (existingThread) {
        const result = compareThreads(existingThread, thread);
        // If the existing thread is newer than the new thread, we do not update the existing thread.
        if (result === 1) return;
      }
      updatedThreads[id] = thread;
    });

    return updatedThreads;
  }

  function mergeNotifications(
    existingInboxNotifications: Record<string, PartialInboxNotificationData>,
    newInboxNotifications: Record<string, PartialInboxNotificationData>
  ) {
    // TODO: Do not replace existing inboxNotifications if it has been updated more recently than the incoming inbox notifications
    const inboxNotifications = Object.values({
      ...existingInboxNotifications,
      ...newInboxNotifications,
    });

    return Object.fromEntries(
      inboxNotifications.map((notification) => [notification.id, notification])
    );
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
      inboxNotification?: PartialInboxNotificationData
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
      threads: Record<string, ThreadData<TThreadMetadata>>,
      inboxNotifications: Record<string, PartialInboxNotificationData>,
      queryKey?: string
    ) {
      store.set((state) => ({
        ...state,
        threads: mergeThreads(state.threads, threads),
        inboxNotifications: mergeNotifications(
          state.inboxNotifications,
          inboxNotifications
        ),
        threadsQueries:
          queryKey !== undefined
            ? {
                ...state.threadsQueries,
                [queryKey]: {
                  isLoading: false,
                },
              }
            : state.threadsQueries,
      }));
    },

    pushOptimisticUpdate(optimisticUpdate: OptimisticUpdate<TThreadMetadata>) {
      store.set((state) => ({
        ...state,
        optimisticUpdates: [...state.optimisticUpdates, optimisticUpdate],
      }));
    },

    setThreadsQueryState(queryKey: string, queryState: ThreadsQueryState) {
      store.set((state) => ({
        ...state,
        threadsQueries: {
          ...state.threadsQueries,
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

export function upsertComment<TThreadMetadata extends BaseMetadata>(
  threads: Record<string, ThreadData<TThreadMetadata>>,
  newComment: CommentData
): Record<string, ThreadData<TThreadMetadata>> {
  const thread = threads[newComment.threadId];

  if (thread === undefined) {
    return threads;
  }

  const newComments: CommentData[] = [];
  let updated = false;

  for (const comment of thread.comments) {
    if (comment.id === newComment.id) {
      updated = true;
      newComments.push(newComment);
    } else {
      newComments.push(comment);
    }
  }

  if (!updated) {
    newComments.push(newComment);
  }

  return {
    ...threads,
    [thread.id]: {
      ...thread,
      comments: newComments,
    },
  };
}

export function applyOptimisticUpdates<TThreadMetadata extends BaseMetadata>(
  state: State<TThreadMetadata>
): Record<string, ThreadData<TThreadMetadata>> {
  const result = {
    ...state.threads,
  };

  for (const optimisticUpdate of state.optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "create-thread": {
        result[optimisticUpdate.thread.id] = optimisticUpdate.thread;
        break;
      }
      case "edit-thread-metadata": {
        const thread = result[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }
        result[thread.id] = {
          ...thread,
          metadata: {
            ...thread.metadata,
            ...optimisticUpdate.metadata,
          },
        };
        break;
      }
      case "create-comment": {
        const thread = result[optimisticUpdate.comment.threadId];
        if (thread === undefined) {
          break;
        }
        result[thread.id] = {
          ...thread,
          comments: [...thread.comments, optimisticUpdate.comment], // TODO: Handle replace comment
        };
        break;
      }
      case "edit-comment": {
        const thread = result[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result[thread.id] = {
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
        const thread = result[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result[thread.id] = {
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
          !result[thread.id].comments.some(
            (comment) => comment.deletedAt === undefined
          )
        ) {
          delete result[thread.id];
        }

        break;
      }
      case "add-reaction": {
        const thread = result[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result[thread.id] = {
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
        const thread = result[optimisticUpdate.threadId];
        if (thread === undefined) {
          break;
        }

        result[thread.id] = {
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
      }
    }
  }

  return result;
}

export function selectedThreads<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  state: State<TThreadMetadata>,
  options: UseThreadsOptions<TThreadMetadata>
) {
  const result = applyOptimisticUpdates(state);

  return Object.values(result).filter((thread) => {
    if (thread.roomId !== roomId) return false;

    const query = options.query;
    if (!query) return true;

    for (const key in query.metadata) {
      if (thread.metadata[key] !== query.metadata[key]) {
        return false;
      }
    }
    return true;
  });
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
