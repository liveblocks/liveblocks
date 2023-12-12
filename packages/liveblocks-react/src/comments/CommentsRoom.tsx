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
  ThreadsFilterOptions,
} from "@liveblocks/core";
import { CommentsApiError, makeEventSource, stringify } from "@liveblocks/core";
import { nanoid } from "nanoid";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
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
import type { CacheState, MutationInfo, RequestInfo } from "./lib/revalidation";
import {
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
  CommentsRoomProvider({
    room,
    children,
  }: PropsWithChildren<{
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  }>): JSX.Element;
  useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: ThreadsFilterOptions<TThreadMetadata>
  ): ThreadsState<TThreadMetadata>;
  useThreadsSuspense(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: ThreadsFilterOptions<TThreadMetadata>
  ): ThreadsStateSuccess<TThreadMetadata>;
  useCreateThread(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (
    options: CreateThreadOptions<TThreadMetadata>
  ) => ThreadData<TThreadMetadata>;
  useEditThreadMetadata(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: EditThreadMetadataOptions<TThreadMetadata>) => void;
  useCreateComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: CreateCommentOptions) => CommentData;
  useEditComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: EditCommentOptions) => void;
  useDeleteComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: DeleteCommentOptions) => void;
  useAddReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: CommentReactionOptions) => void;
  useRemoveReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: CommentReactionOptions) => void;
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

export function createCommentsRoom<TThreadMetadata extends BaseMetadata>(
  errorEventSource: EventSource<CommentsError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const manager = createThreadsCacheManager<TThreadMetadata>();

  const FetcherContext = createContext<
    (() => Promise<ThreadData<TThreadMetadata>[]>) | null
  >(null);

  function getThreads(): ThreadData<TThreadMetadata>[] {
    const threads = manager.getCache();
    if (!threads) {
      throw new Error(
        "Cannot update threads or comments before they are loaded."
      );
    }
    return threads;
  }

  function CommentsRoomProvider({
    room,
    children,
  }: PropsWithChildren<{
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  }>) {
    const fetcher = useCallback(async () => {
      const responses = await Promise.all(
        Array.from(manager.getQueriesInfo().values()).map((info) => {
          return room.getThreads(info.options);
        })
      );

      const threads = Array.from(
        new Map(responses.flat().map((thread) => [thread.id, thread])).values()
      );

      return threads;
    }, [room]);

    return (
      <FetcherContext.Provider value={fetcher}>
        {children}
      </FetcherContext.Provider>
    );
  }

  /**
   * @internal
   */
  function useThreadsFetcher(): () => Promise<ThreadData<TThreadMetadata>[]> {
    const fetcher = useContext(FetcherContext);
    if (fetcher === null) {
      throw new Error("CommentsRoomProvider is missing from the React tree.");
    }
    return fetcher;
  }

  function _useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    key: string,
    revalidateCache: ({
      shouldDedupe,
    }: {
      shouldDedupe: boolean;
    }) => Promise<void>
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
        void revalidateCache({ shouldDedupe: false });
      });
      return () => {
        unsubscribe();
      };
    }, [revalidateCache, room]);

    const cache = useSyncExternalStore(
      manager.subscribe,
      () => manager.getQueriesInfo().get(key)?.cache,
      () => manager.getQueriesInfo().get(key)?.cache
    );

    if (!cache || cache.isLoading) {
      return { isLoading: true };
    }

    return {
      isLoading: cache.isLoading,
      threads: cache.data || [],
      error: cache.error,
    };
  }

  function useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: ThreadsFilterOptions<TThreadMetadata>
  ): ThreadsState<TThreadMetadata> {
    const fetcher = useThreadsFetcher();

    const key = useMemo(() => stringify(options), [options]);

    useEffect(() => {
      const info = manager.getQueriesInfo().get(key);
      if (info) {
        info.count += 1;
      } else {
        // If there is no info for this query, we create one and set the cache state to loading and the count to 1
        manager.getQueriesInfo().set(key, {
          options: options!,
          cache: { isLoading: true },
          count: 1,
        });
      }

      return () => {
        const info = manager.getQueriesInfo().get(key);
        if (!info) return;

        info.count -= 1;
        // If there are no more components using this query, we delete the query info
        if (info.count > 0) return;
        manager.getQueriesInfo().delete(key);
      };
    }, [key, options]);

    const revalidateCache = useRevalidateCache(manager, fetcher);

    useEffect(
      () => {
        void revalidateCache({ shouldDedupe: false });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- We want to revalidate the cache when the options change
      [revalidateCache]
    );

    return _useThreads(room, key, revalidateCache);
  }

  function useThreadsSuspense(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: ThreadsFilterOptions<TThreadMetadata>
  ): ThreadsStateSuccess<TThreadMetadata> {
    const fetcher = useThreadsFetcher();

    const key = useMemo(() => stringify(options), [options]);

    const info = manager.getQueriesInfo().get(key);
    if (!info) {
      // If there is no info for this query, we create one and set the cache state to loading and the count to 1
      manager.getQueriesInfo().set(key, {
        options: options!,
        cache: { isLoading: true },
        count: 1,
      });
    }

    const revalidateCache = useRevalidateCache(manager, fetcher);

    const cache = _useThreads(room, key, revalidateCache);

    if (cache.error) {
      throw cache.error;
    }

    if (cache.isLoading || !cache.threads) {
      throw revalidateCache({ shouldDedupe: false });
    }

    return {
      threads: cache.threads,
      isLoading: false,
    };
  }

  function useEditThreadMetadata(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
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
      [room, mutate]
    );

    return editThreadMetadata;
  }

  function useCreateThread(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
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
        const userId = getCurrentUserId(room);

        const newComment: CommentData = {
          id: commentId,
          threadId,
          roomId: room.id,
          createdAt: now,
          type: "comment",
          userId,
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
      [room, mutate]
    );

    return createThread;
  }

  function useCreateComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: CreateCommentOptions) => CommentData {
    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, body }: CreateCommentOptions): CommentData => {
        const threads = getThreads();

        const commentId = createOptimisticId(COMMENT_ID_PREFIX);
        const now = new Date().toISOString();
        const userId = getCurrentUserId(room);

        const comment: CommentData = {
          id: commentId,
          threadId,
          roomId: room.id,
          type: "comment",
          createdAt: now,
          userId,
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
      [room, mutate]
    );

    return createComment;
  }

  function useEditComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
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
      [room, mutate]
    );

    return editComment;
  }

  function useDeleteComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
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
      [room, mutate]
    );

    return deleteComment;
  }

  function useAddReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = getThreads();
        const now = new Date().toISOString();
        const userId = getCurrentUserId(room);

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
      [room, mutate]
    );

    return createComment;
  }

  function useRemoveReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const revalidate = useRevalidateCache(manager, room.getThreads);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = getThreads();
        const userId = getCurrentUserId(room);

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
      [room, mutate]
    );

    return createComment;
  }

  return {
    CommentsRoomProvider,
    useThreads,
    useThreadsSuspense,
    useEditThreadMetadata,
    useCreateThread,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
  };
}

