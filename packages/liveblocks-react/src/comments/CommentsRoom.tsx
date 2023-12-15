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
  useRef,
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
import type {
  CacheManager,
  CacheState,
  MutationInfo,
  RequestInfo,
} from "./lib/revalidation";
import {
  _useRevalidateCache,
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

type NormalizedFilterOptions<TThreadMetadata extends BaseMetadata> = {
  query: { metadata: Partial<TThreadMetadata> };
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

type ThreadsFilterOptionsInfo<TThreadMetadata extends BaseMetadata> = {
  options: NormalizedFilterOptions<TThreadMetadata>; // The filter option
  count: number; // The number of components using this filter option
  revalidationManager: CacheManager<ThreadData<TThreadMetadata>[]>; // The revalidation manager associated with this filter option
  eventSource: EventSource<CacheState<ThreadData<TThreadMetadata>[]>>; // The event source associated with this filter option that notifies subscribers when the threads cache is updated
};

export function createCommentsRoom<TThreadMetadata extends BaseMetadata>(
  errorEventSource: EventSource<CommentsError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const manager = createThreadsCacheManager<TThreadMetadata>();

  // A map that stores filter description for each filter option. The key is a stringified version of the filter options.
  const filterOptionsInfo = new Map<
    string,
    ThreadsFilterOptionsInfo<TThreadMetadata>
  >();

  // A map that stores the cache state for each filter option. The key is a stringified version of the filter options.
  const cacheStates = new Map<
    string,
    CacheState<ThreadData<TThreadMetadata>[]> // The cache state associated with this filter option
  >();

  function createThreadsRevalidationManager(key: string) {
    let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
    let error: Error | undefined; // Stores any error that occurred during the last revalidation request

    return {
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

        setCache(key, {
          isLoading: false,
          data: value,
        });

        manager.setCache(Array.from(cache.values()));
      },
      // Request
      getRequest() {
        return request;
      },
      setRequest(
        value: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined
      ) {
        request = value;
      },

      // Error
      getError() {
        return error;
      },
      setError(err: Error) {
        error = err;
        const cache = getCache(key);
        setCache(key, {
          isLoading: false,
          data: cache?.data,
          error: err,
        });
      },

      // Mutation
      getMutation() {
        return undefined;
      },
      setMutation() {},
    };
  }

  const getCache = (key: string) => cacheStates.get(key);
  const setCache = (
    key: string,
    value: CacheState<ThreadData<TThreadMetadata>[]>
  ) => {
    const info = filterOptionsInfo.get(key);
    if (!info) return;
    cacheStates.set(key, value);
    info.eventSource.notify(value);
  };

  const FetcherContext = createContext<
    (() => Promise<ThreadData<TThreadMetadata>[]>) | null
  >(null);

  const CommentsEventSubscriptionContext = createContext<() => void>(() => {});

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
    const commentsEventSubscribersCountRef = useRef(0); // Reference count for the number of components with a subscription (via the `subscribe` function) to the comments event source.
    const commentsEventDisposerRef = useRef<() => void>(); // Disposer function for the `comments` event listener

    const fetcher = useCallback(async () => {
      const responses = await Promise.all(
        Array.from(filterOptionsInfo.values()).map((info) => {
          return room.getThreads(info.options);
        })
      );

      const threads = Array.from(
        new Map(responses.flat().map((thread) => [thread.id, thread])).values()
      );

      return threads;
    }, [room]);

    const revalidateCache = useRevalidateCache(manager, fetcher);

    /**
     * Subscribes to the `comments` event and returns a function that can be used to unsubscribe.
     * Ensures that there is only one subscription to the `comments` event despite multiple calls to the `subscribe` function (via the `useThreads` hook).
     * This is so that revalidation is only triggered once when the `comments` event is fired.
     * @returns An unsubscribe function that can be used to unsubscribe from the `comments` event.
     */
    const subscribeToCommentEvents = useCallback(() => {
      const commentsEventSubscribersCount =
        commentsEventSubscribersCountRef.current;

      // Only subscribe to the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
      if (commentsEventSubscribersCount === 0) {
        const unsubscribe = room.events.comments.subscribe(() => {
          void revalidateCache({ shouldDedupe: true });
        });
        commentsEventDisposerRef.current = unsubscribe;
      }

      commentsEventSubscribersCountRef.current =
        commentsEventSubscribersCount + 1;

      return () => {
        // Only unsubscribe from the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
        commentsEventSubscribersCountRef.current =
          commentsEventSubscribersCountRef.current - 1;
        if (commentsEventSubscribersCountRef.current > 0) return;

        commentsEventDisposerRef.current?.();
        commentsEventDisposerRef.current = undefined;
      };
    }, [revalidateCache, room]);

    useEffect(() => {
      const unsubscribe = manager.subscribe("cache", (threads) => {
        // Iterate over each query and update the cache state associated with it.
        for (const [key, info] of filterOptionsInfo.entries()) {
          const cache = getCache(key);
          if (!cache || cache.isLoading) continue;

          // Filter the cache to only include threads that match the current query
          const filtered = threads.filter((thread) => {
            const query = info.options.query;
            if (!query) return true;

            for (const key in query.metadata) {
              if (thread.metadata[key] !== query.metadata[key]) {
                return false;
              }
            }
            return true;
          });

          setCache(key, {
            isLoading: false,
            data: filtered,
          });
        }

        // Clear any cache state that is not associated with a query
        for (const [key] of cacheStates.entries()) {
          if (filterOptionsInfo.has(key)) continue;
          cacheStates.delete(key);
        }
      });
      return () => {
        unsubscribe();
      };
    }, []);

    useEffect(() => {
      const unsubscribe = manager.subscribe("error", (error: Error) => {
        // Update the cache state for each query to include the error
        for (const state of cacheStates.values()) {
          state.error = error;
        }
      });
      return () => {
        unsubscribe();
      };
    }, []);

    return (
      <FetcherContext.Provider value={fetcher}>
        <CommentsEventSubscriptionContext.Provider
          value={subscribeToCommentEvents}
        >
          {children}
        </CommentsEventSubscriptionContext.Provider>
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

  /**
   * @internal
   */
  function _useThreads(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    key: string
  ): ThreadsState<TThreadMetadata> {
    const fetcher = useThreadsFetcher();
    const revalidateCache = useRevalidateCache(manager, fetcher);

    const status = useSyncExternalStore(
      room.events.status.subscribe,
      room.getStatus,
      room.getStatus
    );

    const isOnline = useIsOnline();
    const isDocumentVisible = useIsDocumentVisible();
    const subscribeToCommentEvents = useContext(
      CommentsEventSubscriptionContext
    );

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
    useEffect(subscribeToCommentEvents, [subscribeToCommentEvents]);

    const subscribe = useCallback(
      (callback: () => void) => {
        const info = filterOptionsInfo.get(key);
        if (!info) return () => {};

        return info.eventSource.subscribe(callback);
      },
      [key]
    );

    const cache = useSyncExternalStore(
      subscribe,
      () => getCache(key),
      () => getCache(key)
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
    options: ThreadsFilterOptions<TThreadMetadata> = { query: { metadata: {} } }
  ): ThreadsState<TThreadMetadata> {
    const normalizedOptions = normalizeFilterOptions(options);
    const key = useMemo(
      () => stringify(normalizedOptions),
      [normalizedOptions]
    );

    const revalidateCache = _useRevalidateCache();

    useEffect(
      () => {
        const info = filterOptionsInfo.get(key);
        if (info) {
          info.count += 1;
        } else {
          // If there is no info for this filter option, we create one, set the cache state to `isLoading`, set the reference count to 1 and create a revalidation manager and event source for the filter option
          filterOptionsInfo.set(key, {
            options: normalizedOptions,
            count: 1,
            revalidationManager: createThreadsRevalidationManager(key),
            eventSource: makeEventSource(),
          });

          setCache(key, { isLoading: true });
        }

        return () => {
          const info = filterOptionsInfo.get(key);
          if (!info) return;

          info.count -= 1;
          // If there are no more components using this query, we delete the query info
          if (info.count > 0) return;
          filterOptionsInfo.delete(key);
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [key]
    );

    useEffect(() => {
      const info = filterOptionsInfo.get(key);
      if (!info) return;

      void revalidateCache(
        info.revalidationManager,
        () => room.getThreads(info.options),
        {
          shouldDedupe: true,
        }
      );
    }, [room, revalidateCache, key]);

    return _useThreads(room, key);
  }

  function useThreadsSuspense(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    options: ThreadsFilterOptions<TThreadMetadata> = {}
  ): ThreadsStateSuccess<TThreadMetadata> {
    const normalizedOptions = normalizeFilterOptions(options);

    const key = useMemo(
      () => stringify(normalizedOptions),
      [normalizedOptions]
    );

    const info = filterOptionsInfo.get(key);
    let revalidationManager: CacheManager<ThreadData<TThreadMetadata>[]>;
    if (!info) {
      revalidationManager = createThreadsRevalidationManager(key);
      // If there is no info for this filter option, we create one, set the cache state to `isLoading`, set the reference count to 1 and create a revalidation manager and event source for the filter option
      filterOptionsInfo.set(key, {
        options: normalizedOptions,
        count: 0,
        revalidationManager,
        eventSource: makeEventSource(),
      });

      setCache(key, { isLoading: true });
    } else {
      revalidationManager = info.revalidationManager;
    }

    const revalidateCache = _useRevalidateCache();

    useEffect(
      () => {
        const info = filterOptionsInfo.get(key);
        if (info) {
          info.count += 1;
        } else {
          // If there is no info for this query, we create one and set the cache state to loading and the count to 1
          filterOptionsInfo.set(key, {
            options: normalizedOptions,
            count: 1,
            revalidationManager: createThreadsRevalidationManager(key),
            eventSource: makeEventSource(),
          });
        }

        return () => {
          const info = filterOptionsInfo.get(key);
          if (!info) return;

          info.count -= 1;
          // If there are no more components using this query, we delete the query info
          if (info.count > 0) return;
          filterOptionsInfo.delete(key);
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [key]
    );

    const cache = _useThreads(room, key);

    if (cache.error) {
      throw cache.error;
    }

    if (cache.isLoading || !cache.threads) {
      throw revalidateCache(
        revalidationManager,
        () => room.getThreads(normalizedOptions),
        {
          shouldDedupe: true,
        }
      );
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

interface ThreadsCacheManager<TThreadMetadata extends BaseMetadata>
  extends CacheManager<ThreadData<TThreadMetadata>[]> {
  subscribe(
    type: "cache",
    callback: (state: ThreadData<TThreadMetadata>[]) => void
  ): () => void;
  subscribe(type: "error", callback: (error: Error) => void): () => void;
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

function normalizeFilterOptions<TThreadMetadata extends BaseMetadata>({
  query: { metadata = {} } = {},
}: ThreadsFilterOptions<TThreadMetadata> = {}): NormalizedFilterOptions<TThreadMetadata> {
  return {
    query: {
      metadata,
    },
  };
}
