import type {
  BaseMetadata,
  BaseUserMeta,
  BroadcastOptions,
  Client,
  History,
  Json,
  JsonObject,
  LiveObject,
  LostConnectionEvent,
  LsonObject,
  OthersEvent,
  Room,
  Status,
  User,
} from "@liveblocks/client";
import { shallow } from "@liveblocks/client";
import type {
  CacheState,
  CacheStore,
  CommentData,
  CommentsEventServerMsg,
  EnterOptions,
  LiveblocksError,
  OptionalPromise,
  PrivateRoomApi,
  ResolveMentionSuggestionsArgs,
  ResolveUsersArgs,
  RoomEventMessage,
  RoomNotificationSettings,
  ThreadData,
  ToImmutable,
} from "@liveblocks/core";
import {
  addReaction,
  CommentsApiError,
  console,
  deleteComment,
  deprecateIf,
  errorIf,
  isLiveNode,
  kInternal,
  makeEventSource,
  makePoller,
  NotificationsApiError,
  removeReaction,
  ServerMsgCode,
  stringify,
  upsertComment,
} from "@liveblocks/core";
import { nanoid } from "nanoid";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import {
  AddReactionError,
  type CommentsError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  EditCommentError,
  EditThreadMetadataError,
  MarkInboxNotificationAsReadError,
  RemoveReactionError,
  UpdateNotificationSettingsError,
} from "./comments/errors";
import { createCommentId, createThreadId } from "./comments/lib/createIds";
import { selectNotificationSettings } from "./comments/lib/select-notification-settings";
import { selectedInboxNotifications } from "./comments/lib/selected-inbox-notifications";
import { selectedThreads } from "./comments/lib/selected-threads";
import { retryError } from "./lib/retry-error";
import { useInitial } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { useRerender } from "./lib/use-rerender";
import { LiveblocksProvider, useClient, useClientOrNull } from "./liveblocks";
import type { DP, DS, DU } from "./shared";
import { createSharedContext } from "./shared";
import type {
  CommentReactionOptions,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  MutationContext,
  OmitFirstArg,
  RoomContextBundle,
  RoomNotificationSettingsState,
  RoomNotificationSettingsStateSuccess,
  RoomProviderProps,
  ThreadsState,
  ThreadsStateSuccess,
  ThreadSubscription,
  UseThreadsOptions,
} from "./types";
import { useScrollToCommentOnLoadEffect } from "./use-scroll-to-comment-on-load-effect";

const noop = () => {};
const identity: <T>(x: T) => T = (x) => x;

const missing_unstable_batchedUpdates = (
  reactVersion: number,
  roomId: string
) =>
  `We noticed you’re using React ${reactVersion}. Please pass unstable_batchedUpdates at the RoomProvider level until you’re ready to upgrade to React 18:

    import { unstable_batchedUpdates } from "react-dom";  // or "react-native"

    <RoomProvider id=${JSON.stringify(
      roomId
    )} ... unstable_batchedUpdates={unstable_batchedUpdates}>
      ...
    </RoomProvider>

Why? Please see https://liveblocks.io/docs/platform/troubleshooting#stale-props-zombie-child for more information`;

const superfluous_unstable_batchedUpdates =
  "You don’t need to pass unstable_batchedUpdates to RoomProvider anymore, since you’re on React 18+ already.";

function useSyncExternalStore<Snapshot>(
  s: (onStoreChange: () => void) => () => void,
  gs: () => Snapshot,
  gss: undefined | null | (() => Snapshot)
): Snapshot {
  return useSyncExternalStoreWithSelector(s, gs, gss, identity);
}

const STABLE_EMPTY_LIST = Object.freeze([]);

export const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

function makeNotificationSettingsQueryKey(roomId: string) {
  return `${roomId}:NOTIFICATION_SETTINGS`;
}

// Don't try to inline this. This function is intended to be a stable
// reference, to avoid a React.useCallback() wrapper.
function alwaysEmptyList() {
  return STABLE_EMPTY_LIST;
}

// Don't try to inline this. This function is intended to be a stable
// reference, to avoid a React.useCallback() wrapper.
function alwaysNull() {
  return null;
}

function selectorFor_useOthersConnectionIds(
  others: readonly User<JsonObject, BaseUserMeta>[]
): number[] {
  return others.map((user) => user.connectionId);
}

function makeMutationContext<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
>(room: Room<P, S, U, E>): MutationContext<P, S, U> {
  const cannotUseUntil = "This mutation cannot be used until";
  const needsPresence = `${cannotUseUntil} connected to the Liveblocks room`;
  const needsStorage = `${cannotUseUntil} storage has been loaded`;

  return {
    get storage() {
      const mutableRoot = room.getStorageSnapshot();
      if (mutableRoot === null) {
        throw new Error(needsStorage);
      }
      return mutableRoot;
    },

    get self() {
      const self = room.getSelf();
      if (self === null) {
        throw new Error(needsPresence);
      }
      return self;
    },

    get others() {
      const others = room.getOthers();
      if (room.getSelf() === null) {
        throw new Error(needsPresence);
      }
      return others;
    },

    setMyPresence: room.updatePresence,
  };
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

function handleApiError(err: CommentsApiError | NotificationsApiError): Error {
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

const _extras = new WeakMap<
  OpaqueClient,
  ReturnType<typeof makeExtrasForClient>
>();
const _bundles = new WeakMap<
  OpaqueClient,
  RoomContextBundle<JsonObject, LsonObject, BaseUserMeta, Json, BaseMetadata>
>();

function getOrCreateRoomContextBundle<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(client: OpaqueClient): RoomContextBundle<P, S, U, E, M> {
  let bundle = _bundles.get(client);
  if (!bundle) {
    bundle = makeRoomContextBundle(client);
    _bundles.set(client, bundle);
  }
  return bundle as unknown as RoomContextBundle<P, S, U, E, M>;
}

// TODO: Likely a better / more clear name for this helper will arise. I'll
// rename this later. All of these are implementation details to support inbox
// notifications on a per-client basis.
function getExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: CacheStore<M>;
  };
}

function makeExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  const store = client[kInternal].cacheStore as unknown as CacheStore<M>;

  const DEFAULT_DEDUPING_INTERVAL = 2000; // 2 seconds

  const lastRequestedAtByRoom = new Map<string, Date>(); // A map of room ids to the timestamp when the last request for threads updates was made
  const requestsByQuery = new Map<string, Promise<unknown>>(); // A map of query keys to the promise of the request for that query
  const requestStatusByRoom = new Map<string, boolean>(); // A map of room ids to a boolean indicating whether a request to retrieve threads updates is in progress
  const subscribersByQuery = new Map<string, number>(); // A map of query keys to the number of subscribers for that query
  const mentionSuggestionsCache = new Map<string, string[]>();

  const poller = makePoller(refreshThreadsAndNotifications);

  async function refreshThreadsAndNotifications() {
    const requests: Promise<unknown>[] = [];

    client[kInternal].getRoomIds().map((roomId) => {
      const room = client.getRoom(roomId);
      if (room === null) return;

      // Retrieve threads that have been updated/deleted since the last requestedAt value
      requests.push(getThreadsUpdates(room.id));
    });

    await Promise.allSettled(requests);
  }

  function incrementQuerySubscribers(queryKey: string) {
    const subscribers = subscribersByQuery.get(queryKey) ?? 0;
    subscribersByQuery.set(queryKey, subscribers + 1);

    poller.start(POLLING_INTERVAL);

    // Decrement in the unsub function
    return () => {
      const subscribers = subscribersByQuery.get(queryKey);

      if (subscribers === undefined || subscribers <= 0) {
        console.warn(
          `Internal unexpected behavior. Cannot decrease subscriber count for query "${queryKey}"`
        );
        return;
      }

      subscribersByQuery.set(queryKey, subscribers - 1);

      let totalSubscribers = 0;
      for (const subscribers of subscribersByQuery.values()) {
        totalSubscribers += subscribers;
      }

      if (totalSubscribers <= 0) {
        poller.stop();
      }
    };
  }

  /**
   * Retrieve threads that have been updated/deleted since the last time the room requested threads updates and update the local cache with the new data
   * @param roomId The id of the room for which to retrieve threads updates
   */
  async function getThreadsUpdates(roomId: string) {
    const room = client.getRoom(roomId);
    if (room === null) return;

    const since = lastRequestedAtByRoom.get(room.id);
    if (since === undefined) return;

    const isFetchingThreadsUpdates = requestStatusByRoom.get(room.id) ?? false;
    // If another request to retrieve threads updates for the room is in progress, we do not start a new one
    if (isFetchingThreadsUpdates === true) return;

    try {
      // Set the isFetchingThreadsUpdates flag to true to prevent multiple requests to fetch threads updates for the room from being made at the same time
      requestStatusByRoom.set(room.id, true);
      const updates = await room[kInternal].comments.getThreads({ since });

      // Set the isFetchingThreadsUpdates flag to false after a certain interval to prevent multiple requests from being made at the same time
      setTimeout(() => {
        requestStatusByRoom.set(room.id, false);
      }, DEFAULT_DEDUPING_INTERVAL);

      store.updateThreadsAndNotifications(
        updates.threads,
        updates.inboxNotifications,
        updates.deletedThreads,
        updates.deletedInboxNotifications
      );

      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      lastRequestedAtByRoom.set(room.id, updates.meta.requestedAt);
    } catch (err) {
      requestStatusByRoom.set(room.id, false);
      // TODO: Implement error handling
      return;
    }
  }

  async function getThreadsAndInboxNotifications(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    queryKey: string,
    options: UseThreadsOptions<M>,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = requestsByQuery.get(queryKey);

    // If a request was already made for the query, we do not make another request and return the existing promise of the request
    if (existingRequest !== undefined) return existingRequest;

    const commentsAPI = (room[kInternal] as PrivateRoomApi<M>).comments;
    const request = commentsAPI.getThreads(options);

    // Store the promise of the request for the query so that we do not make another request for the same query
    requestsByQuery.set(queryKey, request);

    store.setQueryState(queryKey, {
      isLoading: true,
    });

    try {
      const result = await request;

      store.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications,
        result.deletedThreads,
        result.deletedInboxNotifications,
        queryKey
      );

      const lastRequestedAt = lastRequestedAtByRoom.get(room.id);

      /**
       * We set the `lastRequestedAt` value for the room to the timestamp returned by the current request if:
       * 1. The `lastRequestedAt` value for the room has not been set
       * OR
       * 2. The `lastRequestedAt` value for the room is older than the timestamp returned by the current request
       */
      if (
        lastRequestedAt === undefined ||
        lastRequestedAt > result.meta.requestedAt
      ) {
        lastRequestedAtByRoom.set(room.id, result.meta.requestedAt);
      }

      poller.start(POLLING_INTERVAL);
    } catch (err) {
      requestsByQuery.delete(queryKey);

      // Retry the action using the exponential backoff algorithm
      retryError(() => {
        void getThreadsAndInboxNotifications(room, queryKey, options, {
          retryCount: retryCount + 1,
        });
      }, retryCount);

      // Set the query state to the error state
      store.setQueryState(queryKey, {
        isLoading: false,
        error: err as Error,
      });
    }
    return;
  }

  async function getInboxNotificationSettings(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    queryKey: string,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = requestsByQuery.get(queryKey);

    // If a request was already made for the notifications query, we do not make another request and return the existing promise
    if (existingRequest !== undefined) return existingRequest;

    try {
      const request =
        room[kInternal].notifications.getRoomNotificationSettings();

      requestsByQuery.set(queryKey, request);

      store.setQueryState(queryKey, {
        isLoading: true,
      });

      const settings = await request;
      store.updateRoomInboxNotificationSettings(room.id, settings, queryKey);
    } catch (err) {
      requestsByQuery.delete(queryKey);

      retryError(() => {
        void getInboxNotificationSettings(room, queryKey, {
          retryCount: retryCount + 1,
        });
      }, retryCount);

      store.setQueryState(queryKey, {
        isLoading: false,
        error: err as Error,
      });
    }
    return;
  }

  const commentsErrorEventSource = makeEventSource<CommentsError<M>>();

  function onMutationFailure(
    innerError: Error,
    optimisticUpdateId: string,
    createPublicError: (error: Error) => CommentsError<M>
  ) {
    store.set((state) => ({
      ...state,
      optimisticUpdates: state.optimisticUpdates.filter(
        (update) => update.id !== optimisticUpdateId
      ),
    }));

    if (innerError instanceof CommentsApiError) {
      const error = handleApiError(innerError);
      commentsErrorEventSource.notify(createPublicError(error));
      return;
    }

    if (innerError instanceof NotificationsApiError) {
      handleApiError(innerError);
      // TODO: Create public error and notify via notificationsErrorEventSource?
      return;
    }

    throw innerError;
  }

  /** @internal */
  // Simplistic debounced search, we don't need to worry too much about
  // deduping and race conditions as there can only be one search at a time.
  function useMentionSuggestions(search?: string) {
    const room = useRoom();
    const [mentionSuggestions, setMentionSuggestions] =
      React.useState<string[]>();
    const lastInvokedAt = React.useRef<number>();

    React.useEffect(() => {
      const resolveMentionSuggestions =
        client[kInternal].resolveMentionSuggestions;

      if (search === undefined || !resolveMentionSuggestions) {
        return;
      }

      const resolveMentionSuggestionsArgs = { text: search, roomId: room.id };
      const mentionSuggestionsCacheKey = stringify(
        resolveMentionSuggestionsArgs
      );
      let debounceTimeout: number | undefined;
      let isCanceled = false;

      const getMentionSuggestions = async () => {
        try {
          lastInvokedAt.current = performance.now();
          const mentionSuggestions = await resolveMentionSuggestions(
            resolveMentionSuggestionsArgs
          );

          if (!isCanceled) {
            setMentionSuggestions(mentionSuggestions);
            mentionSuggestionsCache.set(
              mentionSuggestionsCacheKey,
              mentionSuggestions
            );
          }
        } catch (error) {
          console.error((error as Error)?.message);
        }
      };

      if (mentionSuggestionsCache.has(mentionSuggestionsCacheKey)) {
        // If there are already cached mention suggestions, use them immediately.
        setMentionSuggestions(
          mentionSuggestionsCache.get(mentionSuggestionsCacheKey)
        );
      } else if (
        !lastInvokedAt.current ||
        Math.abs(performance.now() - lastInvokedAt.current) >
          MENTION_SUGGESTIONS_DEBOUNCE
      ) {
        // If on the debounce's leading edge (either because it's the first invokation or enough
        // time has passed since the last debounce), get mention suggestions immediately.
        void getMentionSuggestions();
      } else {
        // Otherwise, wait for the debounce delay.
        debounceTimeout = window.setTimeout(() => {
          void getMentionSuggestions();
        }, MENTION_SUGGESTIONS_DEBOUNCE);
      }

      return () => {
        isCanceled = true;
        window.clearTimeout(debounceTimeout);
      };
    }, [room.id, search]);

    return mentionSuggestions;
  }

  return {
    store,
    incrementQuerySubscribers,
    getThreadsUpdates,
    getThreadsAndInboxNotifications,
    getInboxNotificationSettings,
    useMentionSuggestions,
    onMutationFailure,
  };
}

type OpaqueClient = Client<BaseUserMeta>;
type OpaqueRoom = Room<JsonObject, LsonObject, BaseUserMeta, Json>;

