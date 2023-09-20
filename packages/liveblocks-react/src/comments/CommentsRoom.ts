/// <reference types="react/experimental" />

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
import { makePoller } from "@liveblocks/core";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import type { CommentsApiError } from "./errors";
import {
  AddCommentReactionError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadMetadataError,
  RemoveCommentReactionError,
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
  editThreadMetadata(options: EditThreadMetadataOptions<TThreadMetadata>): void;
  createComment(options: CreateCommentOptions): CommentData;
  addCommentReaction(options: CommentReactionOptions): void;
  removeCommentReaction(options: CommentReactionOptions): void;
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
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  errorEventSource: EventSource<CommentsApiError<TThreadMetadata>>
): CommentsRoom<TThreadMetadata> {
  const store = createStore<RoomThreads<TThreadMetadata>>({
    isLoading: true,
  });

  let fetchThreadsPromise: Promise<ThreadData<TThreadMetadata>[]> | null = null;

  // Temporary solution
  // The most basic conflict resolution
  // If there are any pending mutation, we simply ignore any threads coming from the server
  // When all mutations are finished, we pull the source of truth from the backend

  let numberOfMutations = 0;
  function endMutation() {
    numberOfMutations--;
    if (numberOfMutations === 0) {
      void revalidateThreads();
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

  function ensureThreadsAreLoadedForMutations() {
    const state = store.get();
    if (state.isLoading || state.error) {
      throw new Error(
        "Cannot update threads or comments before they are loaded"
      );
    }
    return state.threads;
  }

  async function revalidateThreads() {
    pollingHub.threads.pause();

    if (numberOfMutations === 0) {
      if (fetchThreadsPromise === null) {
        fetchThreadsPromise = room.getThreads();
      }
      setThreads(await fetchThreadsPromise);
      fetchThreadsPromise = null;
    }

    pollingHub.threads.resume();
  }

  function subscribe() {
    if (!unsubscribeRealtimeEvents) {
      unsubscribeRealtimeEvents = room.events.comments.subscribe(() => {
        pollingHub.threads.restart(getPollingInterval());
        void revalidateThreads();
      });
    }

    if (!unsubscribeRealtimeConnection) {
      unsubscribeRealtimeConnection = room.events.status.subscribe((status) => {
        const nextRealtimeClientConnected = status === "connected";

        if (nextRealtimeClientConnected !== realtimeClientConnected) {
          realtimeClientConnected = nextRealtimeClientConnected;
          pollingHub.threads.restart(getPollingInterval());
        }
      });
    }

    // Will only start if not already started
    pollingHub.threads.start(getPollingInterval());

    return () => {
      if (store.subscribersCount() > 1) {
        return;
      }

      pollingHub.threads.stop();
      unsubscribeRealtimeEvents?.();
      unsubscribeRealtimeEvents = undefined;
      unsubscribeRealtimeConnection?.();
      unsubscribeRealtimeConnection = undefined;
    };
  }

  function setThreads(newThreads: ThreadData<TThreadMetadata>[]) {
    store.set({
      threads: newThreads,
      isLoading: false,
    });
  }

  function useThreadsInternal(): RoomThreads<TThreadMetadata> {
    useEffect(subscribe, []);

    return useSyncExternalStore<RoomThreads<TThreadMetadata>>(
      store.subscribe,
      store.get,
      store.get
    );
  }

  function useThreads(): RoomThreads<TThreadMetadata> {
    useEffect(() => {
      void revalidateThreads();
    }, []);

    return useThreadsInternal();
  }

  function useThreadsSuspense() {
    const result = useThreadsInternal();

    if (result.isLoading) {
      throw revalidateThreads();
    }

    if (result.error) {
      throw result.error;
    }

    return result.threads;
  }

  function getCurrentUserId() {
    const self = room.getSelf();
    if (self === null || self.id === undefined) {
      return "anonymous";
    } else {
      return self.id;
    }
  }

  function createThread(
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata> {
    const body = options.body;
    const metadata: TThreadMetadata =
      "metadata" in options ? options.metadata : ({} as TThreadMetadata);
    const threads = ensureThreadsAreLoadedForMutations();

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

    setThreads([...threads, newThread]);

    startMutation();
    room
      .createThread({ threadId, commentId, body, metadata })
      .catch((er: Error) =>
        errorEventSource.notify(
          new CreateThreadError(er, {
            roomId: room.id,
            threadId,
            commentId,
            body,
            metadata,
          })
        )
      )
      .finally(endMutation);

    return newThread;
  }

  function editThreadMetadata(
    options: EditThreadMetadataOptions<TThreadMetadata>
  ): void {
    const threadId = options.threadId;
    const metadata: Partial<TThreadMetadata> =
      "metadata" in options ? options.metadata : {};
    const threads = ensureThreadsAreLoadedForMutations();

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
    room
      .editThreadMetadata({ metadata, threadId })
      .catch((er: Error) =>
        errorEventSource.notify(
          new EditThreadMetadataError(er, {
            roomId: room.id,
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
    const threads = ensureThreadsAreLoadedForMutations();

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
    room
      .createComment({ threadId, commentId, body })
      .catch((er: Error) =>
        errorEventSource.notify(
          new CreateCommentError(er, {
            roomId: room.id,
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
    const threads = ensureThreadsAreLoadedForMutations();
    const now = new Date().toISOString();

    setThreads(
      threads.map((thread) =>
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
      )
    );

    startMutation();
    room
      .editComment({ threadId, commentId, body })
      .catch((er: Error) =>
        errorEventSource.notify(
          new EditCommentError(er, {
            roomId: room.id,
            threadId,
            commentId,
            body,
          })
        )
      )
      .finally(endMutation);
  }

  function deleteComment({ threadId, commentId }: DeleteCommentOptions): void {
    const threads = ensureThreadsAreLoadedForMutations();
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
    room
      .deleteComment({ threadId, commentId })
      .catch((er: Error) =>
        errorEventSource.notify(
          new DeleteCommentError(er, {
            roomId: room.id,
            threadId,
            commentId,
          })
        )
      )
      .finally(endMutation);
  }

  function addCommentReaction({
    threadId,
    commentId,
    emoji,
  }: CommentReactionOptions): void {
    const threads = ensureThreadsAreLoadedForMutations();
    const now = new Date().toISOString();

    setThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: thread.comments.map((comment) =>
                comment.id === commentId
                  ? ({
                      ...comment,
                      reactions: [
                        ...comment.reactions,
                        { emoji, userId: getCurrentUserId(), createdAt: now },
                      ],
                    } as CommentData)
                  : comment
              ),
            }
          : thread
      )
    );

    startMutation();
    room
      .addCommentReaction({ threadId, commentId, emoji })
      .catch((er: Error) =>
        errorEventSource.notify(
          new AddCommentReactionError(er, {
            roomId: room.id,
            threadId,
            commentId,
            emoji,
          })
        )
      )
      .finally(endMutation);
  }

  function removeCommentReaction({
    threadId,
    commentId,
    emoji,
  }: CommentReactionOptions): void {
    const threads = ensureThreadsAreLoadedForMutations();

    setThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: thread.comments.map((comment) => {
                const reactionIndex = comment.reactions.findIndex(
                  (reaction) =>
                    reaction.emoji === emoji &&
                    reaction.userId === getCurrentUserId()
                );

                return comment.id === commentId
                  ? ({
                      ...comment,
                      reactions:
                        reactionIndex < 0
                          ? comment.reactions
                          : comment.reactions
                              .slice(0, reactionIndex)
                              .concat(
                                comment.reactions.slice(reactionIndex + 1)
                              ),
                    } as CommentData)
                  : comment;
              }),
            }
          : thread
      )
    );

    startMutation();
    room
      .removeCommentReaction({ threadId, commentId, emoji })
      .catch((er: Error) =>
        errorEventSource.notify(
          new RemoveCommentReactionError(er, {
            roomId: room.id,
            threadId,
            commentId,
            emoji,
          })
        )
      )
      .finally(endMutation);
  }

  return {
    useThreads,
    useThreadsSuspense,
    createThread,
    editThreadMetadata,
    addCommentReaction,
    removeCommentReaction,
    createComment,
    editComment,
    deleteComment,
  };
}
