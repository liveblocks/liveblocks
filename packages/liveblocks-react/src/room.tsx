import type {
  BaseMetadata,
  BaseUserMeta,
  BroadcastOptions,
  Client,
  CommentData,
  History,
  Json,
  JsonObject,
  LiveObject,
  LostConnectionEvent,
  LsonObject,
  OthersEvent,
  Room,
  Status,
  ThreadData,
  User,
} from "@liveblocks/client";
import { shallow } from "@liveblocks/client";
import type {
  AsyncResult,
  CommentsEventServerMsg,
  DE,
  DM,
  DP,
  DS,
  DU,
  EnterOptions,
  IYjsProvider,
  LiveblocksErrorContext,
  MentionData,
  OpaqueClient,
  RoomEventMessage,
  RoomSubscriptionSettings,
  SignalType,
  TextEditorType,
  ToImmutable,
  UnsubscribeCallback,
} from "@liveblocks/core";
import {
  assert,
  console,
  createCommentId,
  createThreadId,
  DefaultMap,
  errorIf,
  getSubscriptionKey,
  HttpError,
  kInternal,
  makePoller,
  ServerMsgCode,
  stableStringify,
} from "@liveblocks/core";
import type { Context } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  version as reactVersion,
} from "react";

import { config } from "./config";
import {
  RoomContext,
  useClient,
  useIsInsideRoom,
  useRoomOrNull,
} from "./contexts";
import { ensureNotServerSide } from "./lib/ssr";
import { useInitial } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { use } from "./lib/use-polyfill";
import {
  createSharedContext,
  getUmbrellaStoreForClient,
  LiveblocksProviderWithClient,
} from "./liveblocks";
import type {
  AttachmentUrlAsyncResult,
  CommentReactionOptions,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  HistoryVersionDataAsyncResult,
  HistoryVersionsAsyncResult,
  HistoryVersionsAsyncSuccess,
  MutationContext,
  OmitFirstArg,
  RoomContextBundle,
  RoomProviderProps,
  RoomSubscriptionSettingsAsyncResult,
  RoomSubscriptionSettingsAsyncSuccess,
  SearchCommentsAsyncResult,
  ThreadsAsyncResult,
  ThreadsAsyncSuccess,
  ThreadSubscription,
  UseSearchCommentsOptions,
  UseThreadsOptions,
} from "./types";
import type { UmbrellaStore } from "./umbrella-store";
import { makeRoomThreadsQueryKey } from "./umbrella-store";
import { useScrollToCommentOnLoadEffect } from "./use-scroll-to-comment-on-load-effect";
import { useSignal } from "./use-signal";
import { useSyncExternalStoreWithSelector } from "./use-sync-external-store-with-selector";

const noop = () => {};
const identity: <T>(x: T) => T = (x) => x;

const STABLE_EMPTY_LIST = Object.freeze([]);

// Don't try to inline this. This function is intended to be a stable
// reference, to avoid a useCallback() wrapper.
function alwaysEmptyList() {
  return STABLE_EMPTY_LIST;
}

// Don't try to inline this. This function is intended to be a stable
// reference, to avoid a useCallback() wrapper.
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

function getCurrentUserId(client: Client): string {
  const userId = client[kInternal].currentUserId.get();
  if (userId === undefined) {
    return "anonymous";
  }
  return userId;
}

const _extras = new WeakMap<
  OpaqueClient,
  ReturnType<typeof makeRoomExtrasForClient>
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
function getRoomExtrasForClient<M extends BaseMetadata>(client: OpaqueClient) {
  let extras = _extras.get(client);
  if (!extras) {
    extras = makeRoomExtrasForClient(client);
    _extras.set(client, extras);
  }

  return extras as unknown as Omit<typeof extras, "store"> & {
    store: UmbrellaStore<M>;
  };
}