type RoomLeavePair<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
> = {
  room: Room<P, S, U, E>;
  leave: () => void;
};

const RoomContext = React.createContext<OpaqueRoom | null>(null);

function makeRoomContextBundle<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(client: Client<U>): RoomContextBundle<P, S, U, E, M> {
  type TRoom = Room<P, S, U, E>;

  function RoomProvider_withImplicitLiveblocksProvider(
    props: RoomProviderProps<P, S>
  ) {
    return (
      <LiveblocksProvider client={client}>
        <RoomProvider {...props} />
      </LiveblocksProvider>
    );
  }

  // Bind to typed hooks
  const { useMentionSuggestions } = getExtrasForClient<M>(client);

  const shared = createSharedContext<U>(client);

  const bundle: RoomContextBundle<P, S, U, E, M> = {
    RoomContext: RoomContext as React.Context<TRoom | null>,
    RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

    useRoom: useRoom<P, S, U, E>,
    useStatus,

    useBatch,
    useBroadcastEvent: useBroadcastEvent<E>,
    useOthersListener: useOthersListener<P, U>,
    useLostConnectionListener,
    useErrorListener,
    useEventListener: useEventListener<P, U, E>,

    useHistory,
    useUndo,
    useRedo,
    useCanRedo,
    useCanUndo,

    // These are just aliases. The passed-in key will define their return values.
    useList: useLegacyKey,
    useMap: useLegacyKey,
    useObject: useLegacyKey,

    useStorageRoot: useStorageRoot<S>,
    useStorage: make_useStorage<S>(),

    useSelf: useSelf<P, U>,
    useMyPresence: useMyPresence<P>,
    useUpdateMyPresence: useUpdateMyPresence<P>,
    useOthers: useOthers<P, U>,
    useOthersMapped: make_useOthersMapped<P, U>(),
    useOthersConnectionIds,
    useOther: make_useOther<P, U>(),

    useMutation: make_useMutation<P, S, U, E>(),

    useThreads: useThreads<M>,

    useCreateThread: useCreateThread<M>,
    useEditThreadMetadata: useEditThreadMetadata<M>,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction: useAddReaction<M>,
    useRemoveReaction,
    useMarkThreadAsRead,
    useThreadSubscription,

    useRoomNotificationSettings,
    useUpdateRoomNotificationSettings,

    ...shared.classic,

    suspense: {
      RoomContext: RoomContext as React.Context<TRoom | null>,
      RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

      useRoom: useRoom<P, S, U, E>,
      useStatus,

      useBatch,
      useBroadcastEvent: useBroadcastEvent<E>,
      useOthersListener: useOthersListener<P, U>,
      useLostConnectionListener,
      useErrorListener,
      useEventListener: useEventListener<P, U, E>,

      useHistory,
      useUndo,
      useRedo,
      useCanRedo,
      useCanUndo,

      // Legacy hooks
      useList: useLegacyKeySuspense,
      useMap: useLegacyKeySuspense,
      useObject: useLegacyKeySuspense,

      useStorageRoot: useStorageRoot<S>,
      useStorage: make_useStorageSuspense<S>(),

      useSelf: useSelfSuspense<P, U>,
      useMyPresence: useMyPresence<P>,
      useUpdateMyPresence: useUpdateMyPresence<P>,
      useOthers: make_useOthersSuspense<P, U>(),
      useOthersMapped: make_useOthersMappedSuspense<P, U>(),
      useOthersConnectionIds: useOthersConnectionIdsSuspense,
      useOther: make_useOtherSuspense<P, U>(),

      useMutation: make_useMutation<P, S, U, E>(),

      useThreads: useThreadsSuspense<M>,

      useCreateThread: useCreateThread<M>,
      useEditThreadMetadata: useEditThreadMetadata<M>,
      useCreateComment,
      useEditComment,
      useDeleteComment,
      useAddReaction: useAddReaction<M>,
      useRemoveReaction,
      useMarkThreadAsRead,
      useThreadSubscription,

      useRoomNotificationSettings: useRoomNotificationSettingsSuspense,
      useUpdateRoomNotificationSettings,

      ...shared.suspense,
    },

    [kInternal]: {
      useCurrentUserId,
      useMentionSuggestions,
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}

function RoomProvider<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
>(props: RoomProviderProps<P, S>) {
  const client = useClient();
  const [cache] = React.useState(
    () => new Map<string, RoomLeavePair<P, S, U, E>>()
  );

  // Produce a version of client.enterRoom() that when called for the same
  // room ID multiple times, will not keep producing multiple leave
  // functions, but instead return the cached one.
  const stableEnterRoom = React.useCallback(
    (
      roomId: string,
      options: EnterOptions<P, S>
    ): RoomLeavePair<P, S, U, E> => {
      const cached = cache.get(roomId);
      if (cached) return cached;

      const rv = client.enterRoom<P, S, U, E>(roomId, options);

      // Wrap the leave function to also delete the cached value
      const origLeave = rv.leave;
      rv.leave = () => {
        origLeave();
        cache.delete(roomId);
      };

      cache.set(roomId, rv);
      return rv;
    },
    [client, cache]
  );

  //
  // RATIONALE:
  // At the "Outer" RoomProvider level, we keep a cache and produce
  // a stableEnterRoom function, which we pass down to the real "Inner"
  // RoomProvider level.
  //
  // The purpose is to ensure that if `stableEnterRoom("my-room")` is called
  // multiple times for the same room ID, it will always return the exact same
  // (cached) value, so that in total only a single "leave" function gets
  // produced and registered in the client.
  //
  // If we didn't use this cache, then in React StrictMode
  // stableEnterRoom("my-room") might get called multiple (at least 4) times,
  // causing more leave functions to be produced in the client, some of which
  // we cannot get a hold on (because StrictMode would discard those results by
  // design). This would make it appear to the Client that the Room is still in
  // use by some party that hasn't called `leave()` on it yet, thus causing the
  // Room to not be freed and destroyed when the component unmounts later.
  //
  return <RoomProviderInner {...props} stableEnterRoom={stableEnterRoom} />;
}

/** @internal */
function RoomProviderInner<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
>(
  props: RoomProviderProps<P, S> & {
    stableEnterRoom: (
      roomId: string,
      options: EnterOptions<P, S>
    ) => RoomLeavePair<P, S, U, E>;
  }
) {
  const client = useClient();
  const { id: roomId, stableEnterRoom } = props;

  if (process.env.NODE_ENV !== "production") {
    if (!roomId) {
      throw new Error(
        "RoomProvider id property is required. For more information: https://liveblocks.io/docs/errors/liveblocks-react/RoomProvider-id-property-is-required"
      );
    }

    if (typeof roomId !== "string") {
      throw new Error("RoomProvider id property should be a string.");
    }

    const majorReactVersion = parseInt(React.version) || 1;
    const oldReactVersion = majorReactVersion < 18;
    errorIf(
      oldReactVersion && props.unstable_batchedUpdates === undefined,
      missing_unstable_batchedUpdates(majorReactVersion, roomId)
    );
    deprecateIf(
      !oldReactVersion && props.unstable_batchedUpdates !== undefined,
      superfluous_unstable_batchedUpdates
    );
  }

  // Note: We'll hold on to the initial value given here, and ignore any
  // changes to this argument in subsequent renders
  const frozenProps = useInitial({
    initialPresence: props.initialPresence,
    initialStorage: props.initialStorage,
    unstable_batchedUpdates: props.unstable_batchedUpdates,
    autoConnect:
      props.autoConnect ??
      props.shouldInitiallyConnect ??
      typeof window !== "undefined",
  });

  const [{ room }, setRoomLeavePair] = React.useState(() =>
    stableEnterRoom(roomId, {
      ...frozenProps,
      autoConnect: false, // Deliberately using false here on the first render, see below
    })
  );

  React.useEffect(() => {
    const { store } = getExtrasForClient(client);

    async function handleCommentEvent(message: CommentsEventServerMsg) {
      // TODO: Error handling
      const info = await room[kInternal].comments.getThread({
        threadId: message.threadId,
      });

      // If no thread info was returned (i.e., 404), we remove the thread and relevant inbox notifications from local cache.
      if (!info) {
        store.deleteThread(message.threadId);
        return;
      }
      const { thread, inboxNotification } = info;

      const existingThread = store.get().threads[message.threadId];

      switch (message.type) {
        case ServerMsgCode.COMMENT_EDITED:
        case ServerMsgCode.THREAD_METADATA_UPDATED:
        case ServerMsgCode.COMMENT_REACTION_ADDED:
        case ServerMsgCode.COMMENT_REACTION_REMOVED:
        case ServerMsgCode.COMMENT_DELETED:
          // If the thread doesn't exist in the local cache, we do not update it with the server data as an optimistic update could have deleted the thread locally.
          if (!existingThread) break;

          store.updateThreadAndNotification(thread, inboxNotification);
          break;
        case ServerMsgCode.COMMENT_CREATED:
          store.updateThreadAndNotification(thread, inboxNotification);
          break;
        default:
          break;
      }
    }

    return room.events.comments.subscribe(
      (message) => void handleCommentEvent(message)
    );
  }, [client, room]);

  React.useEffect(() => {
    const { getThreadsUpdates } = getExtrasForClient(client);
    // Retrieve threads that have been updated/deleted since the last time the room requested threads updates
    void getThreadsUpdates(room.id);
  }, [client, room.id]);

  /**
   * Subscribe to the 'online' event to fetch threads/notifications updates when the browser goes back online.
   */
  React.useEffect(() => {
    function handleIsOnline() {
      const { getThreadsUpdates } = getExtrasForClient(client);
      void getThreadsUpdates(room.id);
    }

    window.addEventListener("online", handleIsOnline);
    return () => {
      window.removeEventListener("online", handleIsOnline);
    };
  }, [client, room.id]);

  React.useEffect(() => {
    const pair = stableEnterRoom(roomId, frozenProps);

    setRoomLeavePair(pair);
    const { room, leave } = pair;

    // In React, it's important to start connecting to the room as an effect,
    // rather than doing this during the initial render. This means that
    // during the initial render (both on the server-side, and on the first
    // hydration on the client-side), the value of the `useStatus()` hook
    // will correctly be "initial", and transition to "connecting" as an
    // effect.
    if (frozenProps.autoConnect) {
      room.connect();
    }

    return () => {
      leave();
    };
  }, [roomId, frozenProps, stableEnterRoom]);

  return (
    <RoomContext.Provider value={room}>{props.children}</RoomContext.Provider>
  );
}

function useRoom<
  P extends JsonObject = never,
  S extends LsonObject = never,
  U extends BaseUserMeta = never,
  E extends Json = never,
>(): Room<P, S, U, E> {
  const room = React.useContext(RoomContext);
  if (room === null) {
    throw new Error("RoomProvider is missing from the React tree.");
  }
  return room as Room<P, S, U, E>;
}

function useStatus(): Status {
  const room = useRoom();
  const subscribe = room.events.status.subscribe;
  const getSnapshot = room.getStatus;
  const getServerSnapshot = room.getStatus;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useBatch<T>(): (callback: () => T) => T {
  return useRoom().batch;
}

function useBroadcastEvent<E extends Json>(): (
  event: E,
  options?: BroadcastOptions
) => void {
  const room = useRoom<never, never, never, E>();
  return React.useCallback(
    (
      event: E,
      options: BroadcastOptions = { shouldQueueEventIfNotReady: false }
    ) => {
      room.broadcastEvent(event, options);
    },
    [room]
  );
}

function useOthersListener<P extends JsonObject, U extends BaseUserMeta>(
  callback: (event: OthersEvent<P, U>) => void
) {
  const room = useRoom<P, never, U, never>();
  const savedCallback = useLatest(callback);
  React.useEffect(
    () => room.events.others.subscribe((event) => savedCallback.current(event)),
    [room, savedCallback]
  );
}

function useLostConnectionListener(
  callback: (event: LostConnectionEvent) => void
): void {
  const room = useRoom();
  const savedCallback = useLatest(callback);
  React.useEffect(
    () =>
      room.events.lostConnection.subscribe((event) =>
        savedCallback.current(event)
      ),
    [room, savedCallback]
  );
}

function useErrorListener(callback: (err: LiveblocksError) => void): void {
  const room = useRoom();
  const savedCallback = useLatest(callback);
  React.useEffect(
    () => room.events.error.subscribe((e) => savedCallback.current(e)),
    [room, savedCallback]
  );
}

function useEventListener<
  P extends JsonObject,
  U extends BaseUserMeta,
  E extends Json,
>(callback: (data: RoomEventMessage<P, U, E>) => void): void {
  const room = useRoom<P, never, U, E>();
  const savedCallback = useLatest(callback);
  React.useEffect(() => {
    const listener = (eventData: RoomEventMessage<P, U, E>) => {
      savedCallback.current(eventData);
    };

    return room.events.customEvent.subscribe(listener);
  }, [room, savedCallback]);
}

function useHistory(): History {
  return useRoom().history;
}

function useUndo(): () => void {
  return useHistory().undo;
}

function useRedo(): () => void {
  return useHistory().redo;
}

function useCanUndo(): boolean {
  const room = useRoom();
  const subscribe = room.events.history.subscribe;
  const canUndo = room.history.canUndo;
  return useSyncExternalStore(subscribe, canUndo, canUndo);
}

function useCanRedo(): boolean {
  const room = useRoom();
  const subscribe = room.events.history.subscribe;
  const canRedo = room.history.canRedo;
  return useSyncExternalStore(subscribe, canRedo, canRedo);
}

function useSelf<P extends JsonObject, U extends BaseUserMeta>(): User<
  P,
  U
> | null;
function useSelf<T, P extends JsonObject, U extends BaseUserMeta>(
  selector: (me: User<P, U>) => T,
  isEqual?: (prev: T | null, curr: T | null) => boolean
): T | null;
function useSelf<T, P extends JsonObject, U extends BaseUserMeta>(
  maybeSelector?: (me: User<P, U>) => T,
  isEqual?: (prev: T | null, curr: T | null) => boolean
): T | User<P, U> | null {
  type Snapshot = User<P, U> | null;
  type Selection = T | null;

  const room = useRoom<P, never, U, never>();
  const subscribe = room.events.self.subscribe;
  const getSnapshot: () => Snapshot = room.getSelf;

  const selector = maybeSelector ?? (identity as (me: User<P, U>) => T);
  const wrappedSelector = React.useCallback(
    (me: Snapshot): Selection => (me !== null ? selector(me) : null),
    [selector]
  );

  const getServerSnapshot = alwaysNull;

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getServerSnapshot,
    wrappedSelector,
    isEqual
  );
}

function useCurrentUserId() {
  return useSelf((user) => (typeof user.id === "string" ? user.id : null));
}

function useMyPresence<P extends JsonObject>(): [
  P,
  (patch: Partial<P>, options?: { addToHistory: boolean }) => void,
] {
  const room = useRoom<P, never, never, never>();
  const subscribe = room.events.myPresence.subscribe;
  const getSnapshot = room.getPresence;
  const presence = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setPresence = room.updatePresence;
  return [presence, setPresence];
}

function useUpdateMyPresence<P extends JsonObject>(): (
  patch: Partial<P>,
  options?: { addToHistory: boolean }
) => void {
  return useRoom<P, never, never, never>().updatePresence;
}

function useOthers<
  P extends JsonObject,
  U extends BaseUserMeta,
>(): readonly User<P, U>[];
function useOthers<T, P extends JsonObject, U extends BaseUserMeta>(
  selector: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function useOthers<T, P extends JsonObject, U extends BaseUserMeta>(
  selector?: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | readonly User<P, U>[] {
  const room = useRoom<P, never, U, never>();
  const subscribe = room.events.others.subscribe;
  const getSnapshot = room.getOthers;
  const getServerSnapshot = alwaysEmptyList;
  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getServerSnapshot,
    selector ?? (identity as (others: readonly User<P, U>[]) => T),
    isEqual
  );
}

function make_useOthersMapped<P extends JsonObject, U extends BaseUserMeta>() {
  return function useOthersMapped<T>(
    itemSelector: (other: User<P, U>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): ReadonlyArray<readonly [connectionId: number, data: T]> {
    const wrappedSelector = React.useCallback(
      (others: readonly User<P, U>[]) =>
        others.map(
          (other) => [other.connectionId, itemSelector(other)] as const
        ),
      [itemSelector]
    );

    const wrappedIsEqual = React.useCallback(
      (
        a: ReadonlyArray<readonly [connectionId: number, data: T]>,
        b: ReadonlyArray<readonly [connectionId: number, data: T]>
      ): boolean => {
        const eq = itemIsEqual ?? Object.is;
        return (
          a.length === b.length &&
          a.every((atuple, index) => {
            // We know btuple always exist because we checked the array length on the previous line
            const btuple = b[index];
            return atuple[0] === btuple[0] && eq(atuple[1], btuple[1]);
          })
        );
      },
      [itemIsEqual]
    );

    return useOthers(wrappedSelector, wrappedIsEqual);
  };
}

function useOthersConnectionIds(): readonly number[] {
  return useOthers(selectorFor_useOthersConnectionIds, shallow);
}

const NOT_FOUND = Symbol();

type NotFound = typeof NOT_FOUND;

function make_useOther<P extends JsonObject, U extends BaseUserMeta>() {
  return function useOther<T>(
    connectionId: number,
    selector: (other: User<P, U>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    const wrappedSelector = React.useCallback(
      (others: readonly User<P, U>[]) => {
        // TODO: Make this O(1) instead of O(n)?
        const other = others.find(
          (other) => other.connectionId === connectionId
        );
        return other !== undefined ? selector(other) : NOT_FOUND;
      },
      [connectionId, selector]
    );

    const wrappedIsEqual = React.useCallback(
      (prev: T | NotFound, curr: T | NotFound): boolean => {
        if (prev === NOT_FOUND || curr === NOT_FOUND) {
          return prev === curr;
        }

        const eq = isEqual ?? Object.is;
        return eq(prev, curr);
      },
      [isEqual]
    );

    const other = useOthers(wrappedSelector, wrappedIsEqual);
    if (other === NOT_FOUND) {
      throw new Error(
        `No such other user with connection id ${connectionId} exists`
      );
    }

    return other;
  };
}

/** @internal */
function useMutableStorageRoot<S extends LsonObject>(): LiveObject<S> | null {
  const room = useRoom<never, S, never, never>();
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageSnapshot;
  const getServerSnapshot = alwaysNull;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// NOTE: This API exists for backward compatible reasons
function useStorageRoot<S extends LsonObject>(): [root: LiveObject<S> | null] {
  return [useMutableStorageRoot<S>()];
}

function make_useStorage<S extends LsonObject>() {
  return function useStorage<T>(
    selector: (root: ToImmutable<S>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | null {
    type Snapshot = ToImmutable<S> | null;
    type Selection = T | null;

    const room = useRoom<never, S, never, never>();
    const rootOrNull = useMutableStorageRoot<S>();

    const wrappedSelector = React.useCallback(
      (rootOrNull: Snapshot): Selection =>
        rootOrNull !== null ? selector(rootOrNull) : null,
      [selector]
    );

    const subscribe = React.useCallback(
      (onStoreChange: () => void) =>
        rootOrNull !== null
          ? room.subscribe(rootOrNull, onStoreChange, { isDeep: true })
          : noop,
      [room, rootOrNull]
    );

    const getSnapshot = React.useCallback((): Snapshot => {
      if (rootOrNull === null) {
        return null;
      } else {
        const root = rootOrNull;
        const imm = root.toImmutable();
        return imm;
      }
    }, [rootOrNull]);

    const getServerSnapshot = alwaysNull;

    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      wrappedSelector,
      isEqual
    );
  };
}

function useLegacyKey<
  TKey extends Extract<keyof S, string>,
  S extends LsonObject,
>(key: TKey): S[TKey] | null {
  const room = useRoom<never, S, never, never>();
  const rootOrNull = useMutableStorageRoot<S>();
  const rerender = useRerender();

  React.useEffect(() => {
    if (rootOrNull === null) {
      return;
    }
    const root = rootOrNull;

    let unsubCurr: (() => void) | undefined;
    let curr = root.get(key);

    function subscribeToCurr() {
      unsubCurr = isLiveNode(curr) ? room.subscribe(curr, rerender) : undefined;
    }

    function onRootChange() {
      const newValue = root.get(key);
      if (newValue !== curr) {
        unsubCurr?.();
        curr = newValue;
        subscribeToCurr();
        rerender();
      }
    }

    subscribeToCurr();
    rerender();

    const unsubscribeRoot = room.subscribe(root, onRootChange);
    return () => {
      unsubscribeRoot();
      unsubCurr?.();
    };
  }, [rootOrNull, room, key, rerender]);

  if (rootOrNull === null) {
    return null;
  } else {
    return rootOrNull.get(key);
  }
}

function make_useMutation<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
>() {
  return function useMutation<
    F extends (context: MutationContext<P, S, U>, ...args: any[]) => any,
  >(callback: F, deps: readonly unknown[]): OmitFirstArg<F> {
    const room = useRoom<P, S, U, E>();
    return React.useMemo(
      () => {
        return ((...args) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          room.batch(() =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            callback(
              makeMutationContext<P, S, U, E>(room),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              ...args
            )
          )) as OmitFirstArg<F>;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [room, ...deps]
    );
  };
}

function useThreads<M extends BaseMetadata>(
  options: UseThreadsOptions<M> = {
    query: { metadata: {} },
  }
): ThreadsState<M> {
  const { scrollOnLoad = true } = options;
  const client = useClient();
  const room = useRoom();
  const queryKey = React.useMemo(
    () => generateQueryKey(room.id, options.query),
    [room, options]
  );

  const { store, getThreadsAndInboxNotifications, incrementQuerySubscribers } =
    getExtrasForClient<M>(client);

  React.useEffect(() => {
    void getThreadsAndInboxNotifications(room, queryKey, options);
    return incrementQuerySubscribers(queryKey);
  }, [room, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selector = React.useCallback(
    (state: CacheState<M>): ThreadsState<M> => {
      const query = state.queries[queryKey];
      if (query === undefined || query.isLoading) {
        return {
          isLoading: true,
        };
      }

      return {
        threads: selectedThreads(room.id, state, options),
        isLoading: false,
        error: query.error,
      };
    },
    [room, queryKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const state = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );

  useScrollToCommentOnLoadEffect(scrollOnLoad, state);

  return state;
}

function useCreateThread<M extends BaseMetadata>() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (options: CreateThreadOptions<M>): ThreadData<M> => {
      const body = options.body;
      const metadata: M = "metadata" in options ? options.metadata : ({} as M);

      const threadId = createThreadId();
      const commentId = createCommentId();
      const createdAt = new Date();

      const newComment: CommentData = {
        id: commentId,
        threadId,
        roomId: room.id,
        createdAt,
        type: "comment",
        userId: getCurrentUserId(room),
        body,
        reactions: [],
      };
      const newThread: ThreadData<M> = {
        id: threadId,
        type: "thread",
        createdAt,
        updatedAt: createdAt,
        roomId: room.id,
        metadata: metadata as ThreadData<M>["metadata"],
        comments: [newComment],
      };

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "create-thread",
        thread: newThread,
        id: optimisticUpdateId,
      });

      const commentsAPI = (room[kInternal] as PrivateRoomApi<M>).comments;
      commentsAPI.createThread({ threadId, commentId, body, metadata }).then(
        (thread) => {
          store.set((state) => ({
            ...state,
            threads: {
              ...state.threads,
              [threadId]: thread,
            },
            optimisticUpdates: state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            ),
          }));
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (err) =>
              new CreateThreadError(err, {
                roomId: room.id,
                threadId,
                commentId,
                body,
                metadata,
              })
          )
      );

      return newThread;
    },
    [client, room]
  );
}

function useEditThreadMetadata<M extends BaseMetadata>() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (options: EditThreadMetadataOptions<M>): void => {
      if (!("metadata" in options)) {
        return;
      }

      const threadId = options.threadId;
      const metadata = options.metadata;
      const updatedAt = new Date();

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "edit-thread-metadata",
        metadata,
        id: optimisticUpdateId,
        threadId,
        updatedAt,
      });

      const commentsAPI = (room[kInternal] as PrivateRoomApi<M>).comments;
      commentsAPI.editThreadMetadata({ metadata, threadId }).then(
        (metadata) => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            // If the thread doesn't exist in the cache, we do not update the metadata
            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            // If the thread has been deleted, we do not update the metadata
            if (existingThread.deletedAt !== undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            if (
              existingThread.updatedAt &&
              existingThread.updatedAt > updatedAt
            ) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            return {
              ...state,
              threads: {
                ...state.threads,
                [threadId]: {
                  ...existingThread,
                  metadata: metadata as [M] extends [never]
                    ? Record<string, never>
                    : M,
                },
              },
              optimisticUpdates: updatedOptimisticUpdates,
            };
          });
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (error) =>
              new EditThreadMetadataError(error, {
                roomId: room.id,
                threadId,
                metadata,
              })
          )
      );
    },
    [client, room]
  );
}

