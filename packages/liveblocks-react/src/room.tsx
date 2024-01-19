import type {
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
  BaseMetadata,
  CacheStore,
  CommentData,
  CommentReaction,
  CommentsEventServerMsg,
  EnterOptions,
  RoomEventMessage,
  RoomNotificationSettings,
  ThreadData,
  ToImmutable,
} from "@liveblocks/core";
import {
  CommentsApiError,
  console,
  deprecateIf,
  errorIf,
  isLiveNode,
  kInternal,
  makeEventSource,
  makePoller,
  NotificationsApiError,
  ServerMsgCode,
  stringify,
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
} from "./comments/errors";
import { createCommentId, createThreadId } from "./comments/lib/createIds";
import { selectedThreads } from "./comments/lib/selected-threads";
import { upsertComment } from "./comments/lib/upsert-comment";
import { useInitial } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { useRerender } from "./lib/use-rerender";
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
  UseThreadsOptions,
} from "./types";

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

export const POLLING_INTERVAL = 5 * 60 * 1000;

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

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

function makeMutationContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>
): MutationContext<TPresence, TStorage, TUserMeta> {
  const errmsg =
    "This mutation cannot be used until connected to the Liveblocks room";

  return {
    get storage() {
      const mutableRoot = room.getStorageSnapshot();
      if (mutableRoot === null) {
        throw new Error(errmsg);
      }
      return mutableRoot;
    },

    get self() {
      const self = room.getSelf();
      if (self === null) {
        throw new Error(errmsg);
      }
      return self;
    },

    get others() {
      const others = room.getOthers();
      if (room.getSelf() === null) {
        throw new Error(errmsg);
      }
      return others;
    },

    setMyPresence: room.updatePresence,
  };
}

export const ContextBundle = React.createContext<RoomContextBundle<
  JsonObject,
  LsonObject,
  BaseUserMeta,
  never,
  BaseMetadata
> | null>(null);

/**
 * @private
 *
 * This is an internal API, use `createRoomContext` instead.
 */
export function useRoomContextBundle() {
  const bundle = React.useContext(ContextBundle);
  if (bundle === null) {
    throw new Error("RoomProvider is missing from the React tree.");
  }
  return bundle;
}

export function createRoomContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = never,
  TThreadMetadata extends BaseMetadata = never,
>(
  client: Client
): RoomContextBundle<
  TPresence,
  TStorage,
  TUserMeta,
  TRoomEvent,
  TThreadMetadata
