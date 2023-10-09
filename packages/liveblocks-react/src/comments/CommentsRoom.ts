import type {
  BaseMetadata,
  BaseUserMeta,
  CommentBody,
  CommentData,
  CommentReaction,
  EventSource,
  Json,
  JsonObject,
  LsonObject,
  Room,
  ThreadData,
} from "@liveblocks/core";
import { makeEventSource } from "@liveblocks/core";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import {
  AddReactionError,
  type CommentsApiError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadMetadataError,
  RemoveReactionError,
} from "./errors";

const POLLING_INTERVAL_REALTIME = 30000;
const POLLING_INTERVAL = 5000;

const MAX_ERROR_RETRY_COUNT = 5;
const ERROR_RETRY_INTERVAL = 5000;

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";
const DEDUPING_INTERVAL = 1000;

export type CommentsRoom<TThreadMetadata extends BaseMetadata> = {
  useThreads(): ThreadsState<TThreadMetadata>;
  useThreadsSuspense(): ThreadsStateSuccess<TThreadMetadata>;
  createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata>;
  editThreadMetadata(options: EditThreadMetadataOptions<TThreadMetadata>): void;
  createComment(options: CreateCommentOptions): CommentData;
  addReaction(options: CommentReactionOptions): void;
  removeReaction(options: CommentReactionOptions): void;
  editComment(options: EditCommentOptions): void;
  deleteComment(options: DeleteCommentOptions): void;
};

export type CreateThreadOptions<TMetadata extends BaseMetadata> = [
  TMetadata,
] extends [never]
  ? {
      body: CommentBody;
    }
  : { body: CommentBody; metadata: TMetadata };

export type EditThreadMetadataOptions<TMetadata extends BaseMetadata> = [
  TMetadata,
] extends [never]
  ? {
      threadId: string;
    }
  : { threadId: string; metadata: Partial<TMetadata> };

export type CreateCommentOptions = {
  threadId: string;
  body: CommentBody;
};

export type EditCommentOptions = {
  threadId: string;
  commentId: string;
  body: CommentBody;
};

export type DeleteCommentOptions = {
  threadId: string;
  commentId: string;
};

export type CommentReactionOptions = {
  threadId: string;
  commentId: string;
  emoji: string;
};

export type ThreadsStateLoading = {
  isLoading: true;
  threads?: never;
  error?: never;
};

export type ThreadsStateError = {
  isLoading: false;
  threads?: never;
  error: Error;
};

export type ThreadsStateSuccess<TThreadMetadata extends BaseMetadata> = {
  isLoading: false;
  threads: ThreadData<TThreadMetadata>[];
  error?: never;
};

export type ThreadsState<TThreadMetadata extends BaseMetadata> =
  | ThreadsStateLoading
  | ThreadsStateError
  | ThreadsStateSuccess<TThreadMetadata>;

type ThreadsRequestInfo<TThreadMetadata extends BaseMetadata> = {
  fetcher: Promise<ThreadData<TThreadMetadata>[]>;
  timestamp: number;
};

type MutationInfo = {
  startTime: number;
  endTime: number;
};

function createOptimisticId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}

function createThreadsManager<TThreadMetadata extends BaseMetadata>() {
  let cache: ThreadsState<TThreadMetadata> | undefined; // Stores the current cache state (threads)
  let request: ThreadsRequestInfo<TThreadMetadata> | undefined; // Stores the currently active revalidation request
  let mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation

  const eventSource = makeEventSource<
    ThreadsState<TThreadMetadata> | undefined
  >();

  return {
    get cache() {
      return cache;
    },

    set cache(value: ThreadsState<TThreadMetadata> | undefined) {
      cache = value;
      eventSource.notify(cache);
    },

    get request() {
      return request;
    },

    set request(value: ThreadsRequestInfo<TThreadMetadata> | undefined) {
      request = value;
    },

    get mutation() {
      return mutation;
    },

    set mutation(value: MutationInfo | undefined) {
      mutation = value;
    },

    subscribe(
      callback: (state: ThreadsState<TThreadMetadata> | undefined) => void
    ) {
      return eventSource.subscribe(callback);
    },
  };
}

/**
 * This implementation is inspired by the `swr` library.
 * Additional modifications were made to adapt it to our specific needs.
 *
 * Original `swr` library can be found at [SWR GitHub repository](https://github.com/vercel/swr)
 */