function useCreateComment(): (options: CreateCommentOptions) => CommentData {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    ({ threadId, body }: CreateCommentOptions): CommentData => {
      const commentId = createCommentId();
      const createdAt = new Date();

      const comment: CommentData = {
        id: commentId,
        threadId,
        roomId: room.id,
        type: "comment",
        createdAt,
        userId: getCurrentUserId(room),
        body,
        reactions: [],
      };

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "create-comment",
        comment,
        id: optimisticUpdateId,
      });

      room[kInternal].comments
        .createComment({ threadId, commentId, body })
        .then(
          (newComment) => {
            store.set((state) => {
              const existingThread = state.threads[threadId];
              const updatedOptimisticUpdates = state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              );

              if (existingThread === undefined) {
                return {
                  ...state,
                  optimisticUpdates: updatedOptimisticUpdates,
                };
              }

              const inboxNotification = Object.values(
                state.inboxNotifications
              ).find(
                (notification) =>
                  notification.kind === "thread" &&
                  notification.threadId === threadId
              );

              // If the thread has an inbox notification associated with it, we update the notification's `notifiedAt` and `readAt` values
              const updatedInboxNotifications =
                inboxNotification !== undefined
                  ? {
                      ...state.inboxNotifications,
                      [inboxNotification.id]: {
                        ...inboxNotification,
                        notifiedAt: newComment.createdAt,
                        readAt: newComment.createdAt,
                      },
                    }
                  : state.inboxNotifications;

              return {
                ...state,
                threads: {
                  ...state.threads,
                  [threadId]: upsertComment(existingThread, newComment), // Upsert the new comment into the thread comments list (if applicable)
                },
                inboxNotifications: updatedInboxNotifications,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            });
          },
          (err: Error) =>
            onMutationFailure(
              err,
              optimisticUpdateId,
              (err) =>
                new CreateCommentError(err, {
                  roomId: room.id,
                  threadId,
                  commentId,
                  body,
                })
            )
        );

      return comment;
    },
    [client, room]
  );
}

