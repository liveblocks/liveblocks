import type {
  AsyncCache,
  BaseMetadata,
  BaseUserInfo,
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
  nn,
} from "@liveblocks/core";
import type { NamedExoticComponent, PropsWithChildren } from "react";
import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  CommentsRoom,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  RoomThreads,
} from "./CommentsRoom";
import { createCommentsRoom } from "./CommentsRoom";
import type { CommentsApiError } from "./errors";
import { useAsyncCache } from "./lib/use-async-cache";
import type { ComposerContext } from "./primitives/Composer";
import { useComposer } from "./primitives/Composer";
import { useDebounce } from "./utils/use-debounce";

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

type UserState<T extends BaseUserInfo> =
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

type UserStateSuspense<T extends BaseUserInfo> = Resolve<
  Extract<UserState<T>, { isLoading: false }>
>;

type CommentsProviderProps = PropsWithChildren<{
  roomId: string;
}>;

type CommentsContextBundle<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
> = {
  /**
   * TODO: Add description
   */
  CommentsProvider: NamedExoticComponent<CommentsProviderProps>;

  /**
   * Returns a function that creates a thread with an initial comment, and optionally some metadata.
   *
   * @example
   * const createThread = useCreateThread();
   * createThread({ body: {}, metadata: {} });
   */
  useCreateThread(): (
    options: CreateThreadOptions<TThreadMetadata>
  ) => ThreadData<TThreadMetadata>;

  /**
   * Returns a function that edits a thread's metadata.
   *
   * @example
   * const editThreadMetadata = useEditThreadMetadata();
   * editThreadMetadata({ threadId: "th_xxx", metadata: {} } })
   */
  useEditThreadMetadata(): (
    options: EditThreadMetadataOptions<TThreadMetadata>
  ) => void;

  /**
   * Returns a function that adds a comment to a thread.
   *
   * @example
   * const createComment = useCreateComment();
   * createComment({ threadId: "th_xxx", body: { {} } });
   */
  useCreateComment(): (options: CreateCommentOptions) => CommentData;

  /**
   * Returns a function that edits a comment's body.
   *
   * @example
   * const editComment = useEditComment()
   * editComment({ threadId: "th_xxx", commentId: "cm_xxx", body: {} })
   */
  useEditComment(): (options: EditCommentOptions) => void;

  /**
   * Returns a function that deletes a comment.
   * If it is the last non-deleted comment, the thread also gets deleted.
   *
   * @example
   * const deleteComment = useDeleteComment();
   * deleteComment({ threadId: "th_xxx", commentId: "cm_xxx" })
   */
  useDeleteComment(): (options: DeleteCommentOptions) => void;

  /**
   * Returns the threads within the current room.
   *
   * @example
   * const { threads, error, isLoading } = useThreads();
   */
  useThreads(): RoomThreads<TThreadMetadata>;

  /**
   * Returns a user object from a given user ID.
   *
   * @example
   * const { user, error, isLoading } = useUser("user-id");
   */
  useUser(userId: string): UserState<TUserInfo>;

  /**
   * TODO: Add description
   */
  useRoomId(): string;

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
     * Returns the threads within the current room.
     *
     * @example
     * const threads = useThreads();
     */
    useThreads(): ThreadData<TThreadMetadata>[];

    /**
     * Returns a user object from a given user ID.
     *
     * @example
     * const { user, error, isLoading } = useUser("user-id");
     */
    useUser(userId: string): UserStateSuspense<TUserInfo>;

    /**
     * TODO: Add description
     */
    useRoomId(): string;

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

type CommentsContext<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
> = Resolve<
  Omit<
    CommentsContextBundle<TThreadMetadata, TUserInfo>,
    "CommentsProvider"
  > & {
    useMentionSuggestions: (value: string | undefined) => string[] | undefined;
    roomId: string;
  }
>;

type UserResolver<T> = (userId: string) => Promise<T | undefined>;

type Options<TUserInfo extends BaseUserInfo> = {
  /**
   * An asynchronous function that returns a user object from a user ID.
   */
  resolveUser?: UserResolver<TUserInfo>;

  /**
   * An asynchronous function to get a list of suggested user IDs from a string.
   */
  resolveMentionSuggestions?: (text: string) => Promise<string[]>;

  /**
   * @internal Internal endpoint
   */
  serverEndpoint?: string;
};

let hasWarnedIfNoResolveUser = false;

function warnIfNoResolveUser(
  usersCache?: AsyncCache<BaseUserInfo | undefined, unknown>
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

const CommentsContext = createContext<CommentsContext<
  BaseMetadata,
  BaseUserInfo
> | null>(null);

export function useCommentsContext<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
>(): CommentsContext<TThreadMetadata, TUserInfo> {
  const commentsContext = useContext(CommentsContext);

  return nn(
    commentsContext as CommentsContext<TThreadMetadata, TUserInfo> | null,
    "CommentsProvider is missing from the React tree."
  );
}

export function createCommentsContext<
  TThreadMetadata extends BaseMetadata = never,
  TUserInfo extends BaseUserInfo = BaseUserInfo,
>(
  client: Client,
  options?: Options<TUserInfo>
): CommentsContextBundle<TThreadMetadata, TUserInfo> {
  const { resolveUser, resolveMentionSuggestions } = options ?? {};

  const errorEventSource = makeEventSource<CommentsApiError<TThreadMetadata>>();
  const restApi = createCommentsApi<TThreadMetadata>(client, {
    serverEndpoint: `https://api.liveblocks.io/v2`,
  });

  const usersCache = resolveUser
    ? createAsyncCache(resolveUser as UserResolver<BaseUserInfo>)
    : undefined;
  const mentionSuggestionsCache = createAsyncCache<string[], unknown>(
    resolveMentionSuggestions ?? (() => Promise.resolve([]))
  );

  const commentsRooms = new Map<string, CommentsRoom<TThreadMetadata>>();

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

  function useRoomId() {
    const { roomId } = useCommentsContext();
    return roomId;
  }

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

  function useThreads(): RoomThreads<TThreadMetadata> {
    const { roomId } = useCommentsContext();
    const commentsRoom = useMemo(() => getCommentsRoom(roomId), [roomId]);

    return commentsRoom.useThreads();
  }

  function useThreadsSuspense() {
    const { roomId } = useCommentsContext();
    const commentsRoom = useMemo(() => getCommentsRoom(roomId), [roomId]);

    return commentsRoom.useThreadsSuspense();
  }

  function useMentionSuggestions(value: string | undefined) {
    const debouncedValue = useDebounce(value, MENTION_SUGGESTIONS_DEBOUNCE);
    const { data } = useAsyncCache(
      mentionSuggestionsCache,
      debouncedValue ?? null,
      {
        keepPreviousDataWhileLoading: true,
      }
    );

    return data;
  }

  function useUser(userId: string) {
    const state = useAsyncCache(usersCache, userId);

    useEffect(() => warnIfNoResolveUser(usersCache), []);

    if (state?.isLoading) {
      return {
        isLoading: true,
      } as UserState<TUserInfo>;
    } else {
      return {
        user: state?.data,
        error: state?.error,
        isLoading: false,
      } as UserState<TUserInfo>;
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
    } as UserStateSuspense<TUserInfo>;
  }

  function useCreateThread() {
    const { roomId } = useCommentsContext();

    return useCallback(
      (options: CreateThreadOptions<TThreadMetadata>) =>
        getCommentsRoom(roomId).createThread(options),
      [roomId]
    );
  }

  function useEditThreadMetadata() {
    const { roomId } = useCommentsContext();

    return useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>) =>
        getCommentsRoom(roomId).editThreadMetadata(options),
      [roomId]
    );
  }

  function useCreateComment(): (options: CreateCommentOptions) => CommentData {
    const { roomId } = useCommentsContext();

    return useCallback(
      (options: CreateCommentOptions) =>
        getCommentsRoom(roomId).createComment(options),
      [roomId]
    );
  }

  function useEditComment(): (options: EditCommentOptions) => void {
    const { roomId } = useCommentsContext();

    return useCallback(
      (options: EditCommentOptions) =>
        getCommentsRoom(roomId).editComment(options),
      [roomId]
    );
  }

  function useDeleteComment() {
    const { roomId } = useCommentsContext();

    return useCallback(
      (options: DeleteCommentOptions) =>
        getCommentsRoom(roomId).deleteComment(options),
      [roomId]
    );
  }

  const bundle: Omit<
    CommentsContextBundle<TThreadMetadata, TUserInfo>,
    "CommentsProvider"
  > = {
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useThreads,
    useUser,
    useErrorListener,
    useComposer,
    useRoomId,
    suspense: {
      useThreads: useThreadsSuspense,
      useUser: useUserSuspense,
      useErrorListener,
      useComposer,
      useRoomId,
    },
  };

  const CommentsProvider = memo<CommentsProviderProps>(
    ({ roomId, children }) => {
      return (
        <CommentsContext.Provider
          value={{
            ...(bundle as unknown as CommentsContextBundle<
              BaseMetadata,
              BaseUserInfo
            >),
            useMentionSuggestions,
            roomId,
          }}
        >
          {children}
        </CommentsContext.Provider>
      );
    }
  );

  return {
    ...bundle,
    CommentsProvider,
  };
}
