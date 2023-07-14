import type {
  BaseMetadata,
  CommentBody,
  CommentData,
  CommentsApi,
  EventSource,
  RealtimeClient,
  ThreadData,
} from "@liveblocks/core";
import { makePoller } from "@liveblocks/core";
import { nanoid } from "nanoid";
import { useSyncExternalStore } from "use-sync-external-store/shim";

import type { CommentsApiError } from "./errors";
import {
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadError,
} from "./errors";
import { createStore } from "./lib/store";

const POLLING_INTERVAL_REALTIME = 30000;
const POLLING_INTERVAL = 5000;
const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";

export type CommentsRoom<TThreadMetadata extends BaseMetadata> = {
  useThreads(): RoomThreads<TThreadMetadata>;
  useThreadsSuspense(): ThreadData<TThreadMetadata>[];
  createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata>;
  editThread(options: EditThreadOptions<TThreadMetadata>): void;
  createComment(options: CreateCommentOptions): CommentData;
  editComment(options: EditCommentOptions): void;
  deleteComment(options: DeleteCommentOptions): void;
  disconnect(): void;
};

export type CreateThreadOptions<TMetadata extends BaseMetadata> = [
  TMetadata
] extends [never]
  ? {
      body: CommentBody;
    }
  : { body: CommentBody; metadata: TMetadata };

export type EditThreadOptions<TMetadata extends BaseMetadata> = [
  TMetadata
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

export type RoomThreads<TThreadMetadata extends BaseMetadata> =
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
      threads: ThreadData<TThreadMetadata>[];
      error?: never;
    };