function makeRoomExtrasForClient(client: OpaqueClient) {
  const store = getUmbrellaStoreForClient(client);

  function onMutationFailure(
    optimisticId: string,
    context: LiveblocksErrorContext & { roomId: string },
    innerError: Error
  ): void {
    store.optimisticUpdates.remove(optimisticId);

    // All mutation failures are expected to be HTTP errors ultimately - only
    // ever notify the user about those.
    if (innerError instanceof HttpError) {
      // Always log details about 403 Forbidden errors to the console as well
      if (innerError.status === 403) {
        const detailedMessage = [
          innerError.message,
          innerError.details?.suggestion,
          innerError.details?.docs,
        ]
          .filter(Boolean)
          .join("\n");

        console.error(detailedMessage);
      }

      client[kInternal].emitError(context, innerError);
    } else {
      // In this context, a non-HTTP error is unexpected and should be
      // considered a bug we should get fixed. Don't notify the user about it.
      throw innerError;
    }
  }

  const threadsPollersByRoomId = new DefaultMap((roomId: string) =>
    makePoller(
      async (signal) => {
        try {
          return await store.fetchRoomThreadsDeltaUpdate(roomId, signal);
        } catch (err) {
          console.warn(`Polling new threads for '${roomId}' failed: ${String(err)}`); // prettier-ignore
          throw err;
        }
      },
      config.ROOM_THREADS_POLL_INTERVAL,
      { maxStaleTimeMs: config.ROOM_THREADS_MAX_STALE_TIME }
    )
  );

  const versionsPollersByRoomId = new DefaultMap((roomId: string) =>
    makePoller(
      async (signal) => {
        try {
          return await store.fetchRoomVersionsDeltaUpdate(roomId, signal);
        } catch (err) {
          console.warn(`Polling new history versions for '${roomId}' failed: ${String(err)}`); // prettier-ignore
          throw err;
        }
      },
      config.HISTORY_VERSIONS_POLL_INTERVAL,
      { maxStaleTimeMs: config.HISTORY_VERSIONS_MAX_STALE_TIME }
    )
  );

  const roomSubscriptionSettingsPollersByRoomId = new DefaultMap(
    (roomId: string) =>
      makePoller(
        async (signal) => {
          try {
            return await store.refreshRoomSubscriptionSettings(roomId, signal);
          } catch (err) {
            console.warn(`Polling subscription settings for '${roomId}' failed: ${String(err)}`); // prettier-ignore
            throw err;
          }
        },
        config.ROOM_SUBSCRIPTION_SETTINGS_POLL_INTERVAL,
        { maxStaleTimeMs: config.ROOM_SUBSCRIPTION_SETTINGS_MAX_STALE_TIME }
      )
  );

  return {
    store,
    onMutationFailure,
    pollThreadsForRoomId: (roomId: string) => {
      const threadsPoller = threadsPollersByRoomId.getOrCreate(roomId);

      // If there's a threads poller for this room, immediately trigger it
      if (threadsPoller) {
        threadsPoller.markAsStale();
        threadsPoller.pollNowIfStale();
      }
    },
    getOrCreateThreadsPollerForRoomId: threadsPollersByRoomId.getOrCreate.bind(
      threadsPollersByRoomId
    ),
    getOrCreateVersionsPollerForRoomId:
      versionsPollersByRoomId.getOrCreate.bind(versionsPollersByRoomId),
    getOrCreateSubscriptionSettingsPollerForRoomId:
      roomSubscriptionSettingsPollersByRoomId.getOrCreate.bind(
        roomSubscriptionSettingsPollersByRoomId
      ),
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
        {/* @ts-expect-error {...props} is the same type as props */}
        <RoomProvider {...props} />
      </LiveblocksProviderWithClient>
    );
  }

  const shared = createSharedContext<U>(client);

  const bundle: RoomContextBundle<P, S, U, E, M> = {
    RoomContext: RoomContext as Context<TRoom | null>,
    RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

    useRoom,
    useStatus,

    useBroadcastEvent,
    useOthersListener,
    useLostConnectionListener,
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
    useSearchComments,

    useCreateThread,
    useDeleteThread,
    useEditThreadMetadata,
    useMarkThreadAsResolved,
    useMarkThreadAsUnresolved,
    useSubscribeToThread,
    useUnsubscribeFromThread,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
    useMarkThreadAsRead,
    useThreadSubscription,
    useAttachmentUrl,

    useHistoryVersions,
    useHistoryVersionData,

    useRoomSubscriptionSettings,
    useUpdateRoomSubscriptionSettings,

    ...shared.classic,

    suspense: {
      RoomContext: RoomContext as Context<TRoom | null>,
      RoomProvider: RoomProvider_withImplicitLiveblocksProvider,

      useRoom,
      useStatus,

      useBroadcastEvent,
      useOthersListener,
      useLostConnectionListener,
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
      useSubscribeToThread,
      useUnsubscribeFromThread,
      useCreateComment,
      useEditComment,
      useDeleteComment,
      useAddReaction,
      useRemoveReaction,
      useMarkThreadAsRead,
      useThreadSubscription,
      useAttachmentUrl: useAttachmentUrlSuspense,

      // TODO: useHistoryVersionData: useHistoryVersionDataSuspense,
      useHistoryVersions: useHistoryVersionsSuspense,

      useRoomSubscriptionSettings: useRoomSubscriptionSettingsSuspense,
      useUpdateRoomSubscriptionSettings,

      ...shared.suspense,
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
  M extends BaseMetadata,
>(props: RoomProviderProps<P, S>) {
  const client = useClient<U>();
  const [cache] = useState(
    () => new Map<string, RoomLeavePair<P, S, U, E, M>>()
  );

  // Produce a version of client.enterRoom() that when called for the same
  // room ID multiple times, will not keep producing multiple leave
  // functions, but instead return the cached one.
  const stableEnterRoom: typeof client.enterRoom<P, S, E, M> = useCallback(
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

    const majorReactVersion = parseInt(reactVersion) || 1;
    const requiredVersion = 18;
    errorIf(
      majorReactVersion < requiredVersion,
      `React ${requiredVersion} or higher is required (you’re on ${reactVersion})`
    );
  }

  // Note: We'll hold on to the initial value given here, and ignore any
  // changes to this argument in subsequent renders, except when roomId changes
  const frozenProps = useInitial(
    {
      initialPresence: props.initialPresence,
      initialStorage: props.initialStorage,
      autoConnect: props.autoConnect ?? typeof window !== "undefined",
      engine: props.engine,
    },
    roomId
  ) as EnterOptions<P, S>;

  const [{ room }, setRoomLeavePair] = useState(() =>
    stableEnterRoom(roomId, {
      ...frozenProps,
      autoConnect: false, // Deliberately using false here on the first render, see below
    })
  );

  useEffect(() => {
    const { store } = getRoomExtrasForClient(client);

    async function handleCommentEvent(message: CommentsEventServerMsg) {
      // If thread deleted event is received, we remove the thread from the local cache
      // no need for more processing
      if (message.type === ServerMsgCode.THREAD_DELETED) {
        store.deleteThread(message.threadId, null);
        return;
      }

      // TODO: Error handling
      const info = await room.getThread(message.threadId);

      // If no thread info was returned (i.e., 404), we remove the thread and relevant inbox notifications from local cache.
      if (!info.thread) {
        store.deleteThread(message.threadId, null);
        return;
      }
      const {
        thread,
        inboxNotification: maybeNotification,
        subscription: maybeSubscription,
      } = info;

      const existingThread = store.outputs.threads
        .get()
        .getEvenIfDeleted(message.threadId);

      switch (message.type) {
        case ServerMsgCode.COMMENT_EDITED:
        case ServerMsgCode.THREAD_METADATA_UPDATED:
        case ServerMsgCode.THREAD_UPDATED:
        case ServerMsgCode.COMMENT_REACTION_ADDED:
        case ServerMsgCode.COMMENT_REACTION_REMOVED:
        case ServerMsgCode.COMMENT_DELETED:
          // If the thread doesn't exist in the local cache, we do not update it with the server data as an optimistic update could have deleted the thread locally.
          if (!existingThread) break;

          store.updateThreadifications(
            [thread],
            maybeNotification ? [maybeNotification] : [],
            maybeSubscription ? [maybeSubscription] : []
          );
          break;

        case ServerMsgCode.COMMENT_CREATED:
          store.updateThreadifications(
            [thread],
            maybeNotification ? [maybeNotification] : [],
            maybeSubscription ? [maybeSubscription] : []
          );
          break;
        default:
          break;
      }
    }

    return room.events.comments.subscribe(
      (message) => void handleCommentEvent(message)
    );
  }, [client, room]);

  useEffect(() => {
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
>(options?: { allowOutsideRoom: false }): Room<P, S, U, E, M>;
function useRoom<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
>(options: { allowOutsideRoom: boolean }): Room<P, S, U, E, M> | null;
function useRoom<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
>(options?: { allowOutsideRoom: boolean }): Room<P, S, U, E, M> | null {
  const room = useRoomOrNull<P, S, U, E, M>();
  if (room === null && !options?.allowOutsideRoom) {
    throw new Error("RoomProvider is missing from the React tree.");
  }
  return room;
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

/** @private - Internal API, do not rely on it. */
function useReportTextEditor(editor: TextEditorType, rootKey: string): void {
  const isReported = useRef<boolean>(false);
  const room = useRoom();

  useEffect(() => {
    // We use a "locker" reference to avoid to spam / harass our backend
    // and to not add / remove subscribers in case when the text editor type
    // has been already reported.
    if (isReported.current) {
      return;
    }

    const unsubscribe = room.events.status.subscribe((status: Status): void => {
      if (status === "connected" && !isReported.current) {
        isReported.current = true;
        // We do not catch because this method never throw (e.g `rawPost`)
        void room[kInternal].reportTextEditor(editor, rootKey);
      }
    });

    return unsubscribe;
  }, [room, editor, rootKey]);
}

/** @private - Internal API, do not rely on it. */
function useYjsProvider(): IYjsProvider | undefined {
  const room = useRoom();

  const subscribe = useCallback(
    (onStoreChange: () => void): UnsubscribeCallback => {
      return room[kInternal].yjsProviderDidChange.subscribe(onStoreChange);
    },
    [room]
  );

  const getSnapshot = useCallback((): IYjsProvider | undefined => {
    return room[kInternal].getYjsProvider();
  }, [room]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @private - Internal API, do not rely on it. */
function useCreateTextMention(): (
  mentionId: string,
  mention: MentionData
) => void {
  const room = useRoom();
  return useCallback(
    (mentionId: string, mention: MentionData): void => {
      room[kInternal]
        .createTextMention(mentionId, mention)
        .catch((err): void => {
          console.error(
            `Cannot create text mention for mention '${mentionId}'`,
            err
          );
        });
    },
    [room]
  );
}

/** @private - Internal API, do not rely on it. */
function useDeleteTextMention(): (mentionId: string) => void {
  const room = useRoom();
  return useCallback(
    (mentionId: string): void => {
      room[kInternal].deleteTextMention(mentionId).catch((err): void => {
        console.error(`Cannot delete text mention '${mentionId}'`, err);
      });
    },
    [room]
  );
}

/** @private - Internal API, do not rely on it. */
function useResolveMentionSuggestions() {
  const client = useClient();
  return client[kInternal].resolveMentionSuggestions;
}

/** @private - Internal API, do not rely on it. */
function useMentionSuggestionsCache() {
  const client = useClient();
  return client[kInternal].mentionSuggestionsCache;
}

function useBroadcastEvent<E extends Json>(): (
  event: E,
  options?: BroadcastOptions
) => void {
  const room = useRoom<never, never, never, E, never>();
  return useCallback(
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
  useEffect(
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
  useEffect(
    () =>
      room.events.lostConnection.subscribe((event) =>
        savedCallback.current(event)
      ),
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
  useEffect(() => {
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
  const wrappedSelector = useCallback(
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
  const wrappedSelector = useCallback(
    (others: readonly User<P, U>[]) =>
      others.map((other) => [other.connectionId, itemSelector(other)] as const),
    [itemSelector]
  );

  const wrappedIsEqual = useCallback(
    (
      a: ReadonlyArray<readonly [connectionId: number, data: T]>,
      b: ReadonlyArray<readonly [connectionId: number, data: T]>
    ): boolean => {
      const eq = itemIsEqual ?? Object.is;
      return (
        a.length === b.length &&
        a.every((atuple, index) => {
          // We know btuple always exist because we checked the array length on the previous line
          const btuple = b[index]!;
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
  const wrappedSelector = useCallback(
    (others: readonly User<P, U>[]) => {
      // TODO: Make this O(1) instead of O(n)?
      const other = others.find((other) => other.connectionId === connectionId);
      return other !== undefined ? selector(other) : NOT_FOUND;
    },
    [connectionId, selector]
  );

  const wrappedIsEqual = useCallback(
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

  const wrappedSelector = useCallback(
    (rootOrNull: Snapshot): Selection =>
      rootOrNull !== null ? selector(rootOrNull) : null,
    [selector]
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      rootOrNull !== null
        ? room.subscribe(rootOrNull, onStoreChange, { isDeep: true })
        : noop,
    [room, rootOrNull]
  );

  const getSnapshot = useCallback((): Snapshot => {
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
  return useMemo(
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
  options: UseThreadsOptions<M> = {}
): ThreadsAsyncResult<M> {
  const { scrollOnLoad = true } = options;

  const client = useClient();
  const room = useRoom();
  const { store, getOrCreateThreadsPollerForRoomId } =
    getRoomExtrasForClient<M>(client);
  const queryKey = makeRoomThreadsQueryKey(room.id, options.query);

  const poller = getOrCreateThreadsPollerForRoomId(room.id);

  useEffect(
    () =>
      void store.outputs.loadingRoomThreads
        .getOrCreate(queryKey)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => poller.dec();
  }, [poller]);

  const result = useSignal(
    store.outputs.loadingRoomThreads.getOrCreate(queryKey).signal
  );

  useScrollToCommentOnLoadEffect(scrollOnLoad, result);
  return result;
}

function useSearchComments<M extends BaseMetadata>(
  options: UseSearchCommentsOptions<M>
): SearchCommentsAsyncResult {
  const [result, setResult] = useState<SearchCommentsAsyncResult>({
    isLoading: true,
  });

  const currentRequestInfo = useRef<{
    id: number;
    controller: AbortController;
  } | null>(null);

  const timeout = useRef<number | null>(null);

  const client = useClient();
  const room = useRoom();

  const queryKey = stableStringify([room.id, options.query]);

  useEffect(() => {
    const currentRequestId = (currentRequestInfo.current?.id ?? 0) + 1;
    const controller = new AbortController();

    currentRequestInfo.current = { id: currentRequestId, controller };
    setResult((result) => {
      if (result.isLoading) return result;
      // **NOTE**: Should we keep the old result but only set loading to true.
      // All our other hooks (useThreads) is defined in the way so that if the result is loading, the result is undefined.
      return { isLoading: true };
    });

    timeout.current = window.setTimeout(() => {
      client[kInternal].httpClient
        .searchComments(
          {
            roomId: room.id,
            query: options.query,
          },
          { signal: controller.signal }
        )
        .then(({ data }) => {
          // If the request was aborted, we do not update the result received from this request as it may be stale.
          if (controller.signal.aborted) return;

          // If a new request was made while this request was in flight, we do not update the result received from this request as it may be stale.
          if (currentRequestInfo.current?.id !== currentRequestId) return;

          setResult({ isLoading: false, results: data });

          // Clear the current request info to avoid stale results from the next request.
          currentRequestInfo.current = null;
        })
        .catch((err) => {
          // If the request was aborted, we do not update the result received from this request as it may be stale.
          if (controller.signal.aborted) return;

          // If a new request was made while this request was in flight, we do not update the result received from this request as it may be stale.
          if (currentRequestInfo.current?.id !== currentRequestId) return;

          setResult({ isLoading: false, error: err as Error });

          // Clear the current request info to avoid stale results from the next request.
          currentRequestInfo.current = null;
        });
    }, 300 /* debounce time */);

    return () => {
      // If there is a timeout in progress, cancel it before we initiate a new one
      if (timeout.current !== null) {
        window.clearTimeout(timeout.current);
      }

      // Cancel any in-flight request and initiate a new request
      if (currentRequestInfo.current !== null) {
        currentRequestInfo.current.controller.abort();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, client, room.id]);

  return result;
}

function useCreateThread<M extends BaseMetadata>(): (
  options: CreateThreadOptions<M>
) => ThreadData<M> {
  return useCreateRoomThread(useRoom().id);
}

/**
 * @private
 */
function useCreateRoomThread<M extends BaseMetadata>(
  roomId: string
): (options: CreateThreadOptions<M>) => ThreadData<M> {
  const client = useClient();

  return useCallback(
    (options: CreateThreadOptions<M>): ThreadData<M> => {
      const body = options.body;
      const metadata = options.metadata ?? ({} as M);
      const attachments = options.attachments;

      const threadId = createThreadId();
      const commentId = createCommentId();
      const createdAt = new Date();

      const newComment: CommentData = {
        id: commentId,
        threadId,
        roomId,
        createdAt,
        type: "comment",
        userId: getCurrentUserId(client),
        body,
        reactions: [],
        attachments: attachments ?? [],
      };
      const newThread: ThreadData<M> = {
        id: threadId,
        type: "thread",
        createdAt,
        updatedAt: createdAt,
        roomId,
        metadata,
        comments: [newComment],
        resolved: false,
      };

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "create-thread",
        thread: newThread,
        roomId,
      });

      const attachmentIds = attachments?.map((attachment) => attachment.id);

      client[kInternal].httpClient
        .createThread({
          roomId,
          threadId,
          commentId,
          body,
          metadata,
          attachmentIds,
        })
        .then(
          (thread) => {
            // Replace the optimistic update by the real thing
            store.createThread(optimisticId, thread);
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              {
                type: "CREATE_THREAD_ERROR",
                roomId,
                threadId,
                commentId,
                body,
                metadata,
              },
              err
            )
        );

      return newThread;
    },
    [client, roomId]
  );
}

function useDeleteThread(): (threadId: string) => void {
  return useDeleteRoomThread(useRoom().id);
}

function useDeleteRoomThread(roomId: string): (threadId: string) => void {
  const client = useClient();
  return useCallback(
    (threadId: string): void => {
      const { store, onMutationFailure } = getRoomExtrasForClient(client);

      const userId = getCurrentUserId(client);

      const existing = store.outputs.threads.get().get(threadId);
      if (existing?.comments?.[0]?.userId !== userId) {
        throw new Error("Only the thread creator can delete the thread");
      }

      const optimisticId = store.optimisticUpdates.add({
        type: "delete-thread",
        roomId,
        threadId,
        deletedAt: new Date(),
      });

      client[kInternal].httpClient.deleteThread({ roomId, threadId }).then(
        () => {
          // Replace the optimistic update by the real thing
          store.deleteThread(threadId, optimisticId);
        },
        (err: Error) =>
          onMutationFailure(
            optimisticId,
            { type: "DELETE_THREAD_ERROR", roomId, threadId },
            err
          )
      );
    },
    [client, roomId]
  );
}

function useEditThreadMetadata<M extends BaseMetadata>() {
  return useEditRoomThreadMetadata<M>(useRoom().id);
}

function useEditRoomThreadMetadata<M extends BaseMetadata>(roomId: string) {
  const client = useClient();
  return useCallback(
    (options: EditThreadMetadataOptions<M>): void => {
      if (!options.metadata) {
        return;
      }

      const threadId = options.threadId;
      const metadata = options.metadata;
      const updatedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "edit-thread-metadata",
        metadata,
        threadId,
        updatedAt,
      });

      client[kInternal].httpClient
        .editThreadMetadata({ roomId, threadId, metadata })
        .then(
          (metadata) =>
            // Replace the optimistic update by the real thing
            store.patchThread(threadId, optimisticId, { metadata }, updatedAt),
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              {
                type: "EDIT_THREAD_METADATA_ERROR",
                roomId,
                threadId,
                metadata,
              },
              err
            )
        );
    },
    [client, roomId]
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
  return useCreateRoomComment(useRoom().id);
}

/**
 * @private
 */
function useCreateRoomComment(
  roomId: string
): (options: CreateCommentOptions) => CommentData {
  const client = useClient();
  return useCallback(
    ({ threadId, body, attachments }: CreateCommentOptions): CommentData => {
      const commentId = createCommentId();
      const createdAt = new Date();

      const comment: CommentData = {
        id: commentId,
        threadId,
        roomId,
        type: "comment",
        createdAt,
        userId: getCurrentUserId(client),
        body,
        reactions: [],
        attachments: attachments ?? [],
      };

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "create-comment",
        comment,
      });

      const attachmentIds = attachments?.map((attachment) => attachment.id);

      client[kInternal].httpClient
        .createComment({ roomId, threadId, commentId, body, attachmentIds })
        .then(
          (newComment) => {
            // Replace the optimistic update by the real thing
            store.createComment(newComment, optimisticId);
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              {
                type: "CREATE_COMMENT_ERROR",
                roomId,
                threadId,
                commentId,
                body,
              },
              err
            )
        );

      return comment;
    },
    [client, roomId]
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
  return useEditRoomComment(useRoom().id);
}

/**
 * @private
 */
function useEditRoomComment(
  roomId: string
): (options: EditCommentOptions) => void {
  const client = useClient();
  return useCallback(
    ({ threadId, commentId, body, attachments }: EditCommentOptions): void => {
      const editedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const existing = store.outputs.threads.get().getEvenIfDeleted(threadId);

      if (existing === undefined) {
        console.warn(
          `Internal unexpected behavior. Cannot edit comment in thread "${threadId}" because the thread does not exist in the cache.`
        );
        return;
      }

      const comment = existing.comments.find(
        (comment) => comment.id === commentId
      );

      if (comment === undefined || comment.deletedAt !== undefined) {
        console.warn(
          `Internal unexpected behavior. Cannot edit comment "${commentId}" in thread "${threadId}" because the comment does not exist in the cache.`
        );
        return;
      }

      const optimisticId = store.optimisticUpdates.add({
        type: "edit-comment",
        comment: {
          ...comment,
          editedAt,
          body,
          attachments: attachments ?? [],
        },
      });

      const attachmentIds = attachments?.map((attachment) => attachment.id);

      client[kInternal].httpClient
        .editComment({ roomId, threadId, commentId, body, attachmentIds })
        .then(
          (editedComment) => {
            // Replace the optimistic update by the real thing
            store.editComment(threadId, optimisticId, editedComment);
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              { type: "EDIT_COMMENT_ERROR", roomId, threadId, commentId, body },
              err
            )
        );
    },
    [client, roomId]
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
  return useDeleteRoomComment(useRoom().id);
}

/**
 * @private
 */
function useDeleteRoomComment(roomId: string) {
  const client = useClient();

  return useCallback(
    ({ threadId, commentId }: DeleteCommentOptions): void => {
      const deletedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);

      const optimisticId = store.optimisticUpdates.add({
        type: "delete-comment",
        threadId,
        commentId,
        deletedAt,
        roomId,
      });

      client[kInternal].httpClient
        .deleteComment({ roomId, threadId, commentId })
        .then(
          () => {
            // Replace the optimistic update by the real thing
            store.deleteComment(threadId, optimisticId, commentId, deletedAt);
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              { type: "DELETE_COMMENT_ERROR", roomId, threadId, commentId },
              err
            )
        );
    },
    [client, roomId]
  );
}

function useAddReaction<M extends BaseMetadata>() {
  return useAddRoomCommentReaction<M>(useRoom().id);
}

/**
 * @private
 */
function useAddRoomCommentReaction<M extends BaseMetadata>(roomId: string) {
  const client = useClient();
  return useCallback(
    ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
      const createdAt = new Date();
      const userId = getCurrentUserId(client);

      const { store, onMutationFailure } = getRoomExtrasForClient<M>(client);

      const optimisticId = store.optimisticUpdates.add({
        type: "add-reaction",
        threadId,
        commentId,
        reaction: {
          emoji,
          userId,
          createdAt,
        },
      });

      client[kInternal].httpClient
        .addReaction({ roomId, threadId, commentId, emoji })
        .then(
          (addedReaction) => {
            // Replace the optimistic update by the real thing
            store.addReaction(
              threadId,
              optimisticId,
              commentId,
              addedReaction,
              createdAt
            );
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              {
                type: "ADD_REACTION_ERROR",
                roomId,
                threadId,
                commentId,
                emoji,
              },
              err
            )
        );
    },
    [client, roomId]
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
  return useRemoveRoomCommentReaction(useRoom().id);
}

/**
 * @private
 */
function useRemoveRoomCommentReaction(roomId: string) {
  const client = useClient();
  return useCallback(
    ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
      const userId = getCurrentUserId(client);

      const removedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "remove-reaction",
        threadId,
        commentId,
        emoji,
        userId,
        removedAt,
      });

      client[kInternal].httpClient
        .removeReaction({ roomId, threadId, commentId, emoji })
        .then(
          () => {
            // Replace the optimistic update by the real thing
            store.removeReaction(
              threadId,
              optimisticId,
              commentId,
              emoji,
              userId,
              removedAt
            );
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              {
                type: "REMOVE_REACTION_ERROR",
                roomId,
                threadId,
                commentId,
                emoji,
              },
              err
            )
        );
    },
    [client, roomId]
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
  return useMarkRoomThreadAsRead(useRoom().id);
}

/**
 * @private
 */
function useMarkRoomThreadAsRead(roomId: string) {
  const client = useClient();
  return useCallback(
    (threadId: string) => {
      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const inboxNotification = Object.values(
        store.outputs.notifications.get().notificationsById
      ).find(
        (inboxNotification) =>
          inboxNotification.kind === "thread" &&
          inboxNotification.threadId === threadId
      );

      if (!inboxNotification) return;

      const now = new Date();

      const optimisticId = store.optimisticUpdates.add({
        type: "mark-inbox-notification-as-read",
        inboxNotificationId: inboxNotification.id,
        readAt: now,
      });

      client[kInternal].httpClient
        .markRoomInboxNotificationAsRead({
          roomId,
          inboxNotificationId: inboxNotification.id,
        })
        .then(
          () => {
            // Replace the optimistic update by the real thing
            store.markInboxNotificationRead(
              inboxNotification.id,
              now,
              optimisticId
            );
          },
          (err: Error) => {
            onMutationFailure(
              optimisticId,
              {
                type: "MARK_INBOX_NOTIFICATION_AS_READ_ERROR",
                roomId,
                inboxNotificationId: inboxNotification.id,
              },
              err
            );
            return;
          }
        );
    },
    [client, roomId]
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
  return useMarkRoomThreadAsResolved(useRoom().id);
}

/**
 * @private
 */
function useMarkRoomThreadAsResolved(roomId: string) {
  const client = useClient();
  return useCallback(
    (threadId: string) => {
      const updatedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "mark-thread-as-resolved",
        threadId,
        updatedAt,
      });

      client[kInternal].httpClient
        .markThreadAsResolved({ roomId, threadId })
        .then(
          () => {
            // Replace the optimistic update by the real thing
            store.patchThread(
              threadId,
              optimisticId,
              { resolved: true },
              updatedAt
            );
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              { type: "MARK_THREAD_AS_RESOLVED_ERROR", roomId, threadId },
              err
            )
        );
    },
    [client, roomId]
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
  return useMarkRoomThreadAsUnresolved(useRoom().id);
}

/**
 * @private
 */
function useMarkRoomThreadAsUnresolved(roomId: string) {
  const client = useClient();
  return useCallback(
    (threadId: string) => {
      const updatedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "mark-thread-as-unresolved",
        threadId,
        updatedAt,
      });

      client[kInternal].httpClient
        .markThreadAsUnresolved({ roomId, threadId })
        .then(
          () => {
            // Replace the optimistic update by the real thing
            store.patchThread(
              threadId,
              optimisticId,
              { resolved: false },
              updatedAt
            );
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              { type: "MARK_THREAD_AS_UNRESOLVED_ERROR", roomId, threadId },
              err
            )
        );
    },
    [client, roomId]
  );
}

/**
 * Returns a function that subscribes the user to a thread.
 *
 * @example
 * const subscribeToThread = useSubscribeToThread();
 * subscribeToThread("th_xxx");
 */
function useSubscribeToThread() {
  return useSubscribeToRoomThread(useRoom().id);
}

/**
 * @private
 */
function useSubscribeToRoomThread(roomId: string) {
  const client = useClient();

  return useCallback(
    (threadId: string) => {
      const subscribedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "subscribe-to-thread",
        threadId,
        subscribedAt,
      });

      client[kInternal].httpClient.subscribeToThread({ roomId, threadId }).then(
        (subscription) => {
          store.createSubscription(subscription, optimisticId);
        },
        (err: Error) =>
          onMutationFailure(
            optimisticId,
            { type: "SUBSCRIBE_TO_THREAD_ERROR", roomId, threadId },
            err
          )
      );
    },
    [client, roomId]
  );
}

/**
 * Returns a function that unsubscribes the user from a thread.
 *
 * @example
 * const unsubscribeFromThread = useUnsubscribeFromThread();
 * unsubscribeFromThread("th_xxx");
 */
function useUnsubscribeFromThread() {
  return useUnsubscribeFromRoomThread(useRoom().id);
}

/**
 * @private
 */
function useUnsubscribeFromRoomThread(roomId: string) {
  const client = useClient();

  return useCallback(
    (threadId: string) => {
      const unsubscribedAt = new Date();

      const { store, onMutationFailure } = getRoomExtrasForClient(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "unsubscribe-from-thread",
        threadId,
        unsubscribedAt,
      });

      client[kInternal].httpClient
        .unsubscribeFromThread({ roomId, threadId })
        .then(
          () => {
            store.deleteSubscription(
              getSubscriptionKey("thread", threadId),
              optimisticId
            );
          },
          (err: Error) =>
            onMutationFailure(
              optimisticId,
              { type: "UNSUBSCRIBE_FROM_THREAD_ERROR", roomId, threadId },
              err
            )
        );
    },
    [client, roomId]
  );
}

/**
 * Returns the subscription status of a thread, methods to update it, and when
 * the thread was last read.
 *
 * @example
 * const { status, subscribe, unsubscribe, unreadSince } = useThreadSubscription("th_xxx");
 */
function useThreadSubscription(threadId: string): ThreadSubscription {
  return useRoomThreadSubscription(useRoom().id, threadId);
}

/**
 * @private
 */
function useRoomThreadSubscription(
  roomId: string,
  threadId: string
): ThreadSubscription {
  const client = useClient();
  const { store } = getRoomExtrasForClient(client);
  const subscriptionKey = useMemo(
    () => getSubscriptionKey("thread", threadId),
    [threadId]
  );
  const subscribeToThread = useSubscribeToRoomThread(roomId);
  const unsubscribeFromThread = useUnsubscribeFromRoomThread(roomId);
  const subscribe = useCallback(
    () => subscribeToThread(threadId),
    [subscribeToThread, threadId]
  );
  const unsubscribe = useCallback(
    () => unsubscribeFromThread(threadId),
    [unsubscribeFromThread, threadId]
  );

  const signal = store.outputs.threadSubscriptions;

  const selector = useCallback(
    (state: SignalType<typeof signal>): ThreadSubscription => {
      const subscription = state.subscriptions[subscriptionKey];
      const notification = state.notifications.find(
        (inboxNotification) =>
          inboxNotification.kind === "thread" &&
          inboxNotification.threadId === threadId
      );

      if (subscription === undefined) {
        return { status: "not-subscribed", subscribe, unsubscribe };
      }

      return {
        status: "subscribed",
        unreadSince: notification?.readAt ?? null,
        subscribe,
        unsubscribe,
      };
    },
    [subscriptionKey, threadId, subscribe, unsubscribe]
  );

  return useSignal(signal, selector, shallow);
}

/**
 * Returns the user's subscription settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
 */
function useRoomSubscriptionSettings(): [
  RoomSubscriptionSettingsAsyncResult,
  (settings: Partial<RoomSubscriptionSettings>) => void,
] {
  const updateRoomSubscriptionSettings = useUpdateRoomSubscriptionSettings();
  const client = useClient();
  const room = useRoom();
  const { store, getOrCreateSubscriptionSettingsPollerForRoomId } =
    getRoomExtrasForClient(client);

  const poller = getOrCreateSubscriptionSettingsPollerForRoomId(room.id);

  useEffect(
    () =>
      void store.outputs.roomSubscriptionSettingsByRoomId
        .getOrCreate(room.id)
        .waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => {
      poller.dec();
    };
  }, [poller]);

  const settings = useSignal(
    store.outputs.roomSubscriptionSettingsByRoomId.getOrCreate(room.id).signal
  );

  return useMemo(() => {
    return [settings, updateRoomSubscriptionSettings];
  }, [settings, updateRoomSubscriptionSettings]);
}

/**
 * Returns the user's subscription settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
 */
function useRoomSubscriptionSettingsSuspense(): [
  RoomSubscriptionSettingsAsyncSuccess,
  (settings: Partial<RoomSubscriptionSettings>) => void,
] {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const store = getRoomExtrasForClient(client).store;
  const room = useRoom();

  // Suspend until there are at least some inbox notifications
  use(
    store.outputs.roomSubscriptionSettingsByRoomId
      .getOrCreate(room.id)
      .waitUntilLoaded()
  );

  // We're in a Suspense world here, and as such, the useRoomSubscriptionSettings()
  // hook is expected to only return success results when we're here.
  const [settings, updateRoomSubscriptionSettings] =
    useRoomSubscriptionSettings();
  assert(!settings.error, "Did not expect error");
  assert(!settings.isLoading, "Did not expect loading");

  return useMemo(() => {
    return [settings, updateRoomSubscriptionSettings];
  }, [settings, updateRoomSubscriptionSettings]);
}

/**
 * Returns the version data bianry for a given version
 *
 * @example
 * const {data} = useHistoryVersionData(versionId);
 */
function useHistoryVersionData(
  versionId: string
): HistoryVersionDataAsyncResult {
  const [state, setState] = useState<HistoryVersionDataAsyncResult>({
    isLoading: true,
  });
  const room = useRoom();
  useEffect(() => {
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
 * (Private beta) Returns a history of versions of the current room.
 *
 * @example
 * const { versions, error, isLoading } = useHistoryVersions();
 */
function useHistoryVersions(): HistoryVersionsAsyncResult {
  const client = useClient();
  const room = useRoom();

  const { store, getOrCreateVersionsPollerForRoomId } =
    getRoomExtrasForClient(client);

  const poller = getOrCreateVersionsPollerForRoomId(room.id);

  useEffect(() => {
    poller.inc();
    poller.pollNowIfStale();
    return () => poller.dec();
  }, [poller]);

  useEffect(
    () =>
      void store.outputs.versionsByRoomId.getOrCreate(room.id).waitUntilLoaded()

    // NOTE: Deliberately *not* using a dependency array here!
    //
    // It is important to call waitUntil on *every* render.
    // This is harmless though, on most renders, except:
    // 1. The very first render, in which case we'll want to trigger the initial page fetch.
    // 2. All other subsequent renders now "just" return the same promise (a quick operation).
    // 3. If ever the promise would fail, then after 5 seconds it would reset, and on the very
    //    *next* render after that, a *new* fetch/promise will get created.
  );

  return useSignal(store.outputs.versionsByRoomId.getOrCreate(room.id).signal);
}

/**
 * (Private beta) Returns a history of versions of the current room.
 *
 * @example
 * const { versions } = useHistoryVersions();
 */
function useHistoryVersionsSuspense(): HistoryVersionsAsyncSuccess {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const room = useRoom();
  const store = getRoomExtrasForClient(client).store;

  use(store.outputs.versionsByRoomId.getOrCreate(room.id).waitUntilLoaded());

  const result = useHistoryVersions();
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

/**
 * Returns a function that updates the user's subscription settings
 * for the current room.
 *
 * @example
 * const updateRoomSubscriptionSettings = useUpdateRoomSubscriptionSettings();
 * updateRoomSubscriptionSettings({ threads: "all" });
 */
function useUpdateRoomSubscriptionSettings() {
  const client = useClient();
  const room = useRoom();
  return useCallback(
    (settings: Partial<RoomSubscriptionSettings>) => {
      const { store, onMutationFailure, pollThreadsForRoomId } =
        getRoomExtrasForClient(client);
      const userId = getCurrentUserId(client);
      const optimisticId = store.optimisticUpdates.add({
        type: "update-room-subscription-settings",
        roomId: room.id,
        userId,
        settings,
      });

      room.updateSubscriptionSettings(settings).then(
        (udpatedSettings) => {
          // Replace the optimistic update by the real thing
          store.updateRoomSubscriptionSettings(
            room.id,
            optimisticId,
            udpatedSettings
          );

          // If the `threads` settings are changed, trigger a polling to update thread subscriptions
          if (settings.threads) {
            pollThreadsForRoomId(room.id);
          }
        },
        (err: Error) =>
          onMutationFailure(
            optimisticId,
            {
              type: "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR",
              roomId: room.id,
            },
            err
          )
      );
    },
    [client, room]
  );
}

function useSuspendUntilPresenceReady(): void {
  // Throw error if we're calling this hook server side
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
  // Throw error if we're calling this hook server side
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

function useThreadsSuspense<M extends BaseMetadata>(
  options: UseThreadsOptions<M> = {}
): ThreadsAsyncSuccess<M> {
  // Throw error if we're calling this hook server side
  ensureNotServerSide();

  const client = useClient();
  const room = useRoom();

  const { store } = getRoomExtrasForClient<M>(client);
  const queryKey = makeRoomThreadsQueryKey(room.id, options.query);

  use(store.outputs.loadingRoomThreads.getOrCreate(queryKey).waitUntilLoaded());

  const result = useThreads(options);
  assert(!result.error, "Did not expect error");
  assert(!result.isLoading, "Did not expect loading");
  return result;
}

function selectorFor_useAttachmentUrl(
  state: AsyncResult<string | undefined> | undefined
): AttachmentUrlAsyncResult {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  // For now `useAttachmentUrl` doesn't support a custom resolver so this case
  // will never happen as `getAttachmentUrl` will either return a URL or throw.
  // But we might decide to offer a custom resolver in the future to allow
  // self-hosting attachments.
  assert(state.data !== undefined, "Unexpected missing attachment URL");

  return {
    isLoading: false,
    url: state.data,
  };
}

/**
 * Returns a presigned URL for an attachment by its ID.
 *
 * @example
 * const { url, error, isLoading } = useAttachmentUrl("at_xxx");
 */
function useAttachmentUrl(attachmentId: string): AttachmentUrlAsyncResult {
  const room = useRoom();
  return useRoomAttachmentUrl(attachmentId, room.id);
}

/**
 * @private For internal use only. Do not rely on this hook. Use `useAttachmentUrl` instead.
 */
function useRoomAttachmentUrl(
  attachmentId: string,
  roomId: string
): AttachmentUrlAsyncResult {
  const client = useClient();
  const store =
    client[kInternal].httpClient.getOrCreateAttachmentUrlsStore(roomId);

  const getAttachmentUrlState = useCallback(
    () => store.getItemState(attachmentId),
    [store, attachmentId]
  );

  useEffect(() => {
    void store.enqueue(attachmentId);
  }, [store, attachmentId]);

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    getAttachmentUrlState,
    getAttachmentUrlState,
    selectorFor_useAttachmentUrl,
    shallow
  );
}

/**
 * Returns a presigned URL for an attachment by its ID.
 *
 * @example
 * const { url } = useAttachmentUrl("at_xxx");
 */
function useAttachmentUrlSuspense(attachmentId: string) {
  const room = useRoom();
  const { attachmentUrlsStore } = room[kInternal];

  const getAttachmentUrlState = useCallback(
    () => attachmentUrlsStore.getItemState(attachmentId),
    [attachmentUrlsStore, attachmentId]
  );
  const attachmentUrlState = getAttachmentUrlState();

  if (!attachmentUrlState || attachmentUrlState.isLoading) {
    throw attachmentUrlsStore.enqueue(attachmentId);
  }

  if (attachmentUrlState.error) {
    throw attachmentUrlState.error;
  }

  const state = useSyncExternalStore(
    attachmentUrlsStore.subscribe,
    getAttachmentUrlState,
    getAttachmentUrlState
  );
  assert(state !== undefined, "Unexpected missing state");
  assert(!state.isLoading, "Unexpected loading state");
  assert(!state.error, "Unexpected error state");
  return {
    isLoading: false,
    url: state.data,
    error: undefined,
  } as const;
}

/**
 * @private For internal use only. Do not rely on this hook.
 */
function useRoomPermissions(roomId: string) {
  const client = useClient();
  const store = getRoomExtrasForClient(client).store;
  return useSignal(store.permissionHints.getPermissionForRoomΣ(roomId));
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
 * It is different from the setState function returned by the useState hook from
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
 * Returns the result of searching comments by text in the current room. The result includes the id and the plain text content of the matched comments along with the parent thread id of the comment.
 *
 * @example
 * const { results, error, isLoading } = useSearchComments({ query: { text: "hello"} });
 */
const _useSearchComments: TypedBundle["useSearchComments"] = useSearchComments;

/**
 * Returns the threads within the current room.
 *
 * @example
 * const { threads } = useThreads();
 */
const _useThreadsSuspense: TypedBundle["suspense"]["useThreads"] =
  useThreadsSuspense;

/**
 * Returns the user's subscription settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
 */
const _useRoomSubscriptionSettings: TypedBundle["useRoomSubscriptionSettings"] =
  useRoomSubscriptionSettings;

/**
 * Returns the user's subscription settings for the current room
 * and a function to update them.
 *
 * @example
 * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
 */
const _useRoomSubscriptionSettingsSuspense: TypedBundle["suspense"]["useRoomSubscriptionSettings"] =
  useRoomSubscriptionSettingsSuspense;

/**
 * (Private beta) Returns a history of versions of the current room.
 *
 * @example
 * const { versions, error, isLoading } = useHistoryVersions();
 */
const _useHistoryVersions: TypedBundle["useHistoryVersions"] =
  useHistoryVersions;

/**
 * (Private beta) Returns a history of versions of the current room.
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
  _RoomProvider as RoomProvider,
  _useAddReaction as useAddReaction,
  useAddRoomCommentReaction,
  useAttachmentUrl,
  useAttachmentUrlSuspense,
  _useBroadcastEvent as useBroadcastEvent,
  useCanRedo,
  useCanUndo,
  useCreateComment,
  useCreateRoomComment,
  useCreateRoomThread,
  useCreateTextMention,
  _useCreateThread as useCreateThread,
  useDeleteComment,
  useDeleteRoomComment,
  useDeleteRoomThread,
  useDeleteTextMention,
  _useDeleteThread as useDeleteThread,
  useEditComment,
  useEditRoomComment,
  useEditRoomThreadMetadata,
  _useEditThreadMetadata as useEditThreadMetadata,
  _useEventListener as useEventListener,
  useHistory,
  useHistoryVersionData,
  _useHistoryVersions as useHistoryVersions,
  _useHistoryVersionsSuspense as useHistoryVersionsSuspense,
  _useIsInsideRoom as useIsInsideRoom,
  useLostConnectionListener,
  useMarkRoomThreadAsRead,
  useMarkRoomThreadAsResolved,
  useMarkRoomThreadAsUnresolved,
  useMarkThreadAsRead,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
  useMentionSuggestionsCache,
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
  useRemoveRoomCommentReaction,
  useReportTextEditor,
  useResolveMentionSuggestions,
  _useRoom as useRoom,
  useRoomAttachmentUrl,
  useRoomPermissions,
  _useRoomSubscriptionSettings as useRoomSubscriptionSettings,
  _useRoomSubscriptionSettingsSuspense as useRoomSubscriptionSettingsSuspense,
  useRoomThreadSubscription,
  _useSearchComments as useSearchComments,
  _useSelf as useSelf,
  _useSelfSuspense as useSelfSuspense,
  useStatus,
  _useStorage as useStorage,
  _useStorageRoot as useStorageRoot,
  _useStorageSuspense as useStorageSuspense,
  useSubscribeToRoomThread,
  useSubscribeToThread,
  _useThreads as useThreads,
  _useThreadsSuspense as useThreadsSuspense,
  useThreadSubscription,
  useUndo,
  useUnsubscribeFromRoomThread,
  useUnsubscribeFromThread,
  _useUpdateMyPresence as useUpdateMyPresence,
  useUpdateRoomSubscriptionSettings,
  useYjsProvider,
};