function useEditComment(): (options: EditCommentOptions) => void {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    ({ threadId, commentId, body }: EditCommentOptions): void => {
      const editedAt = new Date();
      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      const thread = store.get().threads[threadId];
      if (thread === undefined) {
        console.warn(
          `Internal unexpected behavior. Cannot edit comment in thread "${threadId}" because the thread does not exist in the cache.`
        );
        return;
      }

      const comment = thread.comments.find(
        (comment) => comment.id === commentId
      );

      if (comment === undefined || comment.deletedAt !== undefined) {
        console.warn(
          `Internal unexpected behavior. Cannot edit comment "${commentId}" in thread "${threadId}" because the comment does not exist in the cache.`
        );
        return;
      }

      store.pushOptimisticUpdate({
        type: "edit-comment",
        comment: {
          ...comment,
          editedAt,
          body,
        },
        id: optimisticUpdateId,
      });

      room[kInternal].comments.editComment({ threadId, commentId, body }).then(
        (editedComment) => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            return {
              ...state,
              threads: {
                ...state.threads,
                [threadId]: upsertComment(existingThread, editedComment), // Upsert the edited comment into the thread comments list (if applicable)
              },
              optimisticUpdates: updatedOptimisticUpdates,
            };
          });
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (error) =>
              new EditCommentError(error, {
                roomId: room.id,
                threadId,
                commentId,
                body,
              })
          )
      );
    },
    [client, room]
  );
}

