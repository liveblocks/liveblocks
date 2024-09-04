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
  DE,
  DM,
  DP,
  DS,
  DU,
  EnterOptions,
  HistoryVersion,
  LiveblocksError,
  OpaqueClient,
  OpaqueRoom,
  RoomEventMessage,
  RoomNotificationSettings,
  StorageStatus,
  ThreadData,
  ToImmutable,
} from "@liveblocks/core";
import {
  addReaction,
  CommentsApiError,
  console,
  createCommentId,
  createThreadId,
  deleteComment,
  deprecateIf,
  errorIf,
  kInternal,
  makeEventSource,
  makePoller,
  nanoid,
  NotificationsApiError,
  removeReaction,
  ServerMsgCode,
  stringify,
  upsertComment,
} from "@liveblocks/core";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import {
  AddReactionError,
  type CommentsError,
  CreateCommentError,
  CreateThreadError,
  DeleteCommentError,
  DeleteThreadError,
  EditCommentError,
  EditThreadMetadataError,
  MarkInboxNotificationAsReadError,
  MarkThreadAsResolvedError,
  MarkThreadAsUnresolvedError,
  RemoveReactionError,
  UpdateNotificationSettingsError,
} from "./comments/errors";
import { selectNotificationSettings } from "./comments/lib/select-notification-settings";
import { selectedInboxNotifications } from "./comments/lib/selected-inbox-notifications";
import { selectedThreads } from "./comments/lib/selected-threads";
import { retryError } from "./lib/retry-error";
import { useInitial } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { use } from "./lib/use-polyfill";
import {
  createSharedContext,
  LiveblocksProviderWithClient,
  useClient,
  useClientOrNull,
} from "./liveblocks";
import type {
  CommentReactionOptions,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  HistoryVersionDataState,
  HistoryVersionsState,
  HistoryVersionsStateResolved,
  MutationContext,
  OmitFirstArg,
  RoomContextBundle,
  RoomNotificationSettingsState,
  RoomNotificationSettingsStateSuccess,
  RoomProviderProps,
  StorageStatusSuccess,
  ThreadsState,
  ThreadsStateSuccess,
  ThreadSubscription,
  UseStorageStatusOptions,
  UseThreadsOptions,
} from "./types";
import { useScrollToCommentOnLoadEffect } from "./use-scroll-to-comment-on-load-effect";

const SMOOTH_DELAY = 1000;

const noop = () => { };
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
  M extends BaseMetadata,
