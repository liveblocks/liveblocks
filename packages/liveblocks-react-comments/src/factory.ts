import type {
  AsyncCache,
  BaseMetadata,
  BaseUserMeta,
  Client,
  CommentData,
  Resolve,
  ThreadData,
} from "@liveblocks/core";
import {
  console,
  createAsyncCache,
  createCommentsApi,
  makeEventSource,
} from "@liveblocks/core";
import { useEffect, useRef } from "react";

import type {
  CommentsRoom,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadOptions,
  RoomThreads,
} from "./CommentsRoom";
import { createCommentsRoom } from "./CommentsRoom";
import type { ComposerContext } from "./components/Composer";
import { useComposer } from "./components/Composer";
import type { CommentsApiError } from "./errors";
import { useAsyncCache } from "./lib/use-async-cache";

type UserState<T extends BaseUserMeta> =
  | {
      user?: never;
      error?: never;
      isLoading: true;
    }
  | {
      user?: T;
      isLoading: false;
      error?: never;
    }
  | {
      user?: never;
      isLoading: false;
      error: Error;
    };

type UserStateSuspense<T extends BaseUserMeta> = Resolve<
  Extract<UserState<T>, { isLoading: false }>
>;

type CommentsContext<
  TThreadMetadata extends BaseMetadata,
  TUserMeta extends BaseUserMeta
> = {
  /**
   * Creates a thread with an initial comment, and optionally some metadata.
   *
   * @example
   * const thread = createThread("room-id", { body: {}, metadata: {} })
   */
  createThread(
    roomId: string,
    options: CreateThreadOptions<TThreadMetadata>
  ): ThreadData<TThreadMetadata>;

  /**
   * Edits a thread's metadata.
   *
   * @example
   * const thread = editThread("room-id", { threadId: "th_xxx", metadata: {} } })
   */
  editThread(roomId: string, options: EditThreadOptions<TThreadMetadata>): void;

  /**
   * Adds a comment to a thread.
   *
   * @example
   * const comment = createComment("room-id", { threadId: "th_xxx", body: { {} } })
   */
  createComment(roomId: string, options: CreateCommentOptions): CommentData;

  /**
   * Edits a comment's body.
   *
   * @example
   * const comment = editComment("room-id", { threadId: "th_xxx", commentId: "cm_xxx", body: {} })
   */
  editComment(roomId: string, options: EditCommentOptions): void;

  /**
   * Deletes a comment.
   * If it is the last non-deleted comment, the thread also gets deleted.
   *
   * @example
   * deleteComment("room-id", { threadId: "th_xxx", commentId: "cm_xxx" })
   */
  deleteComment(roomId: string, options: DeleteCommentOptions): void;

  /**
   * Returns the threads within a given room.
   *
   * @example
   * const { user, error, isLoading } = useUser("user-id");
   */
  useThreads(roomId: string): RoomThreads<TThreadMetadata>;

  /**
   * Returns a user object from a given user ID.
   *
   * @example
   * const { user, error, isLoading } = useUser("user-id");
   */
  useUser(userId: string): UserState<TUserMeta>;

  /**
   * Listen to potential errors when creating and editing threads/comments.
   *
   * @example
   * useErrorListener(error => {
   *   console.error(error);
   * })
   */
  useErrorListener(
    onError: (error: CommentsApiError<TThreadMetadata>) => void
  ): void;

  /**
   * Returns states and methods related to the composer.
   *
   * @example
   * const { isValid, submit } = useComposer();
   */
  useComposer(): ComposerContext;

  readonly suspense: {
    /**
     * Returns the threads within a given room.
     *
     * @example
     * const { user, error, isLoading } = useUser("user-id");
     */
    useThreads(roomId: string): ThreadData<TThreadMetadata>[];

    /**
     * Returns a user object from a given user ID.
     *
     * @example
     * const { user, error, isLoading } = useUser("user-id");
     */
    useUser(userId: string): UserStateSuspense<TUserMeta>;

    /**
     * Listen to potential errors when creating and editing threads/comments.
     *
     * @example
     * useErrorListener(error => {
     *   console.error(error);
     * })
     */
    useErrorListener(
      onError: (error: CommentsApiError<TThreadMetadata>) => void
    ): void;

    /**
     * Returns states and methods related to the composer.
     *
     * @example
     * const { isValid, submit } = useComposer();
     */
    useComposer(): ComposerContext;
  };
};