function useDeleteComment() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    ({ threadId, commentId }: DeleteCommentOptions): void => {
      const deletedAt = new Date();

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "delete-comment",
        threadId,
        commentId,
        deletedAt,
        id: optimisticUpdateId,
      });

      room[kInternal].comments.deleteComment({ threadId, commentId }).then(
        () => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            // If thread does not exist, we return the existing state
            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            return {
              ...state,
              threads: {
                ...state.threads,
                [threadId]: deleteComment(existingThread, commentId, deletedAt),
              },
              optimisticUpdates: updatedOptimisticUpdates,
            };
          });
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (error) =>
              new DeleteCommentError(error, {
                roomId: room.id,
                threadId,
                commentId,
              })
          )
      );
    },
    [client, room]
  );
}

function useAddReaction<M extends BaseMetadata>() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
      const createdAt = new Date();
      const userId = getCurrentUserId(room);

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient<M>(client);
      store.pushOptimisticUpdate({
        type: "add-reaction",
        threadId,
        commentId,
        reaction: {
          emoji,
          userId,
          createdAt,
        },
        id: optimisticUpdateId,
      });

      room[kInternal].comments.addReaction({ threadId, commentId, emoji }).then(
        (addedReaction) => {
          store.set((state): CacheState<M> => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            // If the thread doesn't exist in the cache, we do not update the metadata
            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            return {
              ...state,
              threads: {
                ...state.threads,
                [threadId]: addReaction(
                  existingThread,
                  commentId,
                  addedReaction
                ),
              },
              optimisticUpdates: updatedOptimisticUpdates,
            };
          });
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (error) =>
              new AddReactionError(error, {
                roomId: room.id,
                threadId,
                commentId,
                emoji,
              })
          )
      );
    },
    [client, room]
  );
}