function createOptimisticId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}

function getCurrentUserId(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): string {
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
    const detailedMessage = [message, err.details.suggestion, err.details.docs]
      .filter(Boolean)
      .join("\n");

    console.error(detailedMessage);
  }

  return new Error(message);
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

export function createThreadsCacheManager<
  TThreadMetadata extends BaseMetadata,
>() {
  let cache: ThreadData<TThreadMetadata>[] | undefined;
  let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined;
  let error: Error | undefined;
  let mutation: MutationInfo | undefined;

  const queriesInfo: Map<
    string,
    {
      options: ThreadsFilterOptions<TThreadMetadata>;
      cache: CacheState<ThreadData<TThreadMetadata>[]>;
      count: number;
    }
  > = new Map();

  const eventSource = makeEventSource<
    ThreadData<TThreadMetadata>[] | undefined
  >();

  return {
    // Cache
    getCache() {
      return cache;
    },
    setCache(value: ThreadData<TThreadMetadata>[]) {
      cache = value;

      console.log("SETTING CACHE", queriesInfo);
      // Iterate over each query and update the cache state associated with it.
      for (const info of queriesInfo.values()) {
        // Filter the cache to only include threads that match the current query
        const filtered = cache.filter((thread) => {
          for (const key in info.options.query.metadata) {
            if (thread.metadata[key] !== info.options.query.metadata[key]) {
              return false;
            }
          }
          return true;
        });
        console.log(info.options.query.metadata, filtered);
        // Update the cache state associated with this query
        info.cache = { isLoading: false, data: filtered };
      }

      eventSource.notify(value);
    },

    // Request
    getRequest() {
      return request;
    },
    setRequest(value: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined) {
      request = value;
    },

    // Error
    getError() {
      return error;
    },
    setError(err: Error) {
      error = err;
    },

    // Mutation
    getMutation() {
      return mutation;
    },
    setMutation(info: MutationInfo) {
      mutation = info;
    },

    // Queries Info
    getQueriesInfo() {
      return queriesInfo;
    },

    // Subscription
    subscribe(
      callback: (state: ThreadData<TThreadMetadata>[] | undefined) => void
    ) {
      return eventSource.subscribe(callback);
    },
  };
}

// function isSubset(subset: BaseMetadata, superset: BaseMetadata): boolean {
//   for (const key in subset) {
//   }
// }