type UserResolver<T> = (userId: string) => Promise<T | undefined>;

type Options<TUserMeta extends BaseUserMeta> = {
  resolveUser?: UserResolver<TUserMeta>;
};

let hasWarnedIfNoResolveUser = false;

function warnIfNoResolveUser(
  usersCache?: AsyncCache<BaseUserMeta | undefined, unknown>
) {
  if (
    !hasWarnedIfNoResolveUser &&
    !usersCache &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "To use useUser, you should provide a resolver function to the resolveUser option in createCommentContext."
    );
    hasWarnedIfNoResolveUser = true;
  }
}

export function createCommentsContext<
  TThreadMetadata extends BaseMetadata = never,
  TUserMeta extends BaseUserMeta = BaseUserMeta
>(
  client: Client,
  { resolveUser }: Options<TUserMeta>
): CommentsContext<TThreadMetadata, TUserMeta> {
  const errorEventSource = makeEventSource<CommentsApiError<TThreadMetadata>>();
  const restApi = createCommentsApi<TThreadMetadata>(client);

  const usersCache = resolveUser
    ? createAsyncCache(resolveUser as UserResolver<BaseUserMeta>)
    : undefined;

  const commentsRooms = new Map<string, CommentsRoom<TThreadMetadata>>();

  function useErrorListener(
    callback: (error: CommentsApiError<TThreadMetadata>) => void
  ) {
    const savedCallback = useRef(callback);

    useEffect(() => {
      savedCallback.current = callback;
    });

    useEffect(
      () =>
        errorEventSource.subscribe((e: CommentsApiError<TThreadMetadata>) =>
          savedCallback.current(e)
        ),
      []
    );
  }

  function useThreads(roomId: string): RoomThreads<TThreadMetadata> {
    return getCommentsRoom(roomId).useThreads();
  }

  function useThreadsSuspense(roomId: string) {
    return getCommentsRoom(roomId).useThreadsSuspense();
  }

  function useUser(userId: string) {
    const state = useAsyncCache(usersCache, userId);

    useEffect(() => warnIfNoResolveUser(usersCache), []);

    if (state?.isLoading) {
      return {
        isLoading: true,
      } as UserState<TUserMeta>;
    } else {
      return {
        user: state?.data,
        error: state?.error,
        isLoading: false,
      } as UserState<TUserMeta>;
    }
  }

  function useUserSuspense(userId: string) {
    const state = useAsyncCache(usersCache, userId, {
      suspense: true,
    });

    useEffect(() => warnIfNoResolveUser(usersCache), []);

    return {
      user: state?.data,
      error: state?.error,
      isLoading: false,
    } as UserStateSuspense<TUserMeta>;
  }

  function getCommentsRoom(roomId: string) {
    let commentsRoom = commentsRooms.get(roomId);
    if (commentsRoom === undefined) {
      commentsRoom = createCommentsRoom(
        roomId,
        restApi,
        client.__internal.realtimeClient,
        errorEventSource
      );
      commentsRooms.set(roomId, commentsRoom);
    }
    return commentsRoom;
  }

  function createThread(
    roomId: string,
    options: CreateThreadOptions<TThreadMetadata>
  ) {
    return getCommentsRoom(roomId).createThread(options);
  }

  function editThread(
    roomId: string,
    options: EditThreadOptions<TThreadMetadata>
  ) {
    return getCommentsRoom(roomId).editThread(options);
  }

  function createComment(roomId: string, options: CreateCommentOptions) {
    return getCommentsRoom(roomId).createComment(options);
  }

  function editComment(roomId: string, options: EditCommentOptions) {
    return getCommentsRoom(roomId).editComment(options);
  }

  function deleteComment(roomId: string, options: DeleteCommentOptions) {
    return getCommentsRoom(roomId).deleteComment(options);
  }

  return {
    createThread,
    editThread,
    createComment,
    editComment,
    deleteComment,
    useThreads,
    useUser,
    useErrorListener,
    useComposer,
    suspense: {
      useThreads: useThreadsSuspense,
      useUser: useUserSuspense,
      useErrorListener,
      useComposer,
    },
  };
}
