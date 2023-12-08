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
  Resolve,
  Room,
  ThreadData,
} from "@liveblocks/core";
import { CommentsApiError, console } from "@liveblocks/core";
import { nanoid } from "nanoid";
import { useCallback, useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import {
  AddReactionError,
  type CommentsError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadMetadataError,
  RemoveReactionError,
} from "./errors";
import {
  createCacheManager,
  useAutomaticRevalidation,
  useMutate,
  useRevalidateCache,
} from "./lib/revalidation";
import useIsDocumentVisible from "./lib/use-is-document-visible";
import useIsOnline from "./lib/use-is-online";

const POLLING_INTERVAL_REALTIME = 30000;
const POLLING_INTERVAL = 5000;

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

export type CommentsRoom<TThreadMetadata extends BaseMetadata> = {
  useThreads(
    options?: useThreadsOptions<TThreadMetadata>
  ): ThreadsState<TThreadMetadata>;
  useThreadsSuspense(
    options?: useThreadsOptions<TThreadMetadata>
  ): ThreadsStateSuccess<TThreadMetadata>;
  useCreateThread(): (
    options: CreateThreadOptions<TThreadMetadata>
  ) => ThreadData<TThreadMetadata>;
  useEditThreadMetadata(): (
    options: EditThreadMetadataOptions<TThreadMetadata>
  ) => void;
  useCreateComment(): (options: CreateCommentOptions) => CommentData;
  useEditComment(): (options: EditCommentOptions) => void;
  useDeleteComment(): (options: DeleteCommentOptions) => void;
  useAddReaction(): (options: CommentReactionOptions) => void;
  useRemoveReaction(): (options: CommentReactionOptions) => void;
};

export type useThreadsOptions<TMetadata extends BaseMetadata> = {
  query: { metadata: Partial<TMetadata> };
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
  : { threadId: string; metadata: Resolve<PartialNullable<TMetadata>> };

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

export type ThreadsStateResolved<TThreadMetadata extends BaseMetadata> = {
  isLoading: false;
  threads: ThreadData<TThreadMetadata>[];
  error?: Error;
};

export type ThreadsStateSuccess<TThreadMetadata extends BaseMetadata> = {
  isLoading: false;
  threads: ThreadData<TThreadMetadata>[];
  error?: never;
};

export type ThreadsState<TThreadMetadata extends BaseMetadata> =
  | ThreadsStateLoading
  | ThreadsStateResolved<TThreadMetadata>;

function createOptimisticId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}

/**
 * Returns the polling interval based on the room connection status, the browser online status and the document visibility.
 * @param isBrowserOnline Whether the browser is online.
 * @param isDocumentVisible Whether the document is visible.
 * @param isRoomConnected Whether the room is connected.
 * @returns The polling interval in milliseconds or undefined if we don't poll the server.
 */
function getPollingInterval(
  isBrowserOnline: boolean,
  isDocumentVisible: boolean,
  isRoomConnected: boolean
): number | undefined {
  // If the browser is offline or the document is not visible, we don't poll the server.
  if (!isBrowserOnline || !isDocumentVisible) return;

  // If the room is connected, we poll the server in real-time.
  if (isRoomConnected) return POLLING_INTERVAL_REALTIME;

  // (Otherwise) If the room is not connected, we poll the server at POLLING_INTERVAL rate.
  return POLLING_INTERVAL;
}

export function createCommentsRoom<TThreadMetadata extends BaseMetadata>(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  errorEventSource: EventSource<CommentsError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const manager = createCacheManager<ThreadData<TThreadMetadata>[]>();

  function _useThreads(
    revalidateCache: (shouldDedupe: boolean) => Promise<void>
  ): ThreadsState<TThreadMetadata> {
    const status = useSyncExternalStore(
      room.events.status.subscribe,
      room.getStatus,
      room.getStatus
    );

    const isOnline = useIsOnline();
    const isDocumentVisible = useIsDocumentVisible();

    const interval = getPollingInterval(
      isOnline,
      isDocumentVisible,
      status === "connected"
    );

    // Automatically revalidate the cache when the window gains focus or when the connection is restored. Also poll the server based on the connection status.
    useAutomaticRevalidation(manager, revalidateCache, {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: interval,
    });

    /**
     * Subscribe to comment events in the room to trigger a revalidation when a comment is added, edited or deleted.
     */
    useEffect(() => {
      const unsubscribe = room.events.comments.subscribe(() => {
        void revalidateCache(true);
      });
      return () => {
        unsubscribe();
      };
    }, [revalidateCache]);

    const cache = useSyncExternalStore(
      manager.subscribe,
      () => manager.cache,
      () => manager.cache
    );

    if (!cache || cache.isLoading) {
      return { isLoading: true };
    }

    return {
      isLoading: cache.isLoading,
      threads: cache.data ?? [],
      error: cache.error,
    };
  }

  function useThreads(): ThreadsState<TThreadMetadata> {
    const revalidate = useRevalidateCache(manager, room.getThreads);

    useEffect(() => {
      void revalidate(true);
    }, [revalidate]);

    return _useThreads(revalidate);
  }

  function useThreadsSuspense(): ThreadsStateSuccess<TThreadMetadata> {
    const revalidate = useRevalidateCache(manager, room.getThreads);

    const cache = _useThreads(revalidate);

    if (cache.error) {
      throw cache.error;
    }

    if (cache.isLoading || !cache.threads) {
      throw revalidate(true);
    }

    return {
      threads: cache.threads,
      isLoading: false,
    };
  }

  function useEditThreadMetadata() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const editThreadMetadata = useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>): void => {
        const threadId = options.threadId;
        const metadata: PartialNullable<TThreadMetadata> =
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new EditThreadMetadataError(error, {
              roomId: room.id,
              threadId,
              metadata,
            })
          );
        });
      },
      [mutate]
    );

    return editThreadMetadata;
  }

  function useCreateThread() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createThread = useCallback(
      (
        options: CreateThreadOptions<TThreadMetadata>
      ): ThreadData<TThreadMetadata> => {
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new CreateThreadError(error, {
              roomId: room.id,
              threadId,
              commentId,
              body,
              metadata,
            })
          );
        });

        return newThread;
      },
      [mutate]
    );

    return createThread;
  }

  function useCreateComment() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, body }: CreateCommentOptions): CommentData => {
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new CreateCommentError(error, {
              roomId: room.id,
              threadId,
              commentId,
              body,
            })
          );
        });

        return comment;
      },
      [mutate]
    );

    return createComment;
  }

  function useEditComment() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const editComment = useCallback(
      ({ threadId, commentId, body }: EditCommentOptions): void => {
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new EditCommentError(error, {
              roomId: room.id,
              threadId,
              commentId,
              body,
            })
          );
        });
      },
      [mutate]
    );

    return editComment;
  }

  function useDeleteComment() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const deleteComment = useCallback(
      ({ threadId, commentId }: DeleteCommentOptions): void => {
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
              newThread.comments.some(
                (comment) => comment.deletedAt === undefined
              )
            ) {
              newThreads.push(newThread);
            }
          } else {
            newThreads.push(thread);
          }
        }

        mutate(room.deleteComment({ threadId, commentId }), {
          optimisticData: newThreads,
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new DeleteCommentError(error, {
              roomId: room.id,
              threadId,
              commentId,
            })
          );
        });
      },
      [mutate]
    );

    return deleteComment;
  }

  function useAddReaction() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
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
                    comment.reactions.some(
                      (reaction) => reaction.emoji === emoji
                    )
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new AddReactionError(error, {
              roomId: room.id,
              threadId,
              commentId,
              emoji,
            })
          );
        });
      },
      [mutate]
    );

    return createComment;
  }

  function useRemoveReaction() {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
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
                    reactionIndex >= 0 &&
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
        }).catch((err: unknown) => {
          if (!(err instanceof CommentsApiError)) {
            throw err;
          }

          const error = handleCommentsApiError(err);
          errorEventSource.notify(
            new RemoveReactionError(error, {
              roomId: room.id,
              threadId,
              commentId,
              emoji,
            })
          );
        });
      },
      [mutate]
    );

    return createComment;
  }

  function getThreads(): ThreadData<TThreadMetadata>[] {
    const threads = manager.cache;
    if (
      !threads ||
      threads.isLoading ||
      threads.error ||
      threads.data === undefined
    ) {
      throw new Error(
        "Cannot update threads or comments before they are loaded."
      );
    }
    return threads.data;
  }

  function getCurrentUserId() {
    const self = room.getSelf();
    if (self === null || self.id === undefined) {
      return "anonymous";
    } else {
      return self.id;
    }
  }

  function handleCommentsApiError(err: CommentsApiError): Error {
    const message = `Request failed with status ${err.status}: ${err.message}`;

    // Log details about FORBIDDEN errors
    if (err.details?.error === "FORBIDDEN") {
      const detailedMessage = [
        message,
        err.details.suggestion,
        err.details.docs,
      ]
        .filter(Boolean)
        .join("\n");

      console.error(detailedMessage);
    }

    return new Error(message);
  }

  return {
    useThreads,
    useThreadsSuspense,
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
  };
}
