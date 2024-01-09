import type {
  BaseMetadata,
  BaseUserMeta,
  CommentBody,
  CommentData,
  CommentReaction,
  EventSource,
  GetThreadsOptions,
  Json,
  JsonObject,
  LsonObject,
  Resolve,
  Room,
  ThreadData,
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
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

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
import type {
  CacheManager,
  MutationInfo,
  RequestInfo,
} from "./lib/revalidation";
import { useMutate, useRevalidateCache } from "./lib/revalidation";
import useIsDocumentVisible from "./lib/use-is-document-visible";
import useIsOnline from "./lib/use-is-online";

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";

export const POLLING_INTERVAL_REALTIME = 30000;
export const POLLING_INTERVAL = 5000;

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

export type UseThreadsOptions<TThreadMetadata extends BaseMetadata> =
  GetThreadsOptions<TThreadMetadata>;

export type CommentsRoom<TThreadMetadata extends BaseMetadata> = {
  CommentsRoomProvider({
    room,
    children,
  }: PropsWithChildren<{
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  }>): JSX.Element;
  useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: GetThreadsOptions<TThreadMetadata>
  ): ThreadsState<TThreadMetadata>;
  useThreadsSuspense(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options?: GetThreadsOptions<TThreadMetadata>
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
) {
  const store = createClientCacheStore<TThreadMetadata>();

  const FetcherContext = createContext<
    (() => Promise<ThreadData<TThreadMetadata>[]>) | null
  >(null);

  const RoomManagerContext = createContext<ReturnType<
    typeof createRoomRevalidationManager<TThreadMetadata>
  > | null>(null);

  function getThreads<TThreadMetadata extends BaseMetadata>(
    manager: ReturnType<typeof createRoomRevalidationManager<TThreadMetadata>>
  ): ThreadData<TThreadMetadata>[] {
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
    const manager = useMemo(() => {
      return createRoomRevalidationManager(room.id, {
        getCache: store.getThreads,
        setCache: store.setThreads,
      });
    }, [room.id]);

    const fetcher = React.useCallback(async () => {
      const options = manager
        .getRevalidationManagers()
        .filter(([key]) => manager.getReferenceCount(key) > 0)
        .map(([_, manager]) => manager.getOptions());

      const responses = await Promise.all(
        options.map(async (option) => {
          return await room.getThreads(option);
        })
      );

      const threads = Array.from(
        new Map(responses.flat().map((thread) => [thread.id, thread])).values()
      );

      return threads;
    }, [room, manager]);

    const revalidateCache = useRevalidateCache(manager, fetcher);

    const status = useSyncExternalStore(
      room.events.status.subscribe,
      room.getStatus,
      room.getStatus
    );

    const isOnline = useIsOnline();
    const isDocumentVisible = useIsDocumentVisible();

    const refreshInterval = getPollingInterval(
      isOnline,
      isDocumentVisible,
      status === "connected"
    );

    /**
     * Periodically revalidate the cache. The revalidation is skipped if the browser is offline or if the document is not visible.
     */
    useEffect(() => {
      let revalidationTimerId: number;

      function scheduleRevalidation() {
        if (refreshInterval === 0) return;

        revalidationTimerId = window.setTimeout(() => {
          // Only revalidate if the browser is online AND document is visible AND there are currently no errors AND there is at least one `useThreads` hook that is using the cache, otherwise schedule the next revalidation
          if (
            isOnline &&
            isDocumentVisible &&
            !manager.getError() &&
            manager.getTotalReferenceCount() > 0
          ) {
            // Revalidate cache and then schedule the next revalidation
            void revalidateCache({ shouldDedupe: true }).then(
              scheduleRevalidation
            );
            return;
          }

          scheduleRevalidation();
        }, refreshInterval);
      }

      // Schedule the first revalidation
      scheduleRevalidation();

      return () => {
        window.clearTimeout(revalidationTimerId);
      };
    }, [
      revalidateCache,
      refreshInterval,
      isOnline,
      isDocumentVisible,
      manager,
    ]);

    /**
     * Subscribe to the 'online' event to trigger a revalidation when the browser comes back online.
     * Note: There is a 'navigator.onLine' property that can be used to determine the online status of the browser, but it is not reliable (see https://bugs.chromium.org/p/chromium/issues/detail?id=678075).
     */
    useEffect(() => {
      function handleIsOnline() {
        if (isDocumentVisible) {
          void revalidateCache({ shouldDedupe: true });
        }
      }

      window.addEventListener("online", handleIsOnline);
      return () => {
        window.removeEventListener("online", handleIsOnline);
      };
    }, [revalidateCache, isDocumentVisible]);

    /**
     * Subscribe to visibility change events to trigger a revalidation when the document becomes visible.
     */
    useEffect(() => {
      function handleVisibilityChange() {
        const isVisible = document.visibilityState === "visible";
        if (isVisible && isOnline) {
          void revalidateCache({ shouldDedupe: true });
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }, [revalidateCache, isOnline]);

    useEffect(() => {
      const unsubscribe = room.events.comments.subscribe(() => {
        void revalidateCache({ shouldDedupe: false });
      });
      return () => {
        unsubscribe();
      };
    }, [room, revalidateCache]);

    return (
      <FetcherContext.Provider value={fetcher}>
        <RoomManagerContext.Provider value={manager}>
          {children}
        </RoomManagerContext.Provider>
      </FetcherContext.Provider>
    );
  }

  function useRoomManager() {
    const manager = useContext(RoomManagerContext);
    if (manager === null) {
      throw new Error("CommentsRoomProvider is missing from the React tree.");
    }
    return manager;
  }

  /**
   * Creates a new revalidation manager for the given filter options and room manager. If a revalidation manager already exists for the given filter options, it will be returned instead.
   */
  function getUseThreadsRevalidationManager<
    TThreadMetadata extends BaseMetadata,
  >(
    options: GetThreadsOptions<TThreadMetadata>,
    roomManager: ReturnType<
      typeof createRoomRevalidationManager<TThreadMetadata>
    >
  ) {
    const key = stringify(options);
    const revalidationManager = roomManager.getRevalidationManager(key);

    if (!revalidationManager) {
      const useThreadsRevalidationManager =
        createUseThreadsRevalidationManager<TThreadMetadata>(
          options,
          roomManager
        );
      roomManager.setRevalidationmanager(key, useThreadsRevalidationManager);
      return useThreadsRevalidationManager;
    }

    return revalidationManager;
  }

  /**
   * @internal
   */
  function useThreadsFetcher() {
    const fetcher = useContext(FetcherContext);
    if (fetcher === null) {
      throw new Error("CommentsRoomProvider is missing from the React tree.");
    }
    return fetcher;
  }

  function useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options: UseThreadsOptions<TThreadMetadata> = { query: { metadata: {} } }
  ): ThreadsState<TThreadMetadata> {
    const key = useMemo(() => stringify(options), [options]);
    const manager = useRoomManager();

    const useThreadsRevalidationManager = getUseThreadsRevalidationManager(
      options,
      manager
    );

    const fetcher = React.useCallback(
      () => {
        return room.getThreads(options);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- The missing dependency is `options` but `key` and `normalized` are analogous, so we only include `key` as dependency. This helps minimize the number of re-renders as `options` can change on each render
      [key, room]
    );

    const revalidateCache = useRevalidateCache(
      useThreadsRevalidationManager,
      fetcher
    );

    useEffect(() => {
      void revalidateCache({ shouldDedupe: true });
    }, [revalidateCache]);

    useEffect(() => {
      manager.incrementReferenceCount(key);
      return () => {
        manager.decrementReferenceCount(key);
      };
    }, [manager, key]);

    const cache = _useThreads(room, options);

    return cache;
  }

  function useThreadsSuspense(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options: UseThreadsOptions<TThreadMetadata> = { query: { metadata: {} } }
  ): ThreadsStateSuccess<TThreadMetadata> {
    const key = useMemo(() => stringify(options), [options]);
    const manager = useRoomManager();

    const useThreadsRevalidationManager = getUseThreadsRevalidationManager(
      options,
      manager
    );

    const fetcher = React.useCallback(
      () => {
        return room.getThreads(options);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- The missing dependency is `options` but `key` and `normalized` are analogous, so we only include `key` as dependency. This helps minimize the number of re-renders as `options` can change on each render
      [key, room]
    );

    const revalidateCache = useRevalidateCache(
      useThreadsRevalidationManager,
      fetcher
    );

    useEffect(() => {
      void revalidateCache({ shouldDedupe: true });
    }, [revalidateCache]);

    useEffect(() => {
      manager.incrementReferenceCount(key);
      return () => {
        manager.decrementReferenceCount(key);
      };
    }, [manager, key]);

    const cache = _useThreads(room, options);

    if (cache.error) {
      throw cache.error;
    }

    if (cache.isLoading || !cache.threads) {
      throw revalidateCache({
        shouldDedupe: true,
      });
    }

    return {
      isLoading: false,
      threads: cache.threads,
      error: cache.error,
    };
  }

  function _useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options: UseThreadsOptions<TThreadMetadata>
  ): ThreadsState<TThreadMetadata> {
    const manager = useRoomManager();
    const useThreadsRevalidationManager = getUseThreadsRevalidationManager(
      options,
      manager
    );

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      () => store.getThreads(),
      () => store.getThreads(),
      (state) => {
        const isLoading = useThreadsRevalidationManager.getIsLoading();
        if (isLoading) {
          return {
            isLoading: true,
          };
        }

        const options = useThreadsRevalidationManager.getOptions();
        const error = useThreadsRevalidationManager.getError();

        // Filter the cache to only include threads that match the current query
        const filtered = state.filter((thread) => {
          if (thread.roomId !== room.id) return false;

          const query = options.query ?? {};
          for (const key in query.metadata) {
            if (thread.metadata[key] !== query.metadata[key]) {
              return false;
            }
          }
          return true;
        });

        return {
          isLoading: false,
          threads: filtered,
          error,
        };
      }
    );
  }

  function useEditThreadMetadata(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const editThreadMetadata = useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>): void => {
        const threadId = options.threadId;
        const metadata: PartialNullable<TThreadMetadata> =
          "metadata" in options ? options.metadata : {};
        const threads = getThreads(manager);

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
      [room, mutate, manager]
    );

    return editThreadMetadata;
  }

  function useCreateThread(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

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
        const threads = getThreads(manager);

        const threadId = createThreadId();
        const commentId = createCommentId();
        const now = new Date();

        const newComment: CommentData = {
          id: commentId,
          threadId,
          roomId: room.id,
          createdAt: now,
          type: "comment",
          userId: getCurrentUserId(room),
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
      [room, mutate, manager]
    );

    return createThread;
  }

  function useCreateComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ): (options: CreateCommentOptions) => CommentData {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, body }: CreateCommentOptions): CommentData => {
        const threads = getThreads(manager);

        const commentId = createCommentId();
        const now = new Date();

        const comment: CommentData = {
          id: commentId,
          threadId,
          roomId: room.id,
          type: "comment",
          createdAt: now,
          userId: getCurrentUserId(room),
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
      [room, mutate, manager]
    );

    return createComment;
  }

  function useEditComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const editComment = useCallback(
      ({ threadId, commentId, body }: EditCommentOptions): void => {
        const threads = getThreads(manager);
        const now = new Date();

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
      [room, mutate, manager]
    );

    return editComment;
  }

  function useDeleteComment(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const deleteComment = useCallback(
      ({ threadId, commentId }: DeleteCommentOptions): void => {
        const threads = getThreads(manager);
        const now = new Date();

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
      [room, mutate, manager]
    );

    return deleteComment;
  }

  function useAddReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = getThreads(manager);
        const now = new Date();
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
      [room, mutate, manager]
    );

    return createComment;
  }

  function useRemoveReaction(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    const manager = useRoomManager();

    const fetcher = useThreadsFetcher();
    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createComment = useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = getThreads(manager);
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
      [room, mutate, manager]
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

export function createThreadId() {
  return createOptimisticId(THREAD_ID_PREFIX);
}

export function createCommentId() {
  return createOptimisticId(COMMENT_ID_PREFIX);
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

interface ThreadsCacheManager<TThreadMetadata extends BaseMetadata>
  extends CacheManager<ThreadData<TThreadMetadata>[]> {
  subscribe(
    type: "cache",
    callback: (state: ThreadData<TThreadMetadata>[]) => void
  ): () => void;
  subscribe(type: "error", callback: (error: Error) => void): () => void;
}

interface UseThreadsRevalidationManager<TThreadMetadata extends BaseMetadata>
  extends CacheManager<ThreadData<TThreadMetadata>[]> {
  getOptions(): GetThreadsOptions<TThreadMetadata>;
  getIsLoading(): boolean;
  setIsLoading(value: boolean): void;
}

export function createRoomRevalidationManager<
  TThreadMetadata extends BaseMetadata,
>(
  roomId: string,
  {
    getCache,
    setCache,
  }: {
    getCache: () => ThreadData<TThreadMetadata>[];
    setCache: (value: ThreadData<TThreadMetadata>[]) => void;
  }
) {
  let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
  let error: Error | undefined; // Stores any error that occurred during the last revalidation request
  let mutation: MutationInfo | undefined; // Stores the currently active mutation

  // Each `useThreads` with unique filter options creates its own revalidation manager that is used during the initial revalidation.
  const revalidationManagerByOptions = new Map<
    string,
    UseThreadsRevalidationManager<TThreadMetadata>
  >();

  // Keep track of how many times each revalidation manager is used.
  const referenceCountByOptions = new Map<string, number>();

  return {
    // Cache
    getCache() {
      const threads = getCache();
      // Filter the cache to only include threads that are in the current room
      const filtered = threads.filter((thread) => thread.roomId === roomId);
      return filtered;
    },
    setCache(value: ThreadData<TThreadMetadata>[]) {
      // Delete any revalidation managers that are no longer used by any `useThreads` hooks
      for (const key of revalidationManagerByOptions.keys()) {
        if (referenceCountByOptions.get(key) === 0) {
          revalidationManagerByOptions.delete(key);
          referenceCountByOptions.delete(key);
        }
      }

      // Sort the threads by createdAt date before updating the cache
      const sorted = value.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const threads = getCache();
      const newThreads = threads
        .filter((thread) => thread.roomId !== roomId)
        .concat(sorted);

      setCache(newThreads);
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

    getRevalidationManagers() {
      return Array.from(revalidationManagerByOptions.entries());
    },

    getRevalidationManager(key: string) {
      return revalidationManagerByOptions.get(key);
    },

    setRevalidationmanager(
      key: string,
      manager: UseThreadsRevalidationManager<TThreadMetadata>
    ) {
      revalidationManagerByOptions.set(key, manager);
    },

    getTotalReferenceCount() {
      return Array.from(referenceCountByOptions.values()).reduce(
        (acc, count) => acc + count,
        0
      );
    },

    incrementReferenceCount(key: string) {
      const count = referenceCountByOptions.get(key) ?? 0;
      referenceCountByOptions.set(key, count + 1);
    },

    decrementReferenceCount(key: string) {
      const count = referenceCountByOptions.get(key) ?? 0;
      referenceCountByOptions.set(key, count - 1);
    },

    getReferenceCount(key: string) {
      return referenceCountByOptions.get(key) ?? 0;
    },
  };
}

export function createThreadsCacheManager<
  TThreadMetadata extends BaseMetadata,
>(): ThreadsCacheManager<TThreadMetadata> {
  let cache: ThreadData<TThreadMetadata>[] | undefined; // Stores the current cache state
  let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
  let error: Error | undefined; // Stores any error that occurred during the last revalidation request
  let mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation

  // Create an event source to notify subscribers when the cache is updated
  const cacheEventSource = makeEventSource<ThreadData<TThreadMetadata>[]>();

  // Create an event source to notify subscribers when there is an error
  const errorEventSource = makeEventSource<Error>();

  return {
    // Cache
    getCache() {
      return cache;
    },
    setCache(value: ThreadData<TThreadMetadata>[]) {
      // Because the cache can be set as a result of a fetcher that makes multiple `getThreads` calls in parallel, we aren't sure the final thread results are sorted by date, so we do it here.
      const sorted = value.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      cache = sorted;
      // Notify subscribers that the cache has been updated
      cacheEventSource.notify(cache);
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
      // Notify subscribers that there was an error
      errorEventSource.notify(err);
    },

    // Mutation
    getMutation() {
      return mutation;
    },
    setMutation(info: MutationInfo) {
      mutation = info;
    },

    // Subscription
    subscribe(
      type: "cache" | "error",
      callback:
        | ((state: ThreadData<TThreadMetadata>[]) => void)
        | ((error: Error) => void)
    ) {
      switch (type) {
        case "cache":
          return cacheEventSource.subscribe(
            callback as (state: ThreadData<TThreadMetadata>[]) => void
          );
        case "error":
          return errorEventSource.subscribe(callback as (error: Error) => void);
      }
    },
  };
}

function createClientCacheStore<TThreadMetadata extends BaseMetadata>() {
  let threads: ThreadData<TThreadMetadata>[] = []; // Stores the current threads cache state

  // Create an event source to notify subscribers when the cache is updated
  const threadsEventSource = makeEventSource<ThreadData<TThreadMetadata>[]>();

  return {
    getThreads() {
      return threads;
    },
    setThreads(value: ThreadData<TThreadMetadata>[]) {
      threads = value;
      // Notify subscribers that the threads cache has been updated
      threadsEventSource.notify(threads);
    },

    subscribe(callback: (state: ThreadData<TThreadMetadata>[]) => void) {
      return threadsEventSource.subscribe(callback);
    },
  };
}

function createUseThreadsRevalidationManager<
  TThreadMetadata extends BaseMetadata,
>(
  options: GetThreadsOptions<TThreadMetadata>,
  manager: ReturnType<typeof createRoomRevalidationManager<TThreadMetadata>>
): UseThreadsRevalidationManager<TThreadMetadata> {
  let isLoading: boolean = true;
  let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
  let error: Error | undefined; // Stores any error that occurred during the last revalidation request

  return {
    // Cache
    getCache() {
      return undefined;
    },
    setCache(value: ThreadData<TThreadMetadata>[]) {
      const cache = new Map(
        (manager.getCache() ?? []).map((thread) => [thread.id, thread])
      );

      for (const thread of value) {
        cache.set(thread.id, thread);
      }
      manager.setCache(Array.from(cache.values()));

      isLoading = false;
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
      isLoading = false;
      const cache = manager.getCache();
      manager.setCache(cache);
    },

    // Mutation
    getMutation() {
      // useThreads revalidation manager need not get the current mutation
      return undefined;
    },
    setMutation(_: MutationInfo) {
      // useThreads revalidation manager need not set mutations
      return;
    },

    getOptions() {
      return options;
    },

    getIsLoading() {
      return isLoading;
    },

    setIsLoading(value: boolean) {
      isLoading = value;
    },
  };
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