function useRemoveReaction() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
      const userId = getCurrentUserId(room);

      const removedAt = new Date();
      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "remove-reaction",
        threadId,
        commentId,
        emoji,
        userId,
        removedAt,
        id: optimisticUpdateId,
      });

      room[kInternal].comments
        .removeReaction({ threadId, commentId, emoji })
        .then(
          () => {
            store.set((state) => {
              const existingThread = state.threads[threadId];
              const updatedOptimisticUpdates = state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              );

              // If the thread doesn't exist in the cache, we do not update the metadata
              if (existingThread === undefined) {
                return {
                  ...state,
                  optimisticUpdates: updatedOptimisticUpdates,
                };
              }

              return {
                ...state,
                threads: {
                  ...state.threads,
                  [threadId]: removeReaction(
                    existingThread,
                    commentId,
                    emoji,
                    userId,
                    removedAt
                  ),
                },
                optimisticUpdates: updatedOptimisticUpdates,
              };
            });
          },
          (err: Error) =>
            onMutationFailure(
              err,
              optimisticUpdateId,
              (error) =>
                new RemoveReactionError(error, {
                  roomId: room.id,
                  threadId,
                  commentId,
                  emoji,
                })
            )
        );
    },
    [client, room]
  );
}

function useMarkThreadAsRead() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (threadId: string) => {
      const { store, onMutationFailure } = getExtrasForClient(client);
      const inboxNotification = Object.values(
        store.get().inboxNotifications
      ).find(
        (inboxNotification) =>
          inboxNotification.kind === "thread" &&
          inboxNotification.threadId === threadId
      );

      if (!inboxNotification) return;

      const optimisticUpdateId = nanoid();
      const now = new Date();

      store.pushOptimisticUpdate({
        type: "mark-inbox-notification-as-read",
        id: optimisticUpdateId,
        inboxNotificationId: inboxNotification.id,
        readAt: now,
      });

      room[kInternal].notifications
        .markInboxNotificationAsRead(inboxNotification.id)
        .then(
          () => {
            store.set((state) => ({
              ...state,
              inboxNotifications: {
                ...state.inboxNotifications,
                [inboxNotification.id]: {
                  ...inboxNotification,
                  readAt: now,
                },
              },
              optimisticUpdates: state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              ),
            }));
          },
          (err: Error) => {
            onMutationFailure(
              err,
              optimisticUpdateId,
              (error) =>
                new MarkInboxNotificationAsReadError(error, {
                  inboxNotificationId: inboxNotification.id,
                })
            );
            return;
          }
        );
    },
    [client, room]
  );
}

function useThreadSubscription(threadId: string): ThreadSubscription {
  const client = useClient();
  const { store } = getExtrasForClient(client);

  const selector = React.useCallback(
    (state: CacheState<BaseMetadata>): ThreadSubscription => {
      const inboxNotification = selectedInboxNotifications(state).find(
        (inboxNotification) =>
          inboxNotification.kind === "thread" &&
          inboxNotification.threadId === threadId
      );

      const thread = state.threads[threadId];

      if (inboxNotification === undefined || thread === undefined) {
        return {
          status: "not-subscribed",
        };
      }

      return {
        status: "subscribed",
        unreadSince: inboxNotification.readAt,
      };
    },
    [threadId]
  );

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );
}

function useRoomNotificationSettings(): [
  RoomNotificationSettingsState,
  (settings: Partial<RoomNotificationSettings>) => void,
] {
  const client = useClient();
  const room = useRoom();
  const { store } = getExtrasForClient(client);

  React.useEffect(() => {
    const { getInboxNotificationSettings } = getExtrasForClient(client);
    const queryKey = makeNotificationSettingsQueryKey(room.id);
    void getInboxNotificationSettings(room, queryKey);
  }, [client, room]);

  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();

  const selector = React.useCallback(
    (state: CacheState<BaseMetadata>): RoomNotificationSettingsState => {
      const query = state.queries[makeNotificationSettingsQueryKey(room.id)];

      if (query === undefined || query.isLoading) {
        return { isLoading: true };
      }

      if (query.error !== undefined) {
        return { isLoading: false, error: query.error };
      }

      return {
        isLoading: false,
        settings: selectNotificationSettings(room.id, state),
      };
    },
    [room]
  );

  const settings = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );

  return React.useMemo(() => {
    return [settings, updateRoomNotificationSettings];
  }, [settings, updateRoomNotificationSettings]);
}

function useUpdateRoomNotificationSettings() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (settings: Partial<RoomNotificationSettings>) => {
      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        id: optimisticUpdateId,
        type: "update-notification-settings",
        roomId: room.id,
        settings,
      });

      room[kInternal].notifications
        .updateRoomNotificationSettings(settings)
        .then(
          (settings) => {
            store.set((state) => ({
              ...state,
              notificationSettings: {
                [room.id]: settings,
              },
              optimisticUpdates: state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              ),
            }));
          },
          (err: Error) =>
            onMutationFailure(
              err,
              optimisticUpdateId,
              (error) =>
                new UpdateNotificationSettingsError(error, {
                  roomId: room.id,
                })
            )
        );
    },
    [client, room]
  );
}

function ensureNotServerSide(): void {
  // Error early if suspense is used in a server-side context
  if (typeof window === "undefined") {
    throw new Error(
      "You cannot use the Suspense version of this hook on the server side. Make sure to only call them on the client side.\nFor tips, see https://liveblocks.io/docs/api-reference/liveblocks-react#suspense-avoid-ssr"
    );
  }
}

function useSuspendUntilPresenceLoaded(): void {
  const room = useRoom();
  if (room.getSelf() !== null) {
    return;
  }

  ensureNotServerSide();

  // Throw a _promise_. Suspense will suspend the component tree until either
  // until either a presence update event, or a connection status change has
  // happened. After that, it will render this component tree again and
  // re-evaluate the .getSelf() condition above, or re-suspend again until
  // such event happens.
  throw new Promise<void>((res) => {
    room.events.self.subscribeOnce(() => res());
    room.events.status.subscribeOnce(() => res());
  });
}

function useSelfSuspense<P extends JsonObject, U extends BaseUserMeta>(): User<
  P,
  U
