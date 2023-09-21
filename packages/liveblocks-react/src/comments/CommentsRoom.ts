/**
MIT License

Copyright (c) 2023 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import type {
  BaseMetadata,
  BaseUserMeta,
  CommentBody,
  CommentData,
  EventSource,
  Json,
  JsonObject,
  LsonObject,
  Room,
  ThreadData,
} from "@liveblocks/core";
import { nanoid } from "nanoid";
import { useCallback, useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import {
  type CommentsApiError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadMetadataError,
} from "./errors";

const POLLING_INTERVAL_REALTIME = 30000;
const POLLING_INTERVAL = 5000;

const MAX_ERROR_RETRY_COUNT = 5;
const ERROR_RETRY_INTERVAL = 5000;

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";
const DEDUPING_INTERVAL = 1000;

export type CommentsRoom<TThreadMetadata extends BaseMetadata> = {
  useThreads(): State<ThreadData<TThreadMetadata>[]>;
  useThreadsSuspense(): ThreadData<TThreadMetadata>[];
  createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata>;
  editThreadMetadata(options: EditThreadMetadataOptions<TThreadMetadata>): void;
  createComment(options: CreateCommentOptions): CommentData;
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

function createOptimisticId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}

export type State<Data = any> =
  | {
      isLoading: true;
      threads?: never;
      error?: never;
    }
  | {
      isLoading: false;
      threads?: never;
      error: Error;
    }
  | {
      isLoading: false;
      threads: Data;
      error?: never;
    };

type RequestInfo<Data = any> = {
  fetcher: Promise<Data>;
  timestamp: number;
};

type MutationInfo = {
  startTime: number;
  endTime: number;
};

class StateManager<Data = any> extends EventTarget {
  private _cache: State<Data> | undefined; // Stores the current cache state (threads)
  public request: RequestInfo<Data> | undefined; // Stores the currently active revalidation request
  public mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation

  constructor() {
    super();
  }

  /* -------------------------------------------------------------------------------------------------
   * Cache Getter/Setter
   * -----------------------------------------------------------------------------------------------*/
  get cache(): State<Data> | undefined {
    return this._cache;
  }

  set cache(value: State<Data> | undefined) {
    this._cache = value;
    const event = new CustomEvent("cacheupdate");
    this.dispatchEvent(event);
  }

  /* -------------------------------------------------------------------------------------------------
   * Event Listener
   * -----------------------------------------------------------------------------------------------*/
  addEventListener(
    key: "cacheupdate",
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;

  addEventListener(
    key: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ): void {
    super.addEventListener(key, callback, options);
  }

  removeEventListener(
    type: "cacheupdate",
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions | undefined
  ): void;

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions | undefined
  ): void {
    super.removeEventListener(type, callback, options);
  }
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
  const manager = new StateManager<ThreadData<TThreadMetadata>[]>();

  let timestamp = 0;

  let refCount = 0; // Reference count for the number of components with a subscription (via the `subscribe` function)
  let disposer: (() => void) | undefined; // Disposer function for the `comments` event listener

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

    const newThread = {
      id: threadId,
      type: "thread",
      createdAt: now,
      roomId: room.id,
      metadata,
      comments: [
        {
          id: commentId,
          createdAt: now,
          type: "comment",
          userId: getCurrentUserId(),
          body,
        },
      ],
    } as ThreadData<TThreadMetadata>; // TODO: Figure out metadata typing

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
    if (refCount === 0) {
      disposer = room.events.comments.subscribe(() => {
        void revalidateCache(true);
      });
    }

    refCount = refCount + 1;

    return () => {
      // Only unsubscribe from the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
      refCount = refCount - 1;
      if (refCount > 0) return;

      disposer?.();
      disposer = undefined;
    };
  }

  function usePolling() {
    const status = useSyncExternalStore(
      room.events.status.subscribe,
      room.getStatus,
      room.getStatus
    );

    useEffect(() => {
      const interval =
        status === "connected" ? POLLING_INTERVAL_REALTIME : POLLING_INTERVAL;

      let revalidationTimerId: number;
      function scheduleRevalidation() {
        revalidationTimerId = window.setTimeout(executeRevalidation, interval);
      }

      function executeRevalidation() {
        // Revalidate cache and then schedule the next revalidation
        void revalidateCache(true).then(scheduleRevalidation);
      }

      scheduleRevalidation();

      return () => {
        window.clearTimeout(revalidationTimerId);
      };
    }, [status]);
  }

  function useThreadsInternal(): State<ThreadData<TThreadMetadata>[]> {
    useEffect(_subscribe, []);

    usePolling();

    const subscribe = useCallback((onStoreChange: () => void) => {
      manager.addEventListener("cacheupdate", onStoreChange);
      return () => {
        manager.removeEventListener("cacheupdate", onStoreChange);
      };
    }, []);

    const getSnapshot = useCallback(() => {
      const snapshot = manager.cache;
      return snapshot;
    }, []);

    const cache = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return cache ?? { isLoading: true };
  }

  function useThreads() {
    useEffect(() => {
      void revalidateCache(true);
    }, []);

    return useThreadsInternal();
  }

  function useThreadsSuspense() {
    const cache = useThreadsInternal();

    if (cache.isLoading) {
      throw revalidateCache(true);
    }

    if (cache.error) {
      throw cache.error;
    }

    return cache.threads;
  }

  return {
    useThreads,
    useThreadsSuspense,
    editThreadMetadata,
    createThread,
    createComment,
    editComment,
    deleteComment,
  };
}