export function createCommentsRoom<TThreadMetadata extends BaseMetadata>(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  errorEventSource: EventSource<CommentsApiError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const manager = createThreadsManager<TThreadMetadata>();

  let timestamp = 0;

  let commentsEventRefCount = 0; // Reference count for the number of components with a subscription (via the `subscribe` function)
  let commentsEventDisposer: (() => void) | undefined; // Disposer function for the `comments` event listener

  async function mutate(
    data: Promise<any>,
    options: {
      optimisticData: ThreadData<TThreadMetadata>[];
    }
  ) {
    const beforeMutationTimestamp = ++timestamp;
    manager.mutation = {
      startTime: beforeMutationTimestamp,
      endTime: 0,
    };

    const currentCache = manager.cache;

    // Update the cache with the optimistic data
    manager.cache = {
      isLoading: false,
      threads: options.optimisticData,
    };

    try {
      await data;

      // If there was a newer mutation while this mutation was in flight, we return early and don't trigger a revalidation (since the mutation request is outdated)
      const activeMutation = manager.mutation;
      if (
        activeMutation &&
        beforeMutationTimestamp !== activeMutation.startTime
      ) {
        return;
      }
    } catch (err) {
      // If the mutation request fails, revert the optimistic update and throw the error
      manager.cache = currentCache;
      throw err;
    }

    // Mark the mutation as completed by setting the end time to the current timestamp
    manager.mutation = {
      startTime: beforeMutationTimestamp,
      endTime: ++timestamp,
    };

    // Deleting the concurrent request markers so new requests will not be deduped.
    manager.request = undefined;
    void revalidateCache(false);
  }

  /**
   * Revalidates the cache (threads) and optionally dedupes the request.
   * @param shouldDedupe - If true, the request will be deduped
   * @param retryCount - The number of times the request has been retried (used for exponential backoff)
   */
  async function revalidateCache(shouldDedupe: boolean, retryCount = 0) {
    let startAt: number;

    // A new request should be started if there is no ongoing request OR if `shouldDedupe` is false
    const shouldStartRequest = !manager.request || !shouldDedupe;

    function deleteActiveRequest() {
      const activeRequest = manager.request;
      if (!activeRequest) return;
      if (activeRequest.timestamp !== startAt) return;

      manager.request = undefined;
    }

    // Uses the exponential backoff algorithm to retry the request on error.
    function handleError() {
      const timeout =
        ~~((Math.random() + 0.5) * (1 << (retryCount < 8 ? retryCount : 8))) *
        ERROR_RETRY_INTERVAL;

      if (retryCount > MAX_ERROR_RETRY_COUNT) return;

      setTimeout(() => {
        void revalidateCache(true, retryCount + 1);
      }, timeout);
    }

    try {
      if (shouldStartRequest) {
        const currentCache = manager.cache;
        if (!currentCache) manager.cache = { isLoading: true };

        manager.request = {
          fetcher: room.getThreads(),
          timestamp: ++timestamp,
        };
      }

      const activeRequest = manager.request;
      if (!activeRequest) return;

      const newData = await activeRequest.fetcher;
      startAt = activeRequest.timestamp;

      if (shouldStartRequest) {
        setTimeout(deleteActiveRequest, DEDUPING_INTERVAL);
      }

      // If there was a newer revalidation request (or if the current request was removed due to a mutation), while this request was in flight, we return early and don't update the cache (since the revalidation request is outdated)
      if (!manager.request || manager.request.timestamp !== startAt) return;

      // If there is an active mutation, we ignore the revalidation result as it is outdated (and because the mutation will trigger a revalidation)
      const activeMutation = manager.mutation;
      if (
        activeMutation &&
        (activeMutation.startTime > startAt ||
          activeMutation.endTime > startAt ||
          activeMutation.endTime === 0)
      ) {
        return;
      }

      manager.cache = {
        isLoading: false,
        threads: newData,
      };
    } catch (err) {
      if (shouldStartRequest) handleError();

      deleteActiveRequest();

      manager.cache = {
        isLoading: false,
        error: err as Error,
      };
    }
  }

  function editThreadMetadata(
    options: EditThreadMetadataOptions<TThreadMetadata>
  ) {
    const threadId = options.threadId;
    const metadata: Partial<TThreadMetadata> =
      "metadata" in options ? options.metadata : {};
    const threads = getThreads();

    const optimisticData = threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            metadata: {
              ...thread.metadata,
              ...metadata,
            },
          }
        : thread
    );

    mutate(room.editThreadMetadata({ metadata, threadId }), {
      optimisticData,
    }).catch((err: Error) => {
      errorEventSource.notify(
        new EditThreadMetadataError(err, {
          roomId: room.id,
          threadId,
          metadata,
        })
      );
    });
  }

  function createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata> {
    const body = options.body;
    const metadata: TThreadMetadata =
      "metadata" in options ? options.metadata : ({} as TThreadMetadata);
    const threads = getThreads();

    const threadId = createOptimisticId(THREAD_ID_PREFIX);
    const commentId = createOptimisticId(COMMENT_ID_PREFIX);
    const now = new Date().toISOString();

    const newComment: CommentData = {
      id: commentId,
      threadId,
      roomId: room.id,
      createdAt: now,
      type: "comment",
      userId: getCurrentUserId(),
      body,
      reactions: [],
    };
    const newThread = {
      id: threadId,
      type: "thread",
      createdAt: now,
      roomId: room.id,
      metadata,
      comments: [newComment],
    } as ThreadData<TThreadMetadata>;

    mutate(room.createThread({ threadId, commentId, body, metadata }), {
      optimisticData: [...threads, newThread],
    }).catch((er: Error) =>
      errorEventSource.notify(
        new CreateThreadError(er, {
          roomId: room.id,
          threadId,
          commentId,
          body,
          metadata,
        })
      )
    );

    return newThread;
  }

  function createComment({
    threadId,
    body,
  }: CreateCommentOptions): CommentData {
    const threads = getThreads();

    const commentId = createOptimisticId(COMMENT_ID_PREFIX);
    const now = new Date().toISOString();

    const comment: CommentData = {
      id: commentId,
      threadId,
      roomId: room.id,
      type: "comment",
      createdAt: now,
      userId: getCurrentUserId(),
      body,
      reactions: [],
    };

    const optimisticData = threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            comments: [...thread.comments, comment],
          }
        : thread
    );

    mutate(room.createComment({ threadId, commentId, body }), {
      optimisticData,
    }).catch((er: Error) =>
      errorEventSource.notify(
        new CreateCommentError(er, {
          roomId: room.id,
          threadId,
          commentId,
          body,
        })
      )
    );

    return comment;
  }

  function editComment({ threadId, commentId, body }: EditCommentOptions) {
    const threads = getThreads();
    const now = new Date().toISOString();

    const optimisticData = threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            comments: thread.comments.map((comment) =>
              comment.id === commentId
                ? ({
                    ...comment,
                    editedAt: now,
                    body,
                  } as CommentData)
                : comment
            ),
          }
        : thread
    );

    mutate(room.editComment({ threadId, commentId, body }), {
      optimisticData,
    }).catch((er: Error) =>
      errorEventSource.notify(
        new EditCommentError(er, {
          roomId: room.id,
          threadId,
          commentId,
          body,
        })
      )
    );
  }

  function deleteComment({ threadId, commentId }: DeleteCommentOptions): void {
    const threads = getThreads();
    const now = new Date().toISOString();

    const newThreads: ThreadData<TThreadMetadata>[] = [];

    for (const thread of threads) {
      if (thread.id === threadId) {
        const newThread: ThreadData<TThreadMetadata> = {
          ...thread,
          comments: thread.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  deletedAt: now,
                  body: undefined,
                }
              : comment
          ),
        };

        if (
          newThread.comments.some((comment) => comment.deletedAt === undefined)
        ) {
          newThreads.push(newThread);
        }
      } else {
        newThreads.push(thread);
      }
    }

    mutate(room.deleteComment({ threadId, commentId }), {
      optimisticData: newThreads,
    }).catch((er: Error) =>
      errorEventSource.notify(
        new DeleteCommentError(er, {
          roomId: room.id,
          threadId,
          commentId,
        })
      )
    );
  }

  function getCurrentUserId() {
    const self = room.getSelf();
    if (self === null || self.id === undefined) {
      return "anonymous";
    } else {
      return self.id;
    }
  }

  function getThreads(): ThreadData<TThreadMetadata>[] {
    const threads = manager.cache;
    if (!threads || threads.isLoading || threads.error) {
      throw new Error(
        "Cannot update threads or comments before they are loaded."
      );
    }
    return threads.threads;
  }

  /**
   * Subscribes to the `comments` event and returns a function that can be used to unsubscribe.
   * Ensures that there is only one subscription to the `comments` event despite multiple calls to the `subscribe` function (via the `useThreads` hook).
   * This is so that revalidation is only triggered once when the `comments` event is fired.
   *
   * @returns An unsubscribe function that can be used to unsubscribe from the `comments` event.
   */
  function _subscribe(): () => void {
    // Only subscribe to the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
    if (commentsEventRefCount === 0) {
      commentsEventDisposer = room.events.comments.subscribe(() => {
        void revalidateCache(true);
      });
    }

    commentsEventRefCount = commentsEventRefCount + 1;

    return () => {
      // Only unsubscribe from the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
      commentsEventRefCount = commentsEventRefCount - 1;
      if (commentsEventRefCount > 0) return;

      commentsEventDisposer?.();
      commentsEventDisposer = undefined;
    };
  }

  function usePolling() {
    const status = useSyncExternalStore(
      room.events.status.subscribe,
      room.getStatus,
      room.getStatus
    );

    useEffect(
      () => {
        const interval =
          status === "connected" ? POLLING_INTERVAL_REALTIME : POLLING_INTERVAL;

        let revalidationTimerId: number;
        function scheduleRevalidation() {
          revalidationTimerId = window.setTimeout(
            executeRevalidation,
            interval
          );
        }

        function executeRevalidation() {
          // Revalidate cache and then schedule the next revalidation
          void revalidateCache(true).then(scheduleRevalidation);
        }

        scheduleRevalidation();

        return () => {
          window.clearTimeout(revalidationTimerId);
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ESLint recommends against adding `revalidateCache` as a dependency, but not doing so causes the code inside `useEffect` to reference an outdated version of `revalidateCache`
      [status, revalidateCache]
    );
  }

  function useThreadsInternal(): ThreadsState<TThreadMetadata> {
    useEffect(_subscribe, [_subscribe]);

    usePolling();

    const cache = useSyncExternalStore(
      manager.subscribe,
      () => manager.cache,
      () => manager.cache
    );

    return cache ?? { isLoading: true };
  }

  function useThreads() {
    useEffect(
      () => {
        void revalidateCache(true);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ESLint recommends against adding `revalidateCache` as a dependency, but not doing so causes the code inside `useEffect` to reference an outdated version of `revalidateCache`
      [revalidateCache]
    );

    return useThreadsInternal();
  }

  function useThreadsSuspense(): ThreadsStateSuccess<TThreadMetadata> {
    const cache = useThreadsInternal();

    if (cache.isLoading) {
      throw revalidateCache(true);
    }

    if (cache.error) {
      throw cache.error;
    }

    return {
      threads: cache.threads,
      isLoading: false,
    };
  }

  function addReaction({
    threadId,
    commentId,
    emoji,
  }: CommentReactionOptions): void {
    const threads = getThreads();
    const now = new Date().toISOString();
    const userId = getCurrentUserId();

    const optimisticData = threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            comments: thread.comments.map((comment) => {
              if (comment.id !== commentId) {
                return comment;
              }

              let reactions: CommentReaction[];

              if (
                comment.reactions.some((reaction) => reaction.emoji === emoji)
              ) {
                reactions = comment.reactions.map((reaction) =>
                  reaction.emoji === emoji
                    ? {
                        ...reaction,
                        users: [...reaction.users, { id: userId }],
                      }
                    : reaction
                );
              } else {
                reactions = [
                  ...comment.reactions,
                  {
                    emoji,
                    createdAt: now,
                    users: [{ id: userId }],
                  },
                ];
              }

              return {
                ...comment,
                reactions,
              };
            }),
          }
        : thread
    );

    mutate(room.addReaction({ threadId, commentId, emoji }), {
      optimisticData,
    }).catch((err: Error) => {
      errorEventSource.notify(
        new AddReactionError(err, {
          roomId: room.id,
          threadId,
          commentId,
          emoji,
        })
      );
    });
  }

  function removeReaction({
    threadId,
    commentId,
    emoji,
  }: CommentReactionOptions): void {
    const threads = getThreads();
    const userId = getCurrentUserId();

    const optimisticData = threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            comments: thread.comments.map((comment) => {
              if (comment.id !== commentId) {
                return comment;
              }

              const reactionIndex = comment.reactions.findIndex(
                (reaction) => reaction.emoji === emoji
              );
              let reactions: CommentReaction[] = comment.reactions;

              if (
                reactionIndex > 0 &&
                comment.reactions[reactionIndex].users.some(
                  (user) => user.id === userId
                )
              ) {
                if (comment.reactions[reactionIndex].users.length <= 1) {
                  reactions = [...comment.reactions];
                  reactions.splice(reactionIndex, 1);
                } else {
                  reactions[reactionIndex] = {
                    ...reactions[reactionIndex],
                    users: reactions[reactionIndex].users.filter(
                      (user) => user.id !== userId
                    ),
                  };
                }
              }

              return {
                ...comment,
                reactions,
              };
            }),
          }
        : thread
    );

    mutate(room.removeReaction({ threadId, commentId, emoji }), {
      optimisticData,
    }).catch((err: Error) => {
      errorEventSource.notify(
        new RemoveReactionError(err, {
          roomId: room.id,
          threadId,
          commentId,
          emoji,
        })
      );
    });
  }

  return {
    useThreads,
    useThreadsSuspense,
    editThreadMetadata,
    addReaction,
    removeReaction,
    createThread,
    createComment,
    editComment,
    deleteComment,
  };
}