>(room: Room<P, S, U, E, M>): MutationContext<P, S, U> {
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

function getCurrentUserId(room: OpaqueRoom): string {
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
    const room = client.getRoom(roomId) as Room<
      never,
      never,
      never,
      never,
      M
    > | null; // TODO: Figure out how to remove this casting
    if (room === null) return;

    const since = lastRequestedAtByRoom.get(room.id);
    if (since === undefined) return;

    const isFetchingThreadsUpdates = requestStatusByRoom.get(room.id) ?? false;
    // If another request to retrieve threads updates for the room is in progress, we do not start a new one
    if (isFetchingThreadsUpdates === true) return;

    try {
      // Set the isFetchingThreadsUpdates flag to true to prevent multiple requests to fetch threads updates for the room from being made at the same time
      requestStatusByRoom.set(room.id, true);

      const updates = await room.getThreadsSince({ since });

      // Set the isFetchingThreadsUpdates flag to false after a certain interval to prevent multiple requests from being made at the same time
      setTimeout(() => {
        requestStatusByRoom.set(room.id, false);
      }, DEFAULT_DEDUPING_INTERVAL);

      store.updateThreadsAndNotifications(
        updates.threads.updated,
        updates.inboxNotifications.updated,
        updates.threads.deleted,
        updates.inboxNotifications.deleted
      );

      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      lastRequestedAtByRoom.set(room.id, updates.requestedAt);
    } catch (err) {
      requestStatusByRoom.set(room.id, false);
      // TODO: Implement error handling
      return;
    }
  }

  async function getRoomVersions(
    room: OpaqueRoom,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const queryKey = getVersionsQueryKey(room.id);
    const existingRequest = requestsByQuery.get(queryKey);
    console.warn("existing request", existingRequest);
    if (existingRequest !== undefined) return existingRequest;
    const request = room[kInternal].listTextVersions();
    requestsByQuery.set(queryKey, request);
    store.setQueryState(queryKey, {
      isLoading: true,
    });
    try {
      const result = await request;
      const data = (await result.json()) as {
        versions: HistoryVersion[];
      };
      const versions = data.versions.map(({ createdAt, ...version }) => {
        return {
          createdAt: new Date(createdAt),
          ...version,
        };
      });
      store.updateRoomVersions(room.id, versions, queryKey);
      requestsByQuery.delete(queryKey);
    } catch (err) {
      requestsByQuery.delete(queryKey);
      // Retry the action using the exponential backoff algorithm
      retryError(() => {
        void getRoomVersions(room, {
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

  async function getThreadsAndInboxNotifications(
    room: OpaqueRoom,
    queryKey: string,
    options: UseThreadsOptions<M>,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = requestsByQuery.get(queryKey);

    // If a request was already made for the query, we do not make another request and return the existing promise of the request
    if (existingRequest !== undefined) return existingRequest;

    const request = room.getThreads(options);

    // Store the promise of the request for the query so that we do not make another request for the same query
    requestsByQuery.set(queryKey, request);

    store.setQueryState(queryKey, {
      isLoading: true,
    });

    try {
      const result = await request;

      store.updateThreadsAndNotifications(
        result.threads as ThreadData<M>[], // TODO: Figure out how to remove this casting
        result.inboxNotifications,
        [],
        [],
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
        lastRequestedAt > result.requestedAt
      ) {
        lastRequestedAtByRoom.set(room.id, result.requestedAt);
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
    room: OpaqueRoom,
    queryKey: string,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = requestsByQuery.get(queryKey);

    // If a request was already made for the notifications query, we do not make another request and return the existing promise
    if (existingRequest !== undefined) return existingRequest;

    try {
      const request = room.getNotificationSettings();

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

  return {
    store,
    incrementQuerySubscribers,
    commentsErrorEventSource,
    getThreadsUpdates,
    getThreadsAndInboxNotifications,
    getInboxNotificationSettings,
    getRoomVersions,
    onMutationFailure,
  };
}

type RoomLeavePair<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
> = {
  room: Room<P, S, U, E, M>;
  leave: () => void;
};

/**
 * Raw access to the React context where the RoomProvider stores the current
 * room. Exposed for advanced use cases only.
 *
 * @private This is a private/advanced API. Do not rely on it.
 */
const RoomContext = React.createContext<OpaqueRoom | null>(null);

function makeRoomContextBundle<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(client: Client<U>): RoomContextBundle<P, S, U, E, M> {
  type TRoom = Room<P, S, U, E, M>;

  function RoomProvider_withImplicitLiveblocksProvider(
    props: RoomProviderProps<P, S>
  ) {
    // NOTE: Normally, nesting LiveblocksProvider is not allowed. This
    // factory-bound version of the RoomProvider will create an implicit
    // LiveblocksProvider. This means that if an end user nests this
    // RoomProvider under a LiveblocksProvider context, that would be an error.
    // However, we'll allow that nesting only in this specific situation, and
    // only because this wrapper will keep the Liveblocks context and the Room
    // context consistent internally.
    return (
      <LiveblocksProviderWithClient client={client} allowNesting>
        <RoomProvider {...props} />
      </LiveblocksProviderWithClient>
    );
  }

  const shared = createSharedContext<U>(client);

  const bundle: RoomContextBundle<P, S, U, E, M> = {
    RoomContext: RoomContext as React.Context<TRoom | null>,
    RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

    useRoom,
    useStatus,
    useStorageStatus,

    useBatch,
    useBroadcastEvent,
    useOthersListener,
    useLostConnectionListener,
    useErrorListener,
    useEventListener,

    useHistory,
    useUndo,
    useRedo,
    useCanRedo,
    useCanUndo,

    useStorageRoot,
    useStorage,

    useSelf,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,

    useMutation: useMutation as RoomContextBundle<P, S, U, E, M>["useMutation"],

    useThreads,

    useCreateThread,
    useDeleteThread,
    useEditThreadMetadata,
    useMarkThreadAsResolved,
    useMarkThreadAsUnresolved,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
    useMarkThreadAsRead,
    useThreadSubscription,

    useHistoryVersions,
    useHistoryVersionData,

    useRoomNotificationSettings,
    useUpdateRoomNotificationSettings,

    ...shared.classic,

    suspense: {
      RoomContext: RoomContext as React.Context<TRoom | null>,
      RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

      useRoom,
      useStatus,
      useStorageStatus: useStorageStatusSuspense,

      useBatch,
      useBroadcastEvent,
      useOthersListener,
      useLostConnectionListener,
      useErrorListener,
      useEventListener,

      useHistory,
      useUndo,
      useRedo,
      useCanRedo,
      useCanUndo,

      useStorageRoot,
      useStorage: useStorageSuspense,

      useSelf: useSelfSuspense,
      useMyPresence,
      useUpdateMyPresence,
      useOthers: useOthersSuspense,
      useOthersMapped: useOthersMappedSuspense,
      useOthersConnectionIds: useOthersConnectionIdsSuspense,
      useOther: useOtherSuspense,

      useMutation: useMutation as RoomContextBundle<
        P,
        S,
        U,
        E,
        M
      >["suspense"]["useMutation"],

      useThreads: useThreadsSuspense,

      useCreateThread,
      useDeleteThread,
      useEditThreadMetadata,
      useMarkThreadAsResolved,
      useMarkThreadAsUnresolved,
      useCreateComment,
      useEditComment,
      useDeleteComment,
      useAddReaction,
      useRemoveReaction,
      useMarkThreadAsRead,
      useThreadSubscription,

      // TODO: useHistoryVersionData: useHistoryVersionDataSuspense,
      useHistoryVersions: useHistoryVersionsSuspense,

      useRoomNotificationSettings: useRoomNotificationSettingsSuspense,
      useUpdateRoomNotificationSettings,

      ...shared.suspense,
    },

    useCommentsErrorListener,
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
  M extends BaseMetadata,
>(props: RoomProviderProps<P, S>) {
  const client = useClient<U>();
  const [cache] = React.useState(
    () => new Map<string, RoomLeavePair<P, S, U, E, M>>()
  );

  // Produce a version of client.enterRoom() that when called for the same
  // room ID multiple times, will not keep producing multiple leave
  // functions, but instead return the cached one.
  const stableEnterRoom: typeof client.enterRoom<P, S, E, M> =
    React.useCallback(
      (
        roomId: string,
        options: EnterOptions<P, S>
      ): RoomLeavePair<P, S, U, E, M> => {
        const cached = cache.get(roomId);
        if (cached) return cached;

        const rv = client.enterRoom<P, S, E, M>(roomId, options);

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
  return (
    <RoomProviderInner<P, S, U, E, M>
      {...(props as any)}
      stableEnterRoom={stableEnterRoom}
    />
  );
}

type EnterRoomType<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
> = (
  roomId: string,
  options: EnterOptions<P, S>
) => RoomLeavePair<P, S, U, E, M>;

/** @internal */
function RoomProviderInner<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(
  props: RoomProviderProps<P, S> & {
    stableEnterRoom: EnterRoomType<P, S, U, E, M>;
  }
) {
  const client = useClient<U>();
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
    autoConnect: props.autoConnect ?? typeof window !== "undefined",
  }) as EnterOptions<P, S>;

  const [{ room }, setRoomLeavePair] = React.useState(() =>
    stableEnterRoom(roomId, {
      ...frozenProps,
      autoConnect: false, // Deliberately using false here on the first render, see below
    })
  );

  React.useEffect(() => {
    const { store } = getExtrasForClient(client);

    async function handleCommentEvent(message: CommentsEventServerMsg) {
      // If thread deleted event is received, we remove the thread from the local cache
      // no need for more processing
      if (message.type === ServerMsgCode.THREAD_DELETED) {
        store.deleteThread(message.threadId);
        return;
      }

      // TODO: Error handling
      const info = await room.getThread(message.threadId);

      // If no thread info was returned (i.e., 404), we remove the thread and relevant inbox notifications from local cache.
      if (!info.thread) {
        store.deleteThread(message.threadId);
        return;
      }
      const { thread, inboxNotification } = info;

      const existingThread = store.get().threads[message.threadId];

      switch (message.type) {
        case ServerMsgCode.COMMENT_EDITED:
        case ServerMsgCode.THREAD_METADATA_UPDATED:
        case ServerMsgCode.THREAD_UPDATED:
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
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
>(): Room<P, S, U, E, M> {
  const room = useRoomOrNull<P, S, U, E, M>();
  if (room === null) {
    throw new Error("RoomProvider is missing from the React tree.");
  }
  return room;
}

/**
 * Returns whether the hook is called within a RoomProvider context.
 *
 * @example
 * const isInsideRoom = useIsInsideRoom();
 */
function useIsInsideRoom(): boolean {
  const room = useRoomOrNull();
  return room !== null;
}

/**
 * Returns the current connection status for the Room, and triggers
 * a re-render whenever it changes. Can be used to render a status badge.
 */
function useStatus(): Status {
  const room = useRoom();
  const subscribe = room.events.status.subscribe;
  const getSnapshot = room.getStatus;
  const getServerSnapshot = room.getStatus;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns the current storage status for the Room, and triggers
 * a re-render whenever it changes. Can be used to render a "Saving..."
 * indicator.
 */
function useStorageStatus(options?: UseStorageStatusOptions): StorageStatus {
  // Normally the Rules of Hooks™ dictate that you should not call hooks
  // conditionally. In this case, we're good here, because the same code path
  // will always be taken on every subsequent render here, because we've frozen
  // the value.
  /* eslint-disable react-hooks/rules-of-hooks */
  const smooth = useInitial(options?.smooth ?? false);
  if (smooth) {
    return useStorageStatusSmooth();
  } else {
    return useStorageStatusImmediate();
  }
  /* eslint-enable react-hooks/rules-of-hooks */
}

function useStorageStatusImmediate(): StorageStatus {
  const room = useRoom();
  const subscribe = room.events.storageStatus.subscribe;
  const getSnapshot = room.getStorageStatus;
  const getServerSnapshot = room.getStorageStatus;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useStorageStatusSmooth(): StorageStatus {
  const room = useRoom();
  const [status, setStatus] = React.useState(room.getStorageStatus);
  const oldStatus = useLatest(room.getStorageStatus());

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const unsub = room.events.storageStatus.subscribe((newStatus) => {
      if (
        oldStatus.current === "synchronizing" &&
        newStatus === "synchronized"
      ) {
        // Delay delivery of the "synchronized" event
        timeoutId = setTimeout(() => setStatus(newStatus), SMOOTH_DELAY);
      } else {
        clearTimeout(timeoutId);
        setStatus(newStatus);
      }
    });

    // Clean up
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [room, oldStatus]);

  return status;
}

/**
 * @deprecated It's recommended to use `useMutation` for writing to Storage,
 * which will automatically batch all mutations.
 *
 * Returns a function that batches modifications made during the given function.
 * All the modifications are sent to other clients in a single message.
 * All the modifications are merged in a single history item (undo/redo).
 * All the subscribers are called only after the batch is over.
 */
function useBatch<T>(): (callback: () => T) => T {
  return useRoom().batch;
}

function useBroadcastEvent<E extends Json>(): (
  event: E,
  options?: BroadcastOptions
) => void {
  const room = useRoom<never, never, never, E, never>();
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
  const room = useRoom<P, never, U, never, never>();
  const savedCallback = useLatest(callback);
  React.useEffect(
    () => room.events.others.subscribe((event) => savedCallback.current(event)),
    [room, savedCallback]
  );
}

/**
 * Get informed when reconnecting to the Liveblocks servers is taking
 * longer than usual. This typically is a sign of a client that has lost
 * internet connectivity.
 *
 * This isn't problematic (because the Liveblocks client is still trying to
 * reconnect), but it's typically a good idea to inform users about it if
 * the connection takes too long to recover.
 *
 * @example
 * useLostConnectionListener(event => {
 *   if (event === 'lost') {
 *     toast.warn('Reconnecting to the Liveblocks servers is taking longer than usual...')
 *   } else if (event === 'failed') {
 *     toast.warn('Reconnecting to the Liveblocks servers failed.')
 *   } else if (event === 'restored') {
 *     toast.clear();
 *   }
 * })
 */
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

/**
 * useErrorListener is a React hook that allows you to respond to potential room
 * connection errors.
 *
 * @example
 * useErrorListener(er => {
 *   console.error(er);
 * })
 */
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
  const room = useRoom<P, never, U, E, never>();
  const savedCallback = useLatest(callback);
  React.useEffect(() => {
    const listener = (eventData: RoomEventMessage<P, U, E>) => {
      savedCallback.current(eventData);
    };

    return room.events.customEvent.subscribe(listener);
  }, [room, savedCallback]);
}

/**
 * Returns the room.history
 */
function useHistory(): History {
  return useRoom().history;
}

/**
 * Returns a function that undoes the last operation executed by the current
 * client. It does not impact operations made by other clients.
 */
function useUndo(): () => void {
  return useHistory().undo;
}

/**
 * Returns a function that redoes the last operation executed by the current
 * client. It does not impact operations made by other clients.
 */
function useRedo(): () => void {
  return useHistory().redo;
}

/**
 * Returns whether there are any operations to undo.
 */
function useCanUndo(): boolean {
  const room = useRoom();
  const subscribe = room.events.history.subscribe;
  const canUndo = room.history.canUndo;
  return useSyncExternalStore(subscribe, canUndo, canUndo);
}

/**
 * Returns whether there are any operations to redo.
 */
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
function useSelf<P extends JsonObject, U extends BaseUserMeta, T>(
  selector: (me: User<P, U>) => T,
  isEqual?: (prev: T | null, curr: T | null) => boolean
): T | null;
function useSelf<P extends JsonObject, U extends BaseUserMeta, T>(
  maybeSelector?: (me: User<P, U>) => T,
  isEqual?: (prev: T | null, curr: T | null) => boolean
): T | User<P, U> | null {
  type Snapshot = User<P, U> | null;
  type Selection = T | null;

  const room = useRoom<P, never, U, never, never>();
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

function useMyPresence<P extends JsonObject>(): [
  P,
  (patch: Partial<P>, options?: { addToHistory: boolean }) => void,
] {
  const room = useRoom<P, never, never, never, never>();
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
  return useRoom<P, never, never, never, never>().updatePresence;
}

function useOthers<
  P extends JsonObject,
  U extends BaseUserMeta,
>(): readonly User<P, U>[];
function useOthers<P extends JsonObject, U extends BaseUserMeta, T>(
  selector: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function useOthers<P extends JsonObject, U extends BaseUserMeta, T>(
  selector?: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | readonly User<P, U>[] {
  const room = useRoom<P, never, U, never, never>();
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

function useOthersMapped<P extends JsonObject, U extends BaseUserMeta, T>(
  itemSelector: (other: User<P, U>) => T,
  itemIsEqual?: (prev: T, curr: T) => boolean
): ReadonlyArray<readonly [connectionId: number, data: T]> {
  const wrappedSelector = React.useCallback(
    (others: readonly User<P, U>[]) =>
      others.map((other) => [other.connectionId, itemSelector(other)] as const),
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
}

/**
 * Returns an array of connection IDs. This matches the values you'll get by
 * using the `useOthers()` hook.
 *
 * Roughly equivalent to:
 *   useOthers((others) => others.map(other => other.connectionId), shallow)
 *
 * This is useful in particular to implement efficiently rendering components
 * for each user in the room, e.g. cursors.
 *
 * @example
 * const ids = useOthersConnectionIds();
 * // [2, 4, 7]
 */
function useOthersConnectionIds(): readonly number[] {
  return useOthers(selectorFor_useOthersConnectionIds, shallow);
}

const NOT_FOUND = Symbol();

type NotFound = typeof NOT_FOUND;

function useOther<P extends JsonObject, U extends BaseUserMeta, T>(
  connectionId: number,
  selector: (other: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T {
  const wrappedSelector = React.useCallback(
    (others: readonly User<P, U>[]) => {
      // TODO: Make this O(1) instead of O(n)?
      const other = others.find((other) => other.connectionId === connectionId);
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
}

/** @internal */
function useMutableStorageRoot<S extends LsonObject>(): LiveObject<S> | null {
  const room = useRoom<never, S, never, never, never>();
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageSnapshot;
  const getServerSnapshot = alwaysNull;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// NOTE: This API exists for backward compatible reasons
function useStorageRoot<S extends LsonObject>(): [root: LiveObject<S> | null] {
  return [useMutableStorageRoot<S>()];
}

function useStorage<S extends LsonObject, T>(
  selector: (root: ToImmutable<S>) => T,
  isEqual?: (prev: T | null, curr: T | null) => boolean
): T | null {
  type Snapshot = ToImmutable<S> | null;
  type Selection = T | null;

  const room = useRoom<never, S, never, never, never>();
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
}

function useMutation<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
  F extends (context: MutationContext<P, S, U>, ...args: any[]) => any,
>(callback: F, deps: readonly unknown[]): OmitFirstArg<F> {
  const room = useRoom<P, S, U, E, M>();
  return React.useMemo(
    () => {
      return ((...args) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        room.batch(() =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          callback(
            makeMutationContext<P, S, U, E, M>(room),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            ...args
          )
        )) as OmitFirstArg<F>;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, ...deps]
  );
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

/**
 * @private Internal API, do not rely on it.
 */
function useCommentsErrorListener<M extends BaseMetadata>(
  callback: (error: CommentsError<M>) => void
) {
  const client = useClient();
  const savedCallback = useLatest(callback);
  const { commentsErrorEventSource } = getExtrasForClient<M>(client);

  React.useEffect(() => {
    return commentsErrorEventSource.subscribe(savedCallback.current);
  }, [savedCallback, commentsErrorEventSource]);
}

function useCreateThread<M extends BaseMetadata>(): (
  options: CreateThreadOptions<M>
) => ThreadData<M> {
  const client = useClient();
  const room = useRoom();

  return React.useCallback(
    (options: CreateThreadOptions<M>): ThreadData<M> => {
      const body = options.body;
      const metadata = options.metadata ?? ({} as M);

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
        metadata,
        comments: [newComment],
        resolved: false,
      };

      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "create-thread",
        thread: newThread,
        id: optimisticUpdateId,
        roomId: room.id,
      });

      room.createThread({ threadId, commentId, body, metadata }).then(
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

function useDeleteThread(): (threadId: string) => void {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (threadId: string): void => {
      const optimisticUpdateId = nanoid();

      const { store, onMutationFailure } = getExtrasForClient(client);

      const thread = store.get().threads[threadId];

      const userId = getCurrentUserId(room);

      if (thread?.comments?.[0]?.userId !== userId) {
        throw new Error("Only the thread creator can delete the thread");
      }

      store.pushOptimisticUpdate({
        type: "delete-thread",
        id: optimisticUpdateId,
        roomId: room.id,
        threadId,
        deletedAt: new Date(),
      });

      room.deleteThread(threadId).then(
        () => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            if (existingThread === undefined) {
              return state;
            }

            return {
              ...state,
              threads: {
                ...state.threads,
                [threadId]: {
                  ...existingThread,
                  updatedAt: new Date(),
                  deletedAt: new Date(),
                },
              },
              optimisticUpdates: state.optimisticUpdates.filter(
                (update) => update.id !== optimisticUpdateId
              ),
            };
          });
        },
        (err: Error) =>
          onMutationFailure(
            err,
            optimisticUpdateId,
            (err) => new DeleteThreadError(err, { roomId: room.id, threadId })
          )
      );
    },
    [client, room]
  );
}

function useEditThreadMetadata<M extends BaseMetadata>() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (options: EditThreadMetadataOptions<M>): void => {
      if (!options.metadata) {
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

      room.editThreadMetadata({ metadata, threadId }).then(
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
                  metadata,
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

/**
 * Returns a function that adds a comment to a thread.
 *
 * @example
 * const createComment = useCreateComment();
 * createComment({ threadId: "th_xxx", body: {} });
 */
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

      room.createComment({ threadId, commentId, body }).then(
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

/**
 * Returns a function that edits a comment's body.
 *
 * @example
 * const editComment = useEditComment()
 * editComment({ threadId: "th_xxx", commentId: "cm_xxx", body: {} })
 */
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

      room.editComment({ threadId, commentId, body }).then(
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

/**
 * Returns a function that deletes a comment.
 * If it is the last non-deleted comment, the thread also gets deleted.
 *
 * @example
 * const deleteComment = useDeleteComment();
 * deleteComment({ threadId: "th_xxx", commentId: "cm_xxx" })
 */
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
        roomId: room.id,
      });

      room.deleteComment({ threadId, commentId }).then(
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

      room.addReaction({ threadId, commentId, emoji }).then(
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

/**
 * Returns a function that removes a reaction on a comment.
 *
 * @example
 * const removeReaction = useRemoveReaction();
 * removeReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
 */
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

      room.removeReaction({ threadId, commentId, emoji }).then(
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

/**
 * Returns a function that marks a thread as read.
 *
 * @example
 * const markThreadAsRead = useMarkThreadAsRead();
 * markThreadAsRead("th_xxx");
 */
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

      room.markInboxNotificationAsRead(inboxNotification.id).then(
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

/**
 * Returns a function that marks a thread as resolved.
 *
 * @example
 * const markThreadAsResolved = useMarkThreadAsResolved();
 * markThreadAsResolved("th_xxx");
 */
function useMarkThreadAsResolved() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (threadId: string) => {
      const optimisticUpdateId = nanoid();
      const updatedAt = new Date();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "mark-thread-as-resolved",
        id: optimisticUpdateId,
        threadId,
        updatedAt,
      });

      room.markThreadAsResolved(threadId).then(
        () => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            // If the thread doesn't exist in the cache, we do not update the resolved property
            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            // If the thread has been deleted, we do not update the resolved property
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
                  resolved: true,
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
              new MarkThreadAsResolvedError(error, {
                roomId: room.id,
                threadId,
              })
          )
      );
    },
    [client, room]
  );
}

/**
 * Returns a function that marks a thread as unresolved.
 *
 * @example
 * const markThreadAsUnresolved = useMarkThreadAsUnresolved();
 * markThreadAsUnresolved("th_xxx");
 */
function useMarkThreadAsUnresolved() {
  const client = useClient();
  const room = useRoom();
  return React.useCallback(
    (threadId: string) => {
      const optimisticUpdateId = nanoid();
      const updatedAt = new Date();

      const { store, onMutationFailure } = getExtrasForClient(client);
      store.pushOptimisticUpdate({
        type: "mark-thread-as-unresolved",
        id: optimisticUpdateId,
        threadId,
        updatedAt,
      });

      room.markThreadAsUnresolved(threadId).then(
        () => {
          store.set((state) => {
            const existingThread = state.threads[threadId];
            const updatedOptimisticUpdates = state.optimisticUpdates.filter(
              (update) => update.id !== optimisticUpdateId
            );

            // If the thread doesn't exist in the cache, we do not update the resolved property
            if (existingThread === undefined) {
              return {
                ...state,
                optimisticUpdates: updatedOptimisticUpdates,
              };
            }

            // If the thread has been deleted, we do not update the resolved property
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
                  resolved: false,
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
              new MarkThreadAsUnresolvedError(error, {
                roomId: room.id,
                threadId,
              })
          )
      );
    },
    [client, room]
  );
}

/**
 * Returns the subscription status of a thread.
 *
 * @example
 * const { status, unreadSince } = useThreadSubscription("th_xxx");
 */
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

/**
 * Returns the user's notification settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomNotificationSettings();
 */
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

function useHistoryVersionData(versionId: string): HistoryVersionDataState {
  const [state, setState] = React.useState<HistoryVersionDataState>({
    isLoading: true,
  });
  const room = useRoom();
  React.useEffect(() => {
    setState({ isLoading: true });
    const load = async () => {
      try {
        const response = await room[kInternal].getTextVersion(versionId);
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        setState({
          isLoading: false,
          data,
        });
      } catch (error) {
        setState({
          isLoading: false,
          error:
            error instanceof Error
              ? error
              : new Error(
                "An unknown error occurred while loading this version"
              ),
        });
      }
    };
    void load();
  }, [room, versionId]);
  return state;
}

/**
 * Returns a history of versions of the current room.
 *
 * @example
 * const { versions, error, isLoading } = useHistoryVersions();
 */
function useHistoryVersions(): HistoryVersionsState {
  const client = useClient();
  const room = useRoom();
  const queryKey = getVersionsQueryKey(room.id);

  const { store, getRoomVersions } = getExtrasForClient(client);

  React.useEffect(() => {
    void getRoomVersions(room);
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const selector = React.useCallback(
    (state: CacheState<BaseMetadata>): HistoryVersionsState => {
      const query = state.queries[queryKey];
      if (query === undefined || query.isLoading) {
        return {
          isLoading: true,
        };
      }

      return {
        versions: state.versions[room.id],
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

  return state;
}

/**
 * Returns a function that updates the user's notification settings
 * for the current room.
 *
 * @example
 * const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();
 * updateRoomNotificationSettings({ threads: "all" });
 */
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

      room.updateNotificationSettings(settings).then(
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

function useSuspendUntilPresenceReady(): void {
  // Throw an error if we're calling this on the server side
  ensureNotServerSide();

  const room = useRoom();
  use(room.waitUntilPresenceReady());
}

function useSelfSuspense<P extends JsonObject, U extends BaseUserMeta>(): User<
  P,
  U
>;
function useSelfSuspense<P extends JsonObject, U extends BaseUserMeta, T>(
  selector: (me: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function useSelfSuspense<P extends JsonObject, U extends BaseUserMeta, T>(
  selector?: (me: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | User<P, U> {
  useSuspendUntilPresenceReady();
  return useSelf(
    selector as (me: User<P, U>) => T,
    isEqual as (prev: T | null, curr: T | null) => boolean
  ) as T | User<P, U>;
}

function useOthersSuspense<
  P extends JsonObject,
  U extends BaseUserMeta,
>(): readonly User<P, U>[];
function useOthersSuspense<P extends JsonObject, U extends BaseUserMeta, T>(
  selector: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function useOthersSuspense<P extends JsonObject, U extends BaseUserMeta, T>(
  selector?: (others: readonly User<P, U>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | readonly User<P, U>[] {
  useSuspendUntilPresenceReady();
  return useOthers(
    selector as (others: readonly User<P, U>[]) => T,
    isEqual as (prev: T, curr: T) => boolean
  ) as T | readonly User<P, U>[];
}

/**
 * Returns an array of connection IDs. This matches the values you'll get by
 * using the `useOthers()` hook.
 *
 * Roughly equivalent to:
 *   useOthers((others) => others.map(other => other.connectionId), shallow)
 *
 * This is useful in particular to implement efficiently rendering components
 * for each user in the room, e.g. cursors.
 *
 * @example
 * const ids = useOthersConnectionIds();
 * // [2, 4, 7]
 */
function useOthersConnectionIdsSuspense(): readonly number[] {
  useSuspendUntilPresenceReady();
  return useOthersConnectionIds();
}

function useOthersMappedSuspense<
  P extends JsonObject,
  U extends BaseUserMeta,
  T,
>(
  itemSelector: (other: User<P, U>) => T,
  itemIsEqual?: (prev: T, curr: T) => boolean
): ReadonlyArray<readonly [connectionId: number, data: T]> {
  useSuspendUntilPresenceReady();
  return useOthersMapped(itemSelector, itemIsEqual);
}

function useOtherSuspense<P extends JsonObject, U extends BaseUserMeta, T>(
  connectionId: number,
  selector: (other: User<P, U>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T {
  useSuspendUntilPresenceReady();
  return useOther(connectionId, selector, isEqual);
}

function useSuspendUntilStorageReady(): void {
  // Throw an error if we're calling this on the server side
  ensureNotServerSide();

  const room = useRoom();
  use(room.waitUntilStorageReady());
}

function useStorageSuspense<S extends LsonObject, T>(
  selector: (root: ToImmutable<S>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T {
  useSuspendUntilStorageReady();
  return useStorage(
    selector,
    isEqual as (prev: T | null, curr: T | null) => boolean
  ) as T;
}

/**
 * Returns the current storage status for the Room, and triggers
 * a re-render whenever it changes. Can be used to render a "Saving..."
 * indicator.
 */
function useStorageStatusSuspense(
  options?: UseStorageStatusOptions
): StorageStatusSuccess {
  useSuspendUntilStorageReady();
  return useStorageStatus(options) as StorageStatusSuccess;
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

/**
 * Returns a history of versions of the current room.
 *
 * @example
 * const { versions } = useHistoryVersions();
 */
function useHistoryVersionsSuspense(): HistoryVersionsStateResolved {
  const client = useClient();
  const room = useRoom();
  const queryKey = getVersionsQueryKey(room.id);

  const { store, getRoomVersions } = getExtrasForClient(client);

  const query = store.get().queries[queryKey];

  if (query === undefined || query.isLoading) {
    throw getRoomVersions(room);
  }

  if (query.error) {
    throw query.error;
  }

  const selector = React.useCallback(
    (state: CacheState<BaseMetadata>): HistoryVersionsStateResolved => {
      return {
        versions: state.versions[room.id],
        isLoading: false,
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

  return state;
}

/**
 * Returns the user's notification settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomNotificationSettings();
 */
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

/** @internal */
export function useRoomOrNull<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(): Room<P, S, U, E, M> | null {
  return React.useContext(RoomContext) as Room<P, S, U, E, M> | null;
}

/**
 * @private
 *
 * This is an internal API, use `createRoomContext` instead.
 */
export function useRoomContextBundleOrNull() {
  const client = useClientOrNull();
  const room = useRoomOrNull<never, never, never, never, never>();
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

/**
 * Creates a RoomProvider and a set of typed hooks to use in your app. Note
 * that any RoomProvider created in this way does not need to be nested in
 * LiveblocksProvider, as it already has access to the client.
 */
export function createRoomContext<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
>(client: OpaqueClient): RoomContextBundle<P, S, U, E, M> {
  return getOrCreateRoomContextBundle<P, S, U, E, M>(client);
}

export function generateQueryKey(
  roomId: string,
  options: UseThreadsOptions<BaseMetadata>["query"]
) {
  return `${roomId}-${stringify(options ?? {})}`;
}

export function getVersionsQueryKey(roomId: string) {
  return `${roomId}-VERSIONS`;
}

type TypedBundle = RoomContextBundle<DP, DS, DU, DE, DM>;

/**
 * Makes a Room available in the component hierarchy below.
 * Joins the room when the component is mounted, and automatically leaves
 * the room when the component is unmounted.
 */
const _RoomProvider: TypedBundle["RoomProvider"] = RoomProvider;

/**
 * Returns a callback that lets you broadcast custom events to other users in the room
 *
 * @example
 * const broadcast = useBroadcastEvent();
 *
 * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
 */
const _useBroadcastEvent: TypedBundle["useBroadcastEvent"] = useBroadcastEvent;

/**
 * Get informed when users enter or leave the room, as an event.
 *
 * @example
 * useOthersListener({ type, user, others }) => {
 *   if (type === 'enter') {
 *     // `user` has joined the room
 *   } else if (type === 'leave') {
 *     // `user` has left the room
 *   }
 * })
 */
const _useOthersListener: TypedBundle["useOthersListener"] = useOthersListener;

/**
 * Returns the Room of the nearest RoomProvider above in the React component
 * tree.
 */
const _useRoom: TypedBundle["useRoom"] = useRoom;

/**
 * Returns whether the hook is called within a RoomProvider context.
 *
 * @example
 * const isInsideRoom = useIsInsideRoom();
 */
const _useIsInsideRoom: TypedBundle["useIsInsideRoom"] = useIsInsideRoom;

/**
 * Returns a function that adds a reaction from a comment.
 *
 * @example
 * const addReaction = useAddReaction();
 * addReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
 */
const _useAddReaction: TypedBundle["useAddReaction"] = useAddReaction;

/**
 * Create a callback function that lets you mutate Liveblocks state.
 *
 * The first argument that gets passed into your callback will be
 * a "mutation context", which exposes the following:
 *
 *   - `storage` - The mutable Storage root.
 *                 You can mutate any Live structures with this, for example:
 *                 `storage.get('layers').get('layer1').set('fill', 'red')`
 *
 *   - `setMyPresence` - Call this with a new (partial) Presence value.
 *
 *   - `self` - A read-only version of the latest self, if you need it to
 *              compute the next state.
 *
 *   - `others` - A read-only version of the latest others list, if you
 *                need it to compute the next state.
 *
 * useMutation is like React's useCallback, except that the first argument
 * that gets passed into your callback will be a "mutation context".
 *
 * If you want get access to the immutable root somewhere in your mutation,
 * you can use `storage.ToImmutable()`.
 *
 * @example
 * const fillLayers = useMutation(
 *   ({ storage }, color: Color) => {
 *     ...
 *   },
 *   [],
 * );
 *
 * fillLayers('red');
 *
 * const deleteLayers = useMutation(
 *   ({ storage }) => {
 *     ...
 *   },
 *   [],
 * );
 *
 * deleteLayers();
 */
const _useMutation: TypedBundle["useMutation"] = useMutation;

/**
 * Returns a function that creates a thread with an initial comment, and optionally some metadata.
 *
 * @example
 * const createThread = useCreateThread();
 * createThread({ body: {}, metadata: {} });
 */
const _useCreateThread: TypedBundle["useCreateThread"] = useCreateThread;

/**
 * Returns a function that deletes a thread and its associated comments.
 * Only the thread creator can delete a thread, it will throw otherwise.
 *
 * @example
 * const deleteThread = useDeleteThread();
 * deleteThread("th_xxx");
 */
const _useDeleteThread: TypedBundle["useDeleteThread"] = useDeleteThread;

/**
 * Returns a function that edits a thread's metadata.
 * To delete an existing metadata property, set its value to `null`.
 *
 * @example
 * const editThreadMetadata = useEditThreadMetadata();
 * editThreadMetadata({ threadId: "th_xxx", metadata: {} })
 */
const _useEditThreadMetadata: TypedBundle["useEditThreadMetadata"] =
  useEditThreadMetadata;

/**
 * useEventListener is a React hook that allows you to respond to events broadcast
 * by other users in the room.
 *
 * The `user` argument will indicate which `User` instance sent the message.
 * This will be equal to one of the others in the room, but it can be `null`
 * in case this event was broadcasted from the server.
 *
 * @example
 * useEventListener(({ event, user, connectionId }) => {
 * //                         ^^^^ Will be Client A
 *   if (event.type === "CUSTOM_EVENT") {
 *     // Do something
 *   }
 * });
 */
const _useEventListener: TypedBundle["useEventListener"] = useEventListener;

/**
 * Returns the presence of the current user of the current room, and a function to update it.
 * It is different from the setState function returned by the useState hook from React.
 * You don't need to pass the full presence object to update it.
 *
 * @example
 * const [myPresence, updateMyPresence] = useMyPresence();
 * updateMyPresence({ x: 0 });
 * updateMyPresence({ y: 0 });
 *
 * // At the next render, "myPresence" will be equal to "{ x: 0, y: 0 }"
 */
const _useMyPresence: TypedBundle["useMyPresence"] = useMyPresence;

/**
 * Related to useOthers(), but optimized for selecting only "subsets" of
 * others. This is useful for performance reasons in particular, because
 * selecting only a subset of users also means limiting the number of
 * re-renders that will be triggered.
 *
 * @example
 * const avatars = useOthersMapped(user => user.info.avatar);
 * //    ^^^^^^^
 * //    { connectionId: number; data: string }[]
 *
 * The selector function you pass to useOthersMapped() is called an "item
 * selector", and operates on a single user at a time. If you provide an
 * (optional) "item comparison" function, it will be used to compare each
 * item pairwise.
 *
 * For example, to select multiple properties:
 *
 * @example
 * const avatarsAndCursors = useOthersMapped(
 *   user => [u.info.avatar, u.presence.cursor],
 *   shallow,  // 👈
 * );
 */
const _useOthersMapped: TypedBundle["useOthersMapped"] = useOthersMapped;

/**
 * Related to useOthers(), but optimized for selecting only "subsets" of
 * others. This is useful for performance reasons in particular, because
 * selecting only a subset of users also means limiting the number of
 * re-renders that will be triggered.
 *
 * @example
 * const avatars = useOthersMapped(user => user.info.avatar);
 * //    ^^^^^^^
 * //    { connectionId: number; data: string }[]
 *
 * The selector function you pass to useOthersMapped() is called an "item
 * selector", and operates on a single user at a time. If you provide an
 * (optional) "item comparison" function, it will be used to compare each
 * item pairwise.
 *
 * For example, to select multiple properties:
 *
 * @example
 * const avatarsAndCursors = useOthersMapped(
 *   user => [u.info.avatar, u.presence.cursor],
 *   shallow,  // 👈
 * );
 */
const _useOthersMappedSuspense: TypedBundle["suspense"]["useOthersMapped"] =
  useOthersMappedSuspense;

/**
 * Returns the threads within the current room.
 *
 * @example
 * const { threads, error, isLoading } = useThreads();
 */
const _useThreads: TypedBundle["useThreads"] = useThreads;

/**
 * Returns the threads within the current room.
 *
 * @example
 * const { threads } = useThreads();
 */
const _useThreadsSuspense: TypedBundle["suspense"]["useThreads"] =
  useThreadsSuspense;

/**
 * Returns a history of versions of the current room.
 *
 * @example
 * const { versions, error, isLoading } = useHistoryVersions();
 */
const _useHistoryVersions: TypedBundle["useHistoryVersions"] =
  useHistoryVersions;

/**
 * Returns a history of versions of the current room.
 *
 * @example
 * const { versions } = useHistoryVersions();
 */
const _useHistoryVersionsSuspense: TypedBundle["suspense"]["useHistoryVersions"] =
  useHistoryVersionsSuspense;

/**
 * Given a connection ID (as obtained by using `useOthersConnectionIds`), you
 * can call this selector deep down in your component stack to only have the
 * component re-render if properties for this particular user change.
 *
 * @example
 * // Returns only the selected values re-renders whenever that selection changes)
 * const { x, y } = useOther(2, user => user.presence.cursor);
 */
const _useOther: TypedBundle["useOther"] = useOther;

/**
 * Returns an array with information about all the users currently connected in
 * the room (except yourself).
 *
 * @example
 * const others = useOthers();
 *
 * // Example to map all cursors in JSX
 * return (
 *   <>
 *     {others.map((user) => {
 *        if (user.presence.cursor == null) {
 *          return null;
 *        }
 *        return <Cursor key={user.connectionId} cursor={user.presence.cursor} />
 *      })}
 *   </>
 * )
 */
function _useOthers(): readonly User<DP, DU>[];
/**
 * Extract arbitrary data based on all the users currently connected in the
 * room (except yourself).
 *
 * The selector function will get re-evaluated any time a user enters or
 * leaves the room, as well as whenever their presence data changes.
 *
 * The component that uses this hook will automatically re-render if your
 * selector function returns a different value from its previous run.
 *
 * By default `useOthers()` uses strict `===` to check for equality. Take
 * extra care when returning a computed object or list, for example when you
 * return the result of a .map() or .filter() call from the selector. In
 * those cases, you'll probably want to use a `shallow` comparison check.
 *
 * @example
 * const avatars = useOthers(users => users.map(u => u.info.avatar), shallow);
 * const cursors = useOthers(users => users.map(u => u.presence.cursor), shallow);
 * const someoneIsTyping = useOthers(users => users.some(u => u.presence.isTyping));
 *
 */
function _useOthers<T>(
  selector: (others: readonly User<DP, DU>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function _useOthers(...args: any[]) {
  return useOthers(...(args as []));
}

/**
 * Given a connection ID (as obtained by using `useOthersConnectionIds`), you
 * can call this selector deep down in your component stack to only have the
 * component re-render if properties for this particular user change.
 *
 * @example
 * // Returns only the selected values re-renders whenever that selection changes)
 * const { x, y } = useOther(2, user => user.presence.cursor);
 */
const _useOtherSuspense: TypedBundle["suspense"]["useOther"] = useOtherSuspense;

/**
 * Returns an array with information about all the users currently connected in
 * the room (except yourself).
 *
 * @example
 * const others = useOthers();
 *
 * // Example to map all cursors in JSX
 * return (
 *   <>
 *     {others.map((user) => {
 *        if (user.presence.cursor == null) {
 *          return null;
 *        }
 *        return <Cursor key={user.connectionId} cursor={user.presence.cursor} />
 *      })}
 *   </>
 * )
 */
function _useOthersSuspense(): readonly User<DP, DU>[];
/**
 * Extract arbitrary data based on all the users currently connected in the
 * room (except yourself).
 *
 * The selector function will get re-evaluated any time a user enters or
 * leaves the room, as well as whenever their presence data changes.
 *
 * The component that uses this hook will automatically re-render if your
 * selector function returns a different value from its previous run.
 *
 * By default `useOthers()` uses strict `===` to check for equality. Take
 * extra care when returning a computed object or list, for example when you
 * return the result of a .map() or .filter() call from the selector. In
 * those cases, you'll probably want to use a `shallow` comparison check.
 *
 * @example
 * const avatars = useOthers(users => users.map(u => u.info.avatar), shallow);
 * const cursors = useOthers(users => users.map(u => u.presence.cursor), shallow);
 * const someoneIsTyping = useOthers(users => users.some(u => u.presence.isTyping));
 *
 */
function _useOthersSuspense<T>(
  selector: (others: readonly User<DP, DU>[]) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function _useOthersSuspense(...args: any[]) {
  return useOthersSuspense(...(args as []));
}

/**
 * Extract arbitrary data from the Liveblocks Storage state, using an
 * arbitrary selector function.
 *
 * The selector function will get re-evaluated any time something changes in
 * Storage. The value returned by your selector function will also be the
 * value returned by the hook.
 *
 * The `root` value that gets passed to your selector function is
 * a immutable/readonly version of your Liveblocks storage root.
 *
 * The component that uses this hook will automatically re-render if the
 * returned value changes.
 *
 * By default `useStorage()` uses strict `===` to check for equality. Take
 * extra care when returning a computed object or list, for example when you
 * return the result of a .map() or .filter() call from the selector. In
 * those cases, you'll probably want to use a `shallow` comparison check.
 */
const _useStorage: TypedBundle["useStorage"] = useStorage;

/**
 * Extract arbitrary data from the Liveblocks Storage state, using an
 * arbitrary selector function.
 *
 * The selector function will get re-evaluated any time something changes in
 * Storage. The value returned by your selector function will also be the
 * value returned by the hook.
 *
 * The `root` value that gets passed to your selector function is
 * a immutable/readonly version of your Liveblocks storage root.
 *
 * The component that uses this hook will automatically re-render if the
 * returned value changes.
 *
 * By default `useStorage()` uses strict `===` to check for equality. Take
 * extra care when returning a computed object or list, for example when you
 * return the result of a .map() or .filter() call from the selector. In
 * those cases, you'll probably want to use a `shallow` comparison check.
 */
const _useStorageSuspense: TypedBundle["suspense"]["useStorage"] =
  useStorageSuspense;

/**
 * Gets the current user once it is connected to the room.
 *
 * @example
 * const me = useSelf();
 * if (me !== null) {
 *   const { x, y } = me.presence.cursor;
 * }
 */
function _useSelf(): User<DP, DU> | null;
/**
 * Extract arbitrary data based on the current user.
 *
 * The selector function will get re-evaluated any time your presence data
 * changes.
 *
 * The component that uses this hook will automatically re-render if your
 * selector function returns a different value from its previous run.
 *
 * By default `useSelf()` uses strict `===` to check for equality. Take extra
 * care when returning a computed object or list, for example when you return
 * the result of a .map() or .filter() call from the selector. In those
 * cases, you'll probably want to use a `shallow` comparison check.
 *
 * Will return `null` while Liveblocks isn't connected to a room yet.
 *
 * @example
 * const cursor = useSelf(me => me.presence.cursor);
 * if (cursor !== null) {
 *   const { x, y } = cursor;
 * }
 *
 */
function _useSelf<T>(
  selector: (me: User<DP, DU>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T | null;
function _useSelf(...args: any[]) {
  return useSelf(...(args as []));
}

/**
 * Gets the current user once it is connected to the room.
 *
 * @example
 * const me = useSelf();
 * const { x, y } = me.presence.cursor;
 */
function _useSelfSuspense(): User<DP, DU>;
/**
 * Extract arbitrary data based on the current user.
 *
 * The selector function will get re-evaluated any time your presence data
 * changes.
 *
 * The component that uses this hook will automatically re-render if your
 * selector function returns a different value from its previous run.
 *
 * By default `useSelf()` uses strict `===` to check for equality. Take extra
 * care when returning a computed object or list, for example when you return
 * the result of a .map() or .filter() call from the selector. In those
 * cases, you'll probably want to use a `shallow` comparison check.
 *
 * @example
 * const cursor = useSelf(me => me.presence.cursor);
 * const { x, y } = cursor;
 *
 */
function _useSelfSuspense<T>(
  selector: (me: User<DP, DU>) => T,
  isEqual?: (prev: T, curr: T) => boolean
): T;
function _useSelfSuspense(...args: any[]) {
  return useSelfSuspense(...(args as []));
}

/**
 * Returns the mutable (!) Storage root. This hook exists for
 * backward-compatible reasons.
 *
 * @example
 * const [root] = useStorageRoot();
 */
const _useStorageRoot: TypedBundle["useStorageRoot"] = useStorageRoot;

/**
 * useUpdateMyPresence is similar to useMyPresence but it only returns the function to update the current user presence.
 * If you don't use the current user presence in your component, but you need to update it (e.g. live cursor), it's better to use useUpdateMyPresence to avoid unnecessary renders.
 *
 * @example
 * const updateMyPresence = useUpdateMyPresence();
 * updateMyPresence({ x: 0 });
 * updateMyPresence({ y: 0 });
 *
 * // At the next render, the presence of the current user will be equal to "{ x: 0, y: 0 }"
 */
const _useUpdateMyPresence: TypedBundle["useUpdateMyPresence"] =
  useUpdateMyPresence;

export {
  CreateThreadError,
  RoomContext,
  _RoomProvider as RoomProvider,
  _useAddReaction as useAddReaction,
  useBatch,
  _useBroadcastEvent as useBroadcastEvent,
  useCanRedo,
  useCanUndo,
  // TODO: Move to `liveblocks-react-lexical`
  useCommentsErrorListener,
  useCreateComment,
  _useCreateThread as useCreateThread,
  useDeleteComment,
  _useDeleteThread as useDeleteThread,
  useEditComment,
  _useEditThreadMetadata as useEditThreadMetadata,
  useErrorListener,
  _useEventListener as useEventListener,
  useHistory,
  useHistoryVersionData,
  _useHistoryVersions as useHistoryVersions,
  _useHistoryVersionsSuspense as useHistoryVersionsSuspense,
  _useIsInsideRoom as useIsInsideRoom,
  useLostConnectionListener,
  useMarkThreadAsRead,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
  _useMutation as useMutation,
  _useMyPresence as useMyPresence,
  _useOther as useOther,
  _useOthers as useOthers,
  useOthersConnectionIds,
  useOthersConnectionIdsSuspense,
  _useOthersListener as useOthersListener,
  _useOthersMapped as useOthersMapped,
  _useOthersMappedSuspense as useOthersMappedSuspense,
  _useOthersSuspense as useOthersSuspense,
  _useOtherSuspense as useOtherSuspense,
  useRedo,
  useRemoveReaction,
  _useRoom as useRoom,
  useRoomNotificationSettings,
  _useSelf as useSelf,
  _useSelfSuspense as useSelfSuspense,
  useStatus,
  _useStorage as useStorage,
  _useStorageRoot as useStorageRoot,
  useStorageStatus,
  useStorageStatusSuspense,
  _useStorageSuspense as useStorageSuspense,
  _useThreads as useThreads,
  _useThreadsSuspense as useThreadsSuspense,
  useThreadSubscription,
  useUndo,
  _useUpdateMyPresence as useUpdateMyPresence,
  useUpdateRoomNotificationSettings,
};