>;
function useSelfSuspense<T, P extends JsonObject, U extends BaseUserMeta>(
  selector: (me: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function useSelfSuspense<T, P extends JsonObject, U extends BaseUserMeta>(
  selector?: (me: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | User<P, U> {
  useSuspendUntilPresenceLoaded();
  return useSelf(
    selector as (me: User<P, U>) => T,
    isEqual as (prev: T | null, curr: T | null) => boolean
  ) as T | User<P, U>;
}

function make_useOthersSuspense<
  P extends JsonObject,
  U extends BaseUserMeta,
>() {
  return function useOthersSuspense<T>(
    selector?: (others: readonly User<P, U>[]) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | readonly User<P, U>[] {
    useSuspendUntilPresenceLoaded();
    return useOthers(
      selector as (others: readonly User<P, U>[]) => T,
      isEqual as (prev: T, curr: T) => boolean
    ) as T | readonly User<P, U>[];
  };
}

function useOthersConnectionIdsSuspense(): readonly number[] {
  useSuspendUntilPresenceLoaded();
  return useOthersConnectionIds();
}

function make_useOthersMappedSuspense<
  P extends JsonObject,
  U extends BaseUserMeta,
>() {
  const useOthersMapped = make_useOthersMapped<P, U>();
  return function <T>(
    itemSelector: (other: User<P, U>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): ReadonlyArray<readonly [connectionId: number, data: T]> {
    useSuspendUntilPresenceLoaded();
    return useOthersMapped(itemSelector, itemIsEqual);
  };
}

function make_useOtherSuspense<P extends JsonObject, U extends BaseUserMeta>() {
  const useOther = make_useOther<P, U>();
  return function useOtherSuspense<T>(
    connectionId: number,
    selector: (other: User<P, U>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    useSuspendUntilPresenceLoaded();
    return useOther(connectionId, selector, isEqual);
  };
}

function useSuspendUntilStorageLoaded(): void {
  const room = useRoom();
  if (room.getStorageSnapshot() !== null) {
    return;
  }

  ensureNotServerSide();

  // Throw a _promise_. Suspense will suspend the component tree until this
  // promise resolves (aka until storage has loaded). After that, it will
  // render this component tree again.
  throw new Promise<void>((res) => {
    room.events.storageDidLoad.subscribeOnce(() => res());
  });
}

function make_useStorageSuspense<S extends LsonObject>() {
  const useStorage = make_useStorage<S>();
  return function useStorageSuspense<T>(
    selector: (root: ToImmutable<S>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    useSuspendUntilStorageLoaded();
    return useStorage(
      selector,
      isEqual as (prev: T | null, curr: T | null) => boolean
    ) as T;
  };
}

function useLegacyKeySuspense<
  TKey extends Extract<keyof S, string>,
  S extends LsonObject,
>(key: TKey): S[TKey] {
  useSuspendUntilStorageLoaded();
  return useLegacyKey(key) as S[TKey];
}

function useThreadsSuspense<M extends BaseMetadata>(
  options: UseThreadsOptions<M> = {
    query: { metadata: {} },
  }
): ThreadsStateSuccess<M> {
  const { scrollOnLoad = true } = options;

  const client = useClient();
  const room = useRoom();
  const queryKey = React.useMemo(
    () => generateQueryKey(room.id, options.query),
    [room, options]
  );

  const { store, getThreadsAndInboxNotifications } =
    getExtrasForClient<M>(client);

  const query = store.get().queries[queryKey];

  if (query === undefined || query.isLoading) {
    throw getThreadsAndInboxNotifications(room, queryKey, options);
  }

  if (query.error) {
    throw query.error;
  }

  const selector = React.useCallback(
    (state: CacheState<M>): ThreadsStateSuccess<M> => {
      return {
        threads: selectedThreads(room.id, state, options),
        isLoading: false,
      };
    },
    [room, queryKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  React.useEffect(() => {
    const { incrementQuerySubscribers } = getExtrasForClient(client);
    return incrementQuerySubscribers(queryKey);
  }, [client, queryKey]);

  const state = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );

  useScrollToCommentOnLoadEffect(scrollOnLoad, state);

  return state;
}

function useRoomNotificationSettingsSuspense(): [
  RoomNotificationSettingsStateSuccess,
  (settings: Partial<RoomNotificationSettings>) => void,
] {
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();
  const client = useClient();
  const room = useRoom();
  const queryKey = makeNotificationSettingsQueryKey(room.id);

  const { store, getInboxNotificationSettings } = getExtrasForClient(client);
  const query = store.get().queries[queryKey];

  if (query === undefined || query.isLoading) {
    throw getInboxNotificationSettings(room, queryKey);
  }

  if (query.error) {
    throw query.error;
  }

  const selector = React.useCallback(
    (state: CacheState<BaseMetadata>): RoomNotificationSettingsStateSuccess => {
      return {
        isLoading: false,
        settings: selectNotificationSettings(room.id, state),
      };
    },
    [room]
  );

  const settings = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    selector
  );

  return React.useMemo(() => {
    return [settings, updateRoomNotificationSettings];
  }, [settings, updateRoomNotificationSettings]);
}

function useRoomOrNull() {
  return React.useContext(RoomContext);
}

/**
 * @private
 *
 * This is an internal API, use `createRoomContext` instead.
 */
export function useRoomContextBundleOrNull() {
  const client = useClientOrNull();
  const room = useRoomOrNull();
  return client && room ? getOrCreateRoomContextBundle(client) : null;
}

/**
 * @private
 *
 * This is an internal API, use `createRoomContext` instead.
 */
export function useRoomContextBundle() {
  const client = useClient();
  return getOrCreateRoomContextBundle(client);
}

type Options<U extends BaseUserMeta> = {
  /**
   * @deprecated Define 'resolveUsers' in 'createClient' from '@liveblocks/client' instead.
   * Please refer to our Upgrade Guide to learn more, see https://liveblocks.io/docs/platform/upgrading/1.10.
   *
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;

  /**
   * @deprecated Define 'resolveMentionSuggestions' in 'createClient' from '@liveblocks/client' instead.
   * Please refer to our Upgrade Guide to learn more, see https://liveblocks.io/docs/platform/upgrading/1.10.
   *
   * A function that returns a list of user IDs matching a string.
   */
  resolveMentionSuggestions?: (
    args: ResolveMentionSuggestionsArgs
  ) => OptionalPromise<string[]>;
};

export function createRoomContext<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = never, // TODO Change this to DE for 2.0
  M extends BaseMetadata = never, // TODO Change this to DM for 2.0
>(
  client: OpaqueClient,
  options?: Options<U>
): RoomContextBundle<P, S, U, E, M> {
  // Deprecated option
  if (options?.resolveUsers) {
    throw new Error(
      "The 'resolveUsers' option has moved to 'createClient' from '@liveblocks/client'. Please refer to our Upgrade Guide to learn more, see https://liveblocks.io/docs/platform/upgrading/1.10."
    );
  }

  // Deprecated option
  if (options?.resolveMentionSuggestions) {
    throw new Error(
      "The 'resolveMentionSuggestions' option has moved to 'createClient' from '@liveblocks/client'. Please refer to our Upgrade Guide to learn more, see https://liveblocks.io/docs/platform/upgrading/1.10."
    );
  }

  return getOrCreateRoomContextBundle<P, S, U, E, M>(client);
}

export function generateQueryKey(
  roomId: string,
  options: UseThreadsOptions<BaseMetadata>["query"]
) {
  return `${roomId}-${stringify(options ?? {})}`;
}

// TODO in 2.0 Copy/paste all the docstrings onto these global hooks :(
// const __1 = useBatch;
// const __2 = useBroadcastEvent<DE>;
// const __3 = useOthersListener<DP, DU>;
// const __4 = useRoom<DP, DS, DU, DE>;
// const __5 = useStatus;
// const __6 = useAddReaction<DM>;
// const __7 = make_useMutation<DP, DS, DU, DE>();
// const __8 = useCreateThread<DM>;
// const __9 = useEditThreadMetadata<DM>;
// const _10 = useEventListener<DP, DU, DE>;
// const _11 = useMyPresence<DP>;
// const _12 = useOthersConnectionIds;
// const _13 = useOthersConnectionIdsSuspense;
// const _14 = make_useOthersMapped<DP, DU>();
// const _15 = make_useOthersMappedSuspense<DP, DU>();
// const _16 = useThreads<DM>;
// const _17 = useThreadsSuspense<DM>;
// const _18 = make_useOther<DP, DU>();
// const _19 = useOthers<DP, DU>;
// const _20 = make_useOtherSuspense<DP, DU>();
// const _21 = make_useOthersSuspense<DP, DU>();
// const _22 = make_useStorage<DS>();
// const _23 = make_useStorageSuspense<DS>();
// const _24 = useSelf<DP, DU>;
// const _25 = useSelfSuspense<DP, DU>;
// const _26 = useStorageRoot<DS>;
// const _27 = useUpdateMyPresence<DP>;
//
// export {
//   __1 as useBatch,
//   __2 as useBroadcastEvent,
//   __3 as useOthersListener,
//   __4 as useRoom,
//   __5 as useStatus,
//   __6 as useAddReaction,
//   __7 as useMutation,
//   __8 as useCreateThread,
//   __9 as useEditThreadMetadata,
//   _10 as useEventListener,
//   _11 as useMyPresence,
//   _12 as useOthersConnectionIds,
//   _13 as useOthersConnectionIdsSuspense,
//   _14 as useOthersMapped,
//   _15 as useOthersMappedSuspense,
//   _16 as useThreads,
//   _17 as useThreadsSuspense,
//   _18 as useOther,
//   _19 as useOthers,
//   _20 as useOtherSuspense,
//   _21 as useOthersSuspense,
//   _22 as useStorage,
//   _23 as useStorageSuspense,
//   _24 as useSelf,
//   _25 as useSelfSuspense,
//   _26 as useStorageRoot,
//   _27 as useUpdateMyPresence,
// };