export function createCommentsRoom<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  api: CommentsApi<TThreadMetadata>,
  realtimeClient: RealtimeClient,
  errorEventSource: EventSource<CommentsApiError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const store = createStore<RoomThreads<TThreadMetadata>>({
    isLoading: true,
  });

  // Temporary solution
  // The most basic conflict resolution
  // If there are any pending mutation, we simply ignore any threads coming from the server
  // When all mutations are finished, we pull the source of truth from the backend

  let numberOfMutations = 0;
  function endMutation() {
    numberOfMutations--;
    if (numberOfMutations === 0) {
      revalidateThreads();
    }
  }

  function startMutation() {
    pollingHub.threads.stop();
    numberOfMutations++;
  }

  const pollingHub = {
    // TODO: If there's an error, it will currently infinitely retry at the current polling rate → add retry logic
    threads: makePoller(revalidateThreads),
  };
  let unsubscribeRealtimeEvents: (() => void) | undefined;
  let unsubscribeRealtimeConnection: (() => void) | undefined;
  let realtimeClientConnected = false;

  function getPollingInterval() {
    return realtimeClientConnected
      ? POLLING_INTERVAL_REALTIME
      : POLLING_INTERVAL;
  }

  function getLocalThreadsOrThrow() {
    const state = store.get();
    if (state.isLoading || state.error) {
      throw new Error("TODO");
    }
    return state.threads;
  }

  async function fetchThreads() {
    return api.getThreads({ roomId });
  }

  async function revalidateThreads() {
    pollingHub.threads.pause();

    if (numberOfMutations === 0) {
      setThreads(await fetchThreads());
    }

    pollingHub.threads.resume();
  }

  subscribeThreads(() => {});

  function subscribeThreads(
    callback: (threads: RoomThreads<TThreadMetadata>) => void
  ) {
    // Will only connect if not already connected
    realtimeClient.connect();

    if (!unsubscribeRealtimeEvents) {
      unsubscribeRealtimeEvents = realtimeClient.subscribe(
        "events",
        roomId,
        [
          "threadCreated",
          "threadUpdated",
          "threadDeleted",
          "commentCreated",
          "commentDeleted",
          "commentEdited",
        ],
        () => {
          pollingHub.threads.restart(getPollingInterval());
          revalidateThreads();
        }
      );
    }

    if (!unsubscribeRealtimeConnection) {
      unsubscribeRealtimeConnection = realtimeClient.subscribe(
        "connection",
        (connection) => {
          const nextRealtimeClientConnected = connection === "connected";

          if (nextRealtimeClientConnected !== realtimeClientConnected) {
            realtimeClientConnected = nextRealtimeClientConnected;
            pollingHub.threads.restart(getPollingInterval());
          }
        }
      );
    }

    const unsubscribeEvents = store.subscribe(callback);

    // Will only start if not already started
    pollingHub.threads.start(getPollingInterval());

    revalidateThreads();

    return () => {
      unsubscribeEvents();

      // If there aren't any subscribers left, we stop
      // the polling and unsubscribe from realtime client
      if (!store.subscribersCount()) {
        pollingHub.threads.stop();
        unsubscribeRealtimeEvents?.();
        unsubscribeRealtimeEvents = undefined;
        unsubscribeRealtimeConnection?.();
        unsubscribeRealtimeConnection = undefined;
      }
    };
  }

  function disconnect() {
    store.destroy();
    pollingHub.threads.stop();
    unsubscribeRealtimeEvents?.();
    unsubscribeRealtimeConnection?.();
  }

  function setThreads(newThreads: ThreadData<TThreadMetadata>[]) {
    store.set({
      threads: newThreads,
      isLoading: false,
    });
  }

  function createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata> {
    const body = options.body;
    const metadata: TThreadMetadata =
      "metadata" in options ? options.metadata : ({} as TThreadMetadata);
    const threads = getLocalThreadsOrThrow();

    const threadId = createOptimisticId(THREAD_ID_PREFIX);
    const commentId = createOptimisticId(COMMENT_ID_PREFIX);
    const now = new Date().toISOString();

    const newThread: ThreadData<TThreadMetadata> = {
      id: threadId,
      type: "thread",
      createdAt: now,
      roomId,
      metadata,
      comments: [
        {
          id: commentId,
          createdAt: now,
          type: "comment",
          userId: "optimistic", // TODO: Get current user id
          body,
        },
      ],
    };

    setThreads([...threads, newThread]);

    startMutation();
    api
      .createThread({ roomId, threadId, commentId, body, metadata })
      .catch((er: Error) =>
        errorEventSource.notify(
          new CreateThreadError(er, {
            roomId,
            threadId,
            commentId,
            body,
            metadata, // TODO
          })
        )
      )
      .finally(endMutation);

    return newThread;
  }

  function editThread(options: EditThreadOptions<TThreadMetadata>): void {
    const threadId = options.threadId;
    const metadata: Partial<TThreadMetadata> =
      "metadata" in options ? options.metadata : {};
    const threads = getLocalThreadsOrThrow();

    setThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              metadata: {
                ...thread.metadata,
                ...metadata,
              },
            }
          : thread
      )
    );

    startMutation();
    api
      .editThread({ roomId, metadata, threadId })
      .catch((er: Error) =>
        errorEventSource.notify(
          new EditThreadError(er, {
            roomId,
            threadId,
            metadata,
          })
        )
      )
      .finally(endMutation);
  }

  function createComment({
    threadId,
    body,
  }: CreateCommentOptions): CommentData {
    const threads = getLocalThreadsOrThrow();

    const commentId = createOptimisticId(COMMENT_ID_PREFIX);
    const now = new Date().toISOString();

    const comment: CommentData = {
      id: commentId,
      type: "comment",
      createdAt: now,
      userId: "optimistic", // TODO: Get current user id
      body,
    };

    setThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: [...thread.comments, comment],
            }
          : thread
      )
    );

    startMutation();
    api
      .createComment({ roomId, threadId, commentId, body })
      .catch((er: Error) =>
        errorEventSource.notify(
          new CreateCommentError(er, {
            roomId,
            threadId,
            commentId,
            body,
          })
        )
      )
      .finally(endMutation);

    return comment;
  }

  function editComment({ threadId, commentId, body }: EditCommentOptions) {
    const threads = getLocalThreadsOrThrow();
    const now = new Date().toISOString();

    setThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: thread.comments.map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      editedAt: now,
                      body,
                    }
                  : comment
              ),
            }
          : thread
      )
    );

    startMutation();
    api
      .editComment({ roomId, threadId, commentId, body })
      .catch((er: Error) =>
        errorEventSource.notify(
          new EditCommentError(er, {
            roomId,
            threadId,
            commentId,
            body,
          })
        )
      )
      .finally(endMutation);
  }

  function deleteComment({ threadId, commentId }: DeleteCommentOptions): void {
    const threads = getLocalThreadsOrThrow();
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

    setThreads(newThreads);

    startMutation();
    api
      .deleteComment({ roomId, threadId, commentId })
      .catch((er: Error) =>
        errorEventSource.notify(
          new DeleteCommentError(er, {
            roomId,
            threadId,
            commentId,
          })
        )
      )
      .finally(endMutation);
  }

  function useThreads() {
    return useSyncExternalStore<RoomThreads<TThreadMetadata>>(
      store.subscribe,
      store.get,
      store.get
    );
  }

  function useThreadsSuspense() {
    const result = useThreads();

    if (result.isLoading) {
      throw new Promise<void>((res) => {
        store.subscribeOnce(() => res());
      });
    }

    if (result.error) {
      throw result.error;
    }

    return result.threads;
  }

  return {
    useThreads,
    useThreadsSuspense,
    createThread,
    editThread,
    createComment,
    editComment,
    deleteComment,
    disconnect,
  };
}