> {
  type TRoom = Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  type TRoomLeavePair = { room: TRoom; leave: () => void };

  const RoomContext = React.createContext<TRoom | null>(null);

  const commentsErrorEventSource =
    makeEventSource<CommentsError<TThreadMetadata>>();

  const {
    useUser,
    suspense: { useUser: useUserSuspense },
  } = createSharedContext<TUserMeta>(client);

  /**
   * RATIONALE:
   * At the "Outer" RoomProvider level, we keep a cache and produce
   * a stableEnterRoom function, which we pass down to the real "Inner"
   * RoomProvider level.
   *
   * The purpose is to ensure that if `stableEnterRoom("my-room")` is called
   * multiple times for the same room ID, it will always return the exact same
   * (cached) value, so that in total only a single "leave" function gets
   * produced and registered in the client.
   *
   * If we didn't use this cache, then in React StrictMode
   * stableEnterRoom("my-room") might get called multiple (at least 4) times,
   * causing more leave functions to be produced in the client, some of which
   * we cannot get a hold on (because StrictMode would discard those results by
   * design). This would make it appear to the Client that the Room is still in
   * use by some party that hasn't called `leave()` on it yet, thus causing the
   * Room to not be freed and destroyed when the component unmounts later.
   */
  function RoomProviderOuter(props: RoomProviderProps<TPresence, TStorage>) {
    const [cache] = React.useState<Map<string, TRoomLeavePair>>(
      () => new Map()
    );

    // Produce a version of client.enterRoom() that when called for the same
    // room ID multiple times, will not keep producing multiple leave
    // functions, but instead return the cached one.
    const stableEnterRoom = React.useCallback(
      (
        roomId: string,
        options: EnterOptions<TPresence, TStorage>
      ): TRoomLeavePair => {
        const cached = cache.get(roomId);
        if (cached) return cached;

        const rv = client.enterRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
          roomId,
          options
        );

        // Wrap the leave function to also delete the cached value
        const origLeave = rv.leave;
        rv.leave = () => {
          origLeave();
          cache.delete(roomId);
        };

        cache.set(roomId, rv);
        return rv;
      },
      [cache]
    );

    return <RoomProviderInner {...props} stableEnterRoom={stableEnterRoom} />;
  }

  function RoomProviderInner(
    props: RoomProviderProps<TPresence, TStorage> & {
      stableEnterRoom: (
        roomId: string,
        options: EnterOptions<TPresence, TStorage>
      ) => TRoomLeavePair;
    }
  ) {
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
      async function handleCommentEvent(message: CommentsEventServerMsg) {
        // TODO: Error handling
        const info = await room.getThread({ threadId: message.threadId });

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
    }, [room]);

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
      <RoomContext.Provider value={room}>
        <ContextBundle.Provider
          value={
            bundle as unknown as RoomContextBundle<
              JsonObject,
              LsonObject,
              BaseUserMeta,
              never,
              BaseMetadata
            >
          }
        >
          {props.children}
        </ContextBundle.Provider>
      </RoomContext.Provider>
    );
  }

  function connectionIdSelector(
    others: readonly User<TPresence, TUserMeta>[]
  ): number[] {
    return others.map((user) => user.connectionId);
  }

  function useRoom(): TRoom {
    const room = React.useContext(RoomContext);
    if (room === null) {
      throw new Error("RoomProvider is missing from the React tree.");
    }
    return room;
  }

  function useStatus(): Status {
    const room = useRoom();
    const subscribe = room.events.status.subscribe;
    const getSnapshot = room.getStatus;
    const getServerSnapshot = room.getStatus;
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  function useMyPresence(): [
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void,
  ] {
    const room = useRoom();
    const subscribe = room.events.myPresence.subscribe;
    const getSnapshot = room.getPresence;
    const presence = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const setPresence = room.updatePresence;
    return [presence, setPresence];
  }

  function useUpdateMyPresence(): (
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void {
    return useRoom().updatePresence;
  }

  function useOthers(): readonly User<TPresence, TUserMeta>[];
  function useOthers<T>(
    selector: (others: readonly User<TPresence, TUserMeta>[]) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useOthers<T>(
    selector?: (others: readonly User<TPresence, TUserMeta>[]) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | readonly User<TPresence, TUserMeta>[] {
    const room = useRoom();
    const subscribe = room.events.others.subscribe;
    const getSnapshot = room.getOthers;
    const getServerSnapshot = alwaysEmptyList;
    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      selector ??
        (identity as (others: readonly User<TPresence, TUserMeta>[]) => T),
      isEqual
    );
  }

  function useOthersConnectionIds(): readonly number[] {
    return useOthers(connectionIdSelector, shallow);
  }

  function useOthersMapped<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): ReadonlyArray<readonly [connectionId: number, data: T]> {
    const wrappedSelector = React.useCallback(
      (others: readonly User<TPresence, TUserMeta>[]) =>
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
            const btuple = b[index];
            return atuple[0] === btuple[0] && eq(atuple[1], btuple[1]);
          })
        );
      },
      [itemIsEqual]
    );

    return useOthers(wrappedSelector, wrappedIsEqual);
  }

  const NOT_FOUND = Symbol();

  type NotFound = typeof NOT_FOUND;

  function useOther<T>(
    connectionId: number,
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    const wrappedSelector = React.useCallback(
      (others: readonly User<TPresence, TUserMeta>[]) => {
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
  }

  function useBroadcastEvent(): (
    event: TRoomEvent,
    options?: BroadcastOptions
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (
        event: TRoomEvent,
        options: BroadcastOptions = { shouldQueueEventIfNotReady: false }
      ) => {
        room.broadcastEvent(event, options);
      },
      [room]
    );
  }

  function useOthersListener(
    callback: (event: OthersEvent<TPresence, TUserMeta>) => void
  ) {
    const room = useRoom();
    const savedCallback = useLatest(callback);

    React.useEffect(
      () =>
        room.events.others.subscribe((event) => savedCallback.current(event)),
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

  function useErrorListener(callback: (err: Error) => void): void {
    const room = useRoom();
    const savedCallback = useLatest(callback);

    React.useEffect(
      () => room.events.error.subscribe((e) => savedCallback.current(e)),
      [room, savedCallback]
    );
  }

  function useEventListener(
    callback: (data: RoomEventMessage<TPresence, TUserMeta, TRoomEvent>) => void
  ): void {
    const room = useRoom();
    const savedCallback = useLatest(callback);

    React.useEffect(() => {
      const listener = (
        eventData: RoomEventMessage<TPresence, TUserMeta, TRoomEvent>
      ) => {
        savedCallback.current(eventData);
      };

      return room.events.customEvent.subscribe(listener);
    }, [room, savedCallback]);
  }

  function useSelf(): User<TPresence, TUserMeta> | null;
  function useSelf<T>(
    selector: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | null;
  function useSelf<T>(
    maybeSelector?: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | User<TPresence, TUserMeta> | null {
    type Snapshot = User<TPresence, TUserMeta> | null;
    type Selection = T | null;

    const room = useRoom();
    const subscribe = room.events.self.subscribe;
    const getSnapshot: () => Snapshot = room.getSelf;

    const selector =
      maybeSelector ?? (identity as (me: User<TPresence, TUserMeta>) => T);
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

  function useMutableStorageRoot(): LiveObject<TStorage> | null {
    const room = useRoom();
    const subscribe = room.events.storageDidLoad.subscribeOnce;
    const getSnapshot = room.getStorageSnapshot;
    const getServerSnapshot = alwaysNull;
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  // NOTE: This API exists for backward compatible reasons
  function useStorageRoot(): [root: LiveObject<TStorage> | null] {
    return [useMutableStorageRoot()];
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

  function useBatch<T>(): (callback: () => T) => T {
    return useRoom().batch;
  }

  function useLegacyKey<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    const room = useRoom();
    const rootOrNull = useMutableStorageRoot();
    const rerender = useRerender();

    React.useEffect(() => {
      if (rootOrNull === null) {
        return;
      }
      const root = rootOrNull;

      let unsubCurr: (() => void) | undefined;
      let curr = root.get(key);

      function subscribeToCurr() {
        unsubCurr = isLiveNode(curr)
          ? room.subscribe(curr, rerender)
          : undefined;
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

  function useStorage<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | null {
    type Snapshot = ToImmutable<TStorage> | null;
    type Selection = T | null;

    const room = useRoom();
    const rootOrNull = useMutableStorageRoot();

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

  function ensureNotServerSide(): void {
    // Error early if suspense is used in a server-side context
    if (typeof window === "undefined") {
      throw new Error(
        "You cannot use the Suspense version of this hook on the server side. Make sure to only call them on the client side.\nFor tips, see https://liveblocks.io/docs/api-reference/liveblocks-react#suspense-avoid-ssr"
      );
    }
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

  function useMutation<
    F extends (
      context: MutationContext<TPresence, TStorage, TUserMeta>,
      ...args: any[]
    ) => any,
  >(callback: F, deps: readonly unknown[]): OmitFirstArg<F> {
    const room = useRoom();
    return React.useMemo(
      () => {
        return ((...args) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          room.batch(() =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            callback(
              makeMutationContext(room),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              ...args
            )
          )) as OmitFirstArg<F>;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [room, ...deps]
    );
  }

  function useStorageSuspense<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    useSuspendUntilStorageLoaded();
    return useStorage(
      selector,
      isEqual as (prev: T | null, curr: T | null) => boolean
    ) as T;
  }

  function useSelfSuspense(): User<TPresence, TUserMeta>;
  function useSelfSuspense<T>(
    selector: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useSelfSuspense<T>(
    selector?: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | User<TPresence, TUserMeta> {
    useSuspendUntilPresenceLoaded();
    return useSelf(
      selector as (me: User<TPresence, TUserMeta>) => T,
      isEqual as (prev: T | null, curr: T | null) => boolean
    ) as T | User<TPresence, TUserMeta>;
  }

  function useOthersSuspense<T>(
    selector?: (others: readonly User<TPresence, TUserMeta>[]) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | readonly User<TPresence, TUserMeta>[] {
    useSuspendUntilPresenceLoaded();
    return useOthers(
      selector as (others: readonly User<TPresence, TUserMeta>[]) => T,
      isEqual as (prev: T, curr: T) => boolean
    ) as T | readonly User<TPresence, TUserMeta>[];
  }

  function useOthersConnectionIdsSuspense(): readonly number[] {
    useSuspendUntilPresenceLoaded();
    return useOthersConnectionIds();
  }

  function useOthersMappedSuspense<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): ReadonlyArray<readonly [connectionId: number, data: T]> {
    useSuspendUntilPresenceLoaded();
    return useOthersMapped(itemSelector, itemIsEqual);
  }

  function useOtherSuspense<T>(
    connectionId: number,
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T {
    useSuspendUntilPresenceLoaded();
    return useOther(connectionId, selector, isEqual);
  }

  function useLegacyKeySuspense<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] {
    useSuspendUntilStorageLoaded();
    return useLegacyKey(key) as TStorage[TKey];
  }

  const store = client[kInternal]
    .cacheStore as unknown as CacheStore<TThreadMetadata>;

  function onMutationFailure(
    innerError: Error,
    optimisticUpdateId: string,
    createPublicError: (error: Error) => CommentsError<TThreadMetadata>
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
      // [comments-unread] TODO: Create public error and notify via notificationsErrorEventSource?
      return;
    }

    throw innerError;
  }

  const requestsCache: Map<
    string,
    {
      promise: Promise<any> | null;
      subscribers: number;
      query: UseThreadsOptions<TThreadMetadata>["query"];
      roomId: string;
    }
  > = new Map();

  const poller = makePoller(refreshThreadsAndNotifications);

  async function refreshThreadsAndNotifications() {
    await Promise.allSettled(
      Array.from(requestsCache.entries())
        .filter(([_, requestCache]) => requestCache.subscribers > 0)
        .map(async ([queryKey, requestCache]) => {
          const room = client.getRoom(requestCache.roomId);

          if (room === null) {
            return;
          }

          // TODO: Error handling
          const { threads, inboxNotifications } = await room.getThreads({
            query: requestCache.query,
          });

          store.updateThreadsAndNotifications(
            threads,
            inboxNotifications,
            queryKey
          );
        })
    );
  }

  function incrementQuerySubscribers(queryKey: string) {
    const requestCache = requestsCache.get(queryKey);

    if (requestCache === undefined) {
      console.warn(
        `Internal unexpected behavior. Cannot increase subscriber count for query "${queryKey}"`
      );
      return;
    }

    requestCache.subscribers++;

    poller.start(POLLING_INTERVAL);
  }

  function decrementQuerySubscribers(queryKey: string) {
    const requestCache = requestsCache.get(queryKey);

    if (requestCache === undefined || requestCache.subscribers <= 0) {
      console.warn(
        `Internal unexpected behavior. Cannot decrease subscriber count for query "${queryKey}"`
      );
      return;
    }

    requestCache.subscribers--;

    let totalSubscribers = 0;
    for (const requestCache of requestsCache.values()) {
      totalSubscribers += requestCache.subscribers;
    }

    if (totalSubscribers <= 0) {
      poller.stop();
    }
  }

  async function getThreadsAndInboxNotifications(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    queryKey: string,
    options: UseThreadsOptions<TThreadMetadata>
  ) {
    const requestCache = requestsCache.get(queryKey);

    if (requestCache !== undefined) {
      return requestCache.promise;
    }

    const initialPromise = room.getThreads(options);

    requestsCache.set(queryKey, {
      promise: initialPromise,
      subscribers: 0,
      query: options.query,
      roomId: room.id,
    });

    store.setQueryState(queryKey, {
      isLoading: true,
    });

    try {
      const { threads, inboxNotifications } = await initialPromise;
      store.updateThreadsAndNotifications(
        threads,
        inboxNotifications,
        queryKey
      );
    } catch (err) {
      store.setQueryState(queryKey, {
        isLoading: false,
        error: err as Error,
      });
    }
    poller.start(POLLING_INTERVAL);
  }

  function useThreads(
    options: UseThreadsOptions<TThreadMetadata> = { query: { metadata: {} } }
  ): ThreadsState<TThreadMetadata> {
    const room = useRoom();
    const queryKey = React.useMemo(
      () => generateQueryKey(room.id, options.query),
      [room, options]
    );

    React.useEffect(() => {
      void getThreadsAndInboxNotifications(room, queryKey, options);
      incrementQuerySubscribers(queryKey);

      return () => decrementQuerySubscribers(queryKey);
    }, [room, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        if (
          state.queries[queryKey] === undefined ||
          state.queries[queryKey].isLoading
        ) {
          return {
            isLoading: true,
          };
        }

        return {
          threads: selectedThreads(room.id, state, options),
          isLoading: false,
          error: state.queries[queryKey].error,
        };
      }
    );
  }

  function useThreadsSuspense(
    options: UseThreadsOptions<TThreadMetadata> = { query: { metadata: {} } }
  ): ThreadsStateSuccess<TThreadMetadata> {
    const room = useRoom();
    const queryKey = React.useMemo(
      () => generateQueryKey(room.id, options?.query),
      [room, options]
    );

    if (
      store.get().queries[queryKey] === undefined ||
      store.get().queries[queryKey].isLoading
    ) {
      throw getThreadsAndInboxNotifications(room, queryKey, options);
    }

    if (store.get().queries[queryKey].error) {
      throw store.get().queries[queryKey].error;
    }

    React.useEffect(() => {
      incrementQuerySubscribers(queryKey);

      return () => {
        decrementQuerySubscribers(queryKey);
      };
    }, [room, queryKey]);

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        return {
          threads: selectedThreads(room.id, state, options),
          isLoading: false,
        };
      }
    );
  }

  function useCreateThread() {
    const room = useRoom();
    return React.useCallback(
      (
        options: CreateThreadOptions<TThreadMetadata>
      ): ThreadData<TThreadMetadata> => {
        const body = options.body;
        const metadata: TThreadMetadata =
          "metadata" in options ? options.metadata : ({} as TThreadMetadata);

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
        const newThread: ThreadData<TThreadMetadata> = {
          id: threadId,
          type: "thread",
          createdAt: now,
          roomId: room.id,
          metadata: metadata as ThreadData<TThreadMetadata>["metadata"],
          comments: [newComment],
        };

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "create-thread",
          thread: newThread,
          id: optimisticUpdateId,
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
      [room]
    );
  }

  function useEditThreadMetadata() {
    const room = useRoom();
    return React.useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>): void => {
        if (!("metadata" in options)) {
          return;
        }

        const threadId = options.threadId;
        const metadata = options.metadata;

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "edit-thread-metadata",
          metadata,
          id: optimisticUpdateId,
          threadId,
        });

        room.editThreadMetadata({ metadata, threadId }).then(
          (metadata: TThreadMetadata) => {
            store.set((state) => ({
              ...state,
              threads: {
                ...state.threads,
                [threadId]: {
                  ...state.threads[threadId],
                  metadata: {
                    ...state.threads[threadId].metadata,
                    ...metadata,
                  },
                },
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
                new EditThreadMetadataError(error, {
                  roomId: room.id,
                  threadId,
                  metadata,
                })
            )
        );
      },
      [room]
    );
  }

  function useAddReaction() {
    const room = useRoom();
    return React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const now = new Date();
        const userId = getCurrentUserId(room);

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "add-reaction",
          threadId,
          commentId,
          emoji,
          userId,
          createdAt: now,
          id: optimisticUpdateId,
        });

        room.addReaction({ threadId, commentId, emoji }).then(
          (addedReaction) => {
            store.set((state) => ({
              ...state,
              threads: {
                ...state.threads,
                [threadId]: {
                  ...state.threads[threadId],
                  comments: state.threads[threadId].comments.map((comment) =>
                    comment.id === commentId
                      ? {
                          ...comment,
                          reactions: comment.reactions.some(
                            (reaction) => reaction.emoji === addedReaction.emoji
                          )
                            ? comment.reactions.map((reaction) =>
                                reaction.emoji === addedReaction.emoji
                                  ? {
                                      ...reaction,
                                      users: [
                                        ...reaction.users,
                                        { id: addedReaction.userId },
                                      ],
                                    }
                                  : reaction
                              )
                            : [
                                ...comment.reactions,
                                {
                                  emoji: addedReaction.emoji,
                                  createdAt: addedReaction.createdAt,
                                  users: [{ id: addedReaction.userId }],
                                },
                              ],
                        }
                      : comment
                  ),
                },
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
                new AddReactionError(error, {
                  roomId: room.id,
                  threadId,
                  commentId,
                  emoji,
                })
            )
        );
      },
      [room]
    );
  }

  function useRemoveReaction() {
    const room = useRoom();
    return React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const userId = getCurrentUserId(room);

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "remove-reaction",
          threadId,
          commentId,
          emoji,
          userId,
          id: optimisticUpdateId,
        });

        room.removeReaction({ threadId, commentId, emoji }).then(
          () => {
            store.set((state) => ({
              ...state,
              threads: {
                ...state.threads,
                [threadId]: {
                  ...state.threads[threadId],
                  comments: state.threads[threadId].comments.map((comment) => {
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
                },
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
                new RemoveReactionError(error, {
                  roomId: room.id,
                  threadId,
                  commentId,
                  emoji,
                })
            )
        );
      },
      [room]
    );
  }

  function useCreateComment(): (options: CreateCommentOptions) => CommentData {
    const room = useRoom();
    return React.useCallback(
      ({ threadId, body }: CreateCommentOptions): CommentData => {
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

        const optimisticUpdateId = nanoid();

        const inboxNotification = Object.values(
          store.get().inboxNotifications
        ).find((inboxNotification) => inboxNotification.threadId === threadId);

        store.pushOptimisticUpdate({
          type: "create-comment",
          comment,
          id: optimisticUpdateId,
          inboxNotificationId: inboxNotification?.id,
        });

        room.createComment({ threadId, commentId, body }).then(
          (newComment) => {
            store.set((state) => ({
              ...state,
              threads: upsertComment(state.threads, newComment),
              inboxNotifications: inboxNotification
                ? {
                    ...state.inboxNotifications,
                    [inboxNotification.id]: {
                      ...inboxNotification,
                      notifiedAt: now,
                      readAt: now,
                    },
                  }
                : state.inboxNotifications,
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
      [room]
    );
  }

  function useEditComment(): (options: EditCommentOptions) => void {
    const room = useRoom();
    return React.useCallback(
      ({ threadId, commentId, body }: EditCommentOptions): void => {
        const now = new Date();
        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "edit-comment",
          threadId,
          commentId,
          body,
          editedAt: now,
          id: optimisticUpdateId,
        });

        room.editComment({ threadId, commentId, body }).then(
          (editedComment) => {
            store.set((state) => ({
              ...state,
              threads: upsertComment(state.threads, editedComment),
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
                new EditCommentError(error, {
                  roomId: room.id,
                  threadId,
                  commentId,
                  body,
                })
            )
        );
      },
      [room]
    );
  }

  function useDeleteComment() {
    const room = useRoom();
    return React.useCallback(
      ({ threadId, commentId }: DeleteCommentOptions): void => {
        const now = new Date();

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "delete-comment",
          threadId,
          commentId,
          deletedAt: now,
          id: optimisticUpdateId,
        });

        room.deleteComment({ threadId, commentId }).then(
          () => {
            const newThreads = { ...store.get().threads };
            const thread = newThreads[threadId];
            if (thread === undefined) return;

            newThreads[thread.id] = {
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
              !newThreads[thread.id].comments.some(
                (comment) => comment.deletedAt === undefined
              )
            ) {
              delete newThreads[thread.id];
            }

            store.set((state) => ({
              ...state,
              threads: newThreads,
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
                new DeleteCommentError(error, {
                  roomId: room.id,
                  threadId,
                  commentId,
                })
            )
        );
      },
      [room]
    );
  }

  const resolveMentionSuggestions = client[kInternal].resolveMentionSuggestions;
  const mentionSuggestionsCache = new Map<string, string[]>();

  // Simplistic debounced search, we don't need to worry too much about
  // deduping and race conditions as there can only be one search at a time.
  function useMentionSuggestions(search?: string) {
    const room = useRoom();
    const [mentionSuggestions, setMentionSuggestions] =
      React.useState<string[]>();
    const lastInvokedAt = React.useRef<number>();

    React.useEffect(() => {
      if (search === undefined || !resolveMentionSuggestions) {
        return;
      }

      const resolveMentionSuggestionsArgs = { text: search, roomId: room.id };
      const mentionSuggestionsCacheKey = stringify(
        resolveMentionSuggestionsArgs
      );
      let debounceTimeout: number | undefined;
      let canceled = false;

      const getMentionSuggestions = async () => {
        try {
          lastInvokedAt.current = performance.now();
          const mentionSuggestions = await resolveMentionSuggestions(
            resolveMentionSuggestionsArgs
          );

          if (!canceled) {
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
        canceled = true;
        window.clearTimeout(debounceTimeout);
      };
    }, [room.id, search]);

    return mentionSuggestions;
  }

  // [comments-unread] TODO: Differientate loading state from "not subscribed" state
  // [comments-unread] TODO: Suspense version?
  function useThreadUnreadSince(threadId: string): Date | null {
    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      (state) => {
        const inboxNotification = Object.values(state.inboxNotifications).find(
          (inboxNotif) => inboxNotif.threadId === threadId
        );

        const thread = state.threads[threadId];

        if (inboxNotification === undefined || thread === undefined) {
          return null;
        }

        // If the inbox notification wasn't read at all, the thread is unread since its creation, so we return its `createdAt` date.
        if (inboxNotification.readAt === null) {
          return thread.createdAt;
        }

        // If the inbox notification was read, we return the date at which it was last read.
        return inboxNotification.readAt;
      }
    );
  }

  function useMarkThreadAsRead() {
    return React.useCallback((threadId: string) => {
      const inboxNotification = Object.values(
        store.get().inboxNotifications
      ).find((inboxNotification) => inboxNotification.threadId === threadId);

      if (!inboxNotification) return;

      const optimisticUpdateId = nanoid();
      const now = new Date();

      store.pushOptimisticUpdate({
        type: "mark-inbox-notification-as-read",
        id: optimisticUpdateId,
        inboxNotificationId: inboxNotification.id,
        readAt: now,
      });

      client.markInboxNotificationAsRead(inboxNotification.id).then(
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
    }, []);
  }

  // [comments-unread] TODO: Implement using `room.getRoomNotificationSettings`
  // [comments-unread] TODO: Cache and optimistically update settings?
  function useRoomNotificationSettings(): [
    RoomNotificationSettingsState,
    (settings: Partial<RoomNotificationSettings>) => void,
  ] {
    const room = useRoom();

    return [
      { isLoading: false, settings: { threads: "replies_and_mentions" } },
      room.updateRoomNotificationSettings,
    ];
  }

  // [comments-unread] TODO: Implement using `room.getRoomNotificationSettings`
  // [comments-unread] TODO: Cache and optimistically update settings?
  function useRoomNotificationSettingsSuspense(): [
    RoomNotificationSettingsStateSuccess,
    (settings: Partial<RoomNotificationSettings>) => void,
  ] {
    const room = useRoom();

    return [
      { isLoading: false, settings: { threads: "replies_and_mentions" } },
      room.updateRoomNotificationSettings,
    ];
  }

  // [comments-unread] TODO: Optimistically update settings in cache?
  function useUpdateRoomNotificationSettings() {
    const room = useRoom();
    return room.updateRoomNotificationSettings;
  }

  const bundle: RoomContextBundle<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  > = {
    RoomContext,
    RoomProvider: RoomProviderOuter,

    useRoom,
    useStatus,

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

    // These are just aliases. The passed-in key will define their return values.
    useList: useLegacyKey,
    useMap: useLegacyKey,
    useObject: useLegacyKey,

    useStorageRoot,
    useStorage,

    useSelf,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,

    useMutation,

    useThreads,
    useUser,

    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
    useMarkThreadAsRead,
    useThreadUnreadSince,

    useRoomNotificationSettings,
    useUpdateRoomNotificationSettings,

    suspense: {
      RoomContext,
      RoomProvider: RoomProviderOuter,

      useRoom,
      useStatus,

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

      // Legacy hooks
      useList: useLegacyKeySuspense,
      useMap: useLegacyKeySuspense,
      useObject: useLegacyKeySuspense,

      useStorageRoot,
      useStorage: useStorageSuspense,

      useSelf: useSelfSuspense,
      useMyPresence,
      useUpdateMyPresence,
      useOthers: useOthersSuspense,
      useOthersMapped: useOthersMappedSuspense,
      useOthersConnectionIds: useOthersConnectionIdsSuspense,
      useOther: useOtherSuspense,

      useMutation,

      useThreads: useThreadsSuspense,
      useUser: useUserSuspense,

      useCreateThread,
      useEditThreadMetadata,
      useCreateComment,
      useEditComment,
      useDeleteComment,
      useAddReaction,
      useRemoveReaction,
      useMarkThreadAsRead,
      useThreadUnreadSince,

      useRoomNotificationSettings: useRoomNotificationSettingsSuspense,
      useUpdateRoomNotificationSettings,
    },

    [kInternal]: {
      hasResolveMentionSuggestions: resolveMentionSuggestions !== undefined,
      useMentionSuggestions,
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
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

function generateQueryKey<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  options: UseThreadsOptions<TThreadMetadata>["query"]
) {
  return `${roomId}-${stringify(options ?? {})}`;
}
