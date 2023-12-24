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
  AsyncCache,
  BaseMetadata,
  CommentBody,
  CommentData,
  CommentReaction,
  EnterOptions,
  Resolve,
  RoomEventMessage,
  ThreadData,
  ThreadsFilterOptions,
  ToImmutable,
} from "@liveblocks/core";
import {
  CommentsApiError,
  createAsyncCache,
  deprecateIf,
  errorIf,
  isLiveNode,
  makeEventSource,
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
  RemoveReactionError,
} from "./comments/errors";
import {
  type CacheManager,
  type MutationInfo,
  type RequestInfo,
  useAutomaticRevalidation,
  useMutate,
  useRevalidateCache,
} from "./comments/lib/revalidation";
import { useDebounce } from "./comments/lib/use-debounce";
import useIsDocumentVisible from "./comments/lib/use-is-document-visible";
import useIsOnline from "./comments/lib/use-is-online";
import { useAsyncCache } from "./lib/use-async-cache";
import { useInitial } from "./lib/use-initial";
import { useLatest } from "./lib/use-latest";
import { useRerender } from "./lib/use-rerender";
import type {
  InternalRoomContextBundle,
  MutationContext,
  OmitFirstArg,
  PromiseOrNot,
  ResolveMentionSuggestionsArgs,
  ResolveUsersArgs,
  RoomContextBundle,
  RoomProviderProps,
  UserState,
  UserStateSuccess,
} from "./types";

const POLLING_INTERVAL_REALTIME = 30000;
const POLLING_INTERVAL = 5000;

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";

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

type Options<TUserMeta extends BaseUserMeta> = {
  /**
   * @beta
   *
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => PromiseOrNot<(TUserMeta["info"] | undefined)[] | undefined>;

  /**
   * @beta
   *
   * A function that returns a list of user IDs matching a string.
   */
  resolveMentionSuggestions?: (
    args: ResolveMentionSuggestionsArgs
  ) => PromiseOrNot<string[]>;

  /**
   * @internal To point the client to a different Liveblocks server. Only
   * useful for Liveblocks developers. Not for end users.
   */
  baseUrl?: string;
};

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
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

interface RoomRevalidationManager<TThreadMetadata extends BaseMetadata>
  extends CacheManager<ThreadData<TThreadMetadata>[]> {
  getRoomId(): string;

  getRevalidationManagers(): [
    string,
    UseThreadsRevalidationManager<TThreadMetadata>,
  ][];
  getRevalidationManager(
    key: string
  ): UseThreadsRevalidationManager<TThreadMetadata> | undefined;
  setRevalidationmanager(
    key: string,
    manager: UseThreadsRevalidationManager<TThreadMetadata>
  ): void;

  incrementReferenceCount(key: string): void;
  decrementReferenceCount(key: string): void;
  getReferenceCount(key: string): number | undefined;
}

let hasWarnedIfNoResolveUsers = false;

function warnIfNoResolveUsers(usersCache?: AsyncCache<unknown, unknown>) {
  if (
    !hasWarnedIfNoResolveUsers &&
    !usersCache &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "Set the resolveUsers option in createRoomContext to specify user info."
    );
    hasWarnedIfNoResolveUsers = true;
  }
}

const ContextBundle = React.createContext<InternalRoomContextBundle<
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
  client: Client,
  options?: Options<TUserMeta>
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

  const manager = createClientCacheManager<TThreadMetadata>();

  const commentsErrorEventSource =
    makeEventSource<CommentsError<TThreadMetadata>>();

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
        <CommentsRoomProvider room={room}>
          <ContextBundle.Provider
            value={
              internalBundle as unknown as InternalRoomContextBundle<
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
        </CommentsRoomProvider>
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

  /**
   * Creates a new revalidation manager for the given filter options and room manager. If a revalidation manager already exists for the given filter options, it will be returned instead.
   */
  function getRevalidationManager(
    options: NormalizedFilterOptions<TThreadMetadata>,
    roomManager: RoomRevalidationManager<TThreadMetadata>
  ) {
    const key = stringify(options);
    const revalidationManager = roomManager.getRevalidationManager(key);

    if (!revalidationManager) {
      const useThreadsRevalidationManager =
        createUseThreadsRevalidationManager<TThreadMetadata>(
          options,
          roomManager
        );
      roomManager.setRevalidationmanager(key, useThreadsRevalidationManager);
      return useThreadsRevalidationManager;
    }

    return revalidationManager;
  }

  function createRoomRevalidationManager(
    roomId: string
  ): RoomRevalidationManager<TThreadMetadata> {
    let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
    let error: Error | undefined; // Stores any error that occurred during the last revalidation request
    let mutation: MutationInfo | undefined; // Stores the currently active mutation

    // Each `useThreads` with unique filter options creates its own revalidation manager that is used during the initial revalidation.
    const revalidationManagerByOptions = new Map<
      string,
      UseThreadsRevalidationManager<TThreadMetadata>
    >();

    // Keep track of how many times each revalidation manager is used.
    const referenceCountByOptions = new Map<string, number>();

    return {
      // Cache
      getCache() {
        const threads = manager.getThreadsCache();
        // Filter the cache to only include threads that are in the current room
        const filtered = threads.filter((thread) => thread.roomId === roomId);
        return filtered;
      },
      setCache(value: ThreadData<TThreadMetadata>[]) {
        // Delete any revalidation managers that are no longer used by any `useThreads` hooks
        for (const key of revalidationManagerByOptions.keys()) {
          if (referenceCountByOptions.get(key) === 0) {
            revalidationManagerByOptions.delete(key);
            referenceCountByOptions.delete(key);
          }
        }

        // Sort the threads by createdAt date before updating the cache
        const sorted = value.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const threads = manager.getThreadsCache();
        const newThreads = threads
          .filter((thread) => thread.roomId !== roomId)
          .concat(sorted);

        manager.setThreadsCache(newThreads);
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
        for (const manager of revalidationManagerByOptions.values()) {
          manager.setError(err);
        }
      },

      // Mutation
      getMutation() {
        return mutation;
      },
      setMutation(info: MutationInfo) {
        mutation = info;
      },

      // Room Id
      getRoomId() {
        return roomId;
      },

      getRevalidationManagers() {
        return Array.from(revalidationManagerByOptions.entries());
      },

      getRevalidationManager(key: string) {
        return revalidationManagerByOptions.get(key);
      },

      setRevalidationmanager(
        key: string,
        manager: UseThreadsRevalidationManager<TThreadMetadata>
      ) {
        revalidationManagerByOptions.set(key, manager);
      },

      incrementReferenceCount(key: string) {
        const count = referenceCountByOptions.get(key) ?? 0;
        referenceCountByOptions.set(key, count + 1);
      },

      decrementReferenceCount(key: string) {
        const count = referenceCountByOptions.get(key) ?? 0;
        referenceCountByOptions.set(key, count - 1);
      },

      getReferenceCount(key: string) {
        return referenceCountByOptions.get(key);
      },
    };
  }

  async function getFetcher(
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
    roomManager: RoomRevalidationManager<TThreadMetadata>
  ) {
    const options = roomManager
      .getRevalidationManagers()
      .filter(([key]) => roomManager.getReferenceCount(key) !== 0)
      .map(([_, manager]) => manager.getOptions());

    const responses = await Promise.all(
      options.map(async (option) => {
        return await room.getThreads(option);
      })
    );

    const threads = Array.from(
      new Map(responses.flat().map((thread) => [thread.id, thread])).values()
    );

    return threads;
  }

  const RoomRevalidationManagerContext =
    React.createContext<RoomRevalidationManager<TThreadMetadata> | null>(null);

  const CommentsEventSubscriptionContext = React.createContext<
    () => () => void
  >(() => () => {});

  function CommentsRoomProvider({
    children,
    room,
  }: {
    children: React.ReactNode;
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
  }) {
    const commentsEventSubscribersCountRef = React.useRef(0); // Reference count for the number of components with a subscription (via the `subscribe` function) to the comments event source.
    const commentsEventDisposerRef = React.useRef<() => void>(); // Disposer function for the `comments` event listener

    const manager = React.useMemo(() => {
      return createRoomRevalidationManager(room.id);
    }, [room.id]);

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);

    const subscribeToCommentEvents = React.useCallback(() => {
      const commentsEventSubscribersCount =
        commentsEventSubscribersCountRef.current;

      // Only subscribe to the `comments` event if the reference count is 0 (meaning that there are no components with a subscription)
      if (commentsEventSubscribersCount === 0) {
        const unsubscribe = room.events.comments.subscribe(() => {
          console.log("comments event received");
          void revalidate({ shouldDedupe: true });
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
    }, [revalidate, room]);

    return (
      <RoomRevalidationManagerContext.Provider value={manager}>
        <CommentsEventSubscriptionContext.Provider
          value={subscribeToCommentEvents}
        >
          {children}
        </CommentsEventSubscriptionContext.Provider>
      </RoomRevalidationManagerContext.Provider>
    );
  }

  function useRoomRevalidationManager() {
    const manager = React.useContext(RoomRevalidationManagerContext);
    if (manager === null) {
      throw new Error(
        "CommentsRoomProvider is missing from the React tree. Make sure to wrap your app in a <CommentsRoomProvider>."
      );
    }
    return manager;
  }

  function _useThreads(options: NormalizedFilterOptions<TThreadMetadata>) {
    const room = useRoom();
    const roomManager = useRoomRevalidationManager();
    const revalidationManager = getRevalidationManager(options, roomManager);

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, roomManager);
      return threads;
    }, [room, roomManager]);

    const revalidate = useRevalidateCache(roomManager, fetcher);

    const status = useStatus();

    const isOnline = useIsOnline();
    const isDocumentVisible = useIsDocumentVisible();
    const subscribeToCommentEvents = React.useContext(
      CommentsEventSubscriptionContext
    );

    const interval = getPollingInterval(
      isOnline,
      isDocumentVisible,
      status === "connected"
    );

    // Automatically revalidate the cache when the window gains focus or when the connection is restored. Also poll the server based on the connection status.
    useAutomaticRevalidation(roomManager, revalidate, {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: interval,
    });

    /**
     * Subscribe to comment events in the room to trigger a revalidation when a comment is added, edited or deleted.
     */
    React.useEffect(subscribeToCommentEvents, [subscribeToCommentEvents]);

    const subscribe = React.useCallback((callback: () => void) => {
      const unsub = manager.subscribe("threads", callback);
      return () => {
        unsub();
      };
    }, []);

    const cache = useSyncExternalStoreWithSelector<
      ThreadData<TThreadMetadata>[],
      ThreadsState<TThreadMetadata>
    >(
      subscribe,
      () => manager.getThreadsCache(),
      () => manager.getThreadsCache(),
      (state) => {
        const isLoading = revalidationManager.getIsLoading();
        if (isLoading) {
          return {
            isLoading: true,
          };
        }

        const options = revalidationManager.getOptions();
        const error = revalidationManager.getError();

        // Filter the cache to only include threads that match the current query
        const filtered = state.filter((thread) => {
          if (thread.roomId !== room.id) return false;

          const query = options.query;
          for (const key in query.metadata) {
            if (thread.metadata[key] !== query.metadata[key]) {
              return false;
            }
          }
          return true;
        });

        return {
          isLoading: false,
          threads: filtered,
          error,
        };
      }
    );

    return cache;
  }

  function useThreads(options?: ThreadsFilterOptions<TThreadMetadata>) {
    const room = useRoom();

    const normalized = React.useMemo(
      () => normalizeFilterOptions(options),
      [options]
    );

    const key = React.useMemo(() => {
      return stringify(normalized);
    }, [normalized]);

    const fetcher = React.useCallback(
      () => {
        return room.getThreads(normalized);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- The missing dependency is `normalized` (derived from options) but `key` and `normalized` are analogous, so we only include `key` as dependency. This helps minimize the number of re-renders as `options` can change on each render
      [key, room]
    );

    const roomManager = useRoomRevalidationManager();

    const revalidationManager = getRevalidationManager(normalized, roomManager);

    const revalidateCache = useRevalidateCache(revalidationManager, fetcher);

    React.useEffect(() => {
      void revalidateCache({ shouldDedupe: true });
    }, [revalidateCache]);

    React.useEffect(() => {
      roomManager.incrementReferenceCount(key);
      return () => {
        roomManager.decrementReferenceCount(key);
      };
    }, [key, roomManager]);

    return _useThreads(normalized);
  }

  function useThreadsSuspense(
    options?: ThreadsFilterOptions<TThreadMetadata>
  ): ThreadsStateSuccess<TThreadMetadata> {
    const room = useRoom();

    const normalized = React.useMemo(
      () => normalizeFilterOptions(options),
      [options]
    );

    const key = React.useMemo(() => {
      return stringify(normalized);
    }, [normalized]);

    const fetcher = React.useCallback(
      () => {
        return room.getThreads(normalized);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- The missing dependency is `normalized` (derived from options) but `key` and `normalized` are analogous, so we only include `key` as dependency. This helps minimize the number of re-renders as `options` can change on each render
      [key, room]
    );

    const roomManager = useRoomRevalidationManager();

    const revalidationManager = getRevalidationManager(normalized, roomManager);

    const revalidateCache = useRevalidateCache(revalidationManager, fetcher);

    React.useEffect(() => {
      roomManager.incrementReferenceCount(key);
      return () => {
        roomManager.decrementReferenceCount(key);
      };
    }, [roomManager, key]);

    const cache = _useThreads(normalized);

    if (cache.error) {
      throw cache.error;
    }

    if (cache.isLoading || !cache.threads) {
      throw revalidateCache({
        shouldDedupe: true,
      });
    }

    return {
      isLoading: false,
      threads: cache.threads,
      error: cache.error,
    };
  }

  function useCreateThread() {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createThread = React.useCallback(
      (
        options: CreateThreadOptions<TThreadMetadata>
      ): ThreadData<TThreadMetadata> => {
        const body = options.body;
        const metadata: TThreadMetadata =
          "metadata" in options ? options.metadata : ({} as TThreadMetadata);
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }

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
          commentsErrorEventSource.notify(
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
      [room, mutate, manager]
    );

    return createThread;
  }

  function useEditThreadMetadata() {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const editThreadMetadata = React.useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>): void => {
        const threadId = options.threadId;
        const metadata: PartialNullable<TThreadMetadata> =
          "metadata" in options ? options.metadata : {};
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }

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
          commentsErrorEventSource.notify(
            new EditThreadMetadataError(error, {
              roomId: room.id,
              threadId,
              metadata,
            })
          );
        });
      },
      [room, mutate, manager]
    );

    return editThreadMetadata;
  }

  function useAddReaction() {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const addReaction = React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }
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
          commentsErrorEventSource.notify(
            new AddReactionError(error, {
              roomId: room.id,
              threadId,
              commentId,
              emoji,
            })
          );
        });
      },
      [room, mutate, manager]
    );

    return addReaction;
  }

  function useRemoveReaction() {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const removeReaction = React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }
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
          commentsErrorEventSource.notify(
            new RemoveReactionError(error, {
              roomId: room.id,
              threadId,
              commentId,
              emoji,
            })
          );
        });
      },
      [room, mutate, manager]
    );

    return removeReaction;
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

  function useCreateComment(): (options: CreateCommentOptions) => CommentData {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const createComment = React.useCallback(
      ({ threadId, body }: CreateCommentOptions): CommentData => {
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }

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
          commentsErrorEventSource.notify(
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
      [manager, room, mutate]
    );

    return createComment;
  }

  function useEditComment(): (options: EditCommentOptions) => void {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const editComment = React.useCallback(
      ({ threadId, commentId, body }: EditCommentOptions): void => {
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }
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
          commentsErrorEventSource.notify(
            new EditCommentError(error, {
              roomId: room.id,
              threadId,
              commentId,
              body,
            })
          );
        });
      },
      [room, mutate, manager]
    );

    return editComment;
  }

  function useDeleteComment() {
    const room = useRoom();
    const manager = useRoomRevalidationManager();

    const fetcher = React.useCallback(async () => {
      const threads = getFetcher(room, manager);
      return threads;
    }, [room, manager]);

    const revalidate = useRevalidateCache(manager, fetcher);
    const mutate = useMutate(manager, revalidate);

    const deleteComment = React.useCallback(
      ({ threadId, commentId }: DeleteCommentOptions): void => {
        const threads = manager.getCache();
        if (!threads) {
          throw new Error(
            "Cannot update threads or comments before they are loaded."
          );
        }
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
          commentsErrorEventSource.notify(
            new DeleteCommentError(error, {
              roomId: room.id,
              threadId,
              commentId,
            })
          );
        });
      },
      [room, mutate, manager]
    );

    return deleteComment;
  }

  const { resolveUsers, resolveMentionSuggestions } = options ?? {};

  const usersCache = resolveUsers
    ? createAsyncCache(async (stringifiedOptions: string) => {
        const users = await resolveUsers(
          JSON.parse(stringifiedOptions) as ResolveUsersArgs
        );

        return users?.[0];
      })
    : undefined;

  function useUser(userId: string) {
    const room = useRoom();
    const resolverKey = React.useMemo(
      () => stringify({ userIds: [userId], roomId: room.id }),
      [userId, room.id]
    );
    const state = useAsyncCache(usersCache, resolverKey);

    React.useEffect(() => warnIfNoResolveUsers(usersCache), []);

    if (state.isLoading) {
      return {
        isLoading: true,
      } as UserState<TUserMeta["info"]>;
    } else {
      return {
        user: state.data,
        error: state.error,
        isLoading: false,
      } as UserState<TUserMeta["info"]>;
    }
  }

  function useUserSuspense(userId: string) {
    const room = useRoom();
    const resolverKey = React.useMemo(
      () => stringify({ userIds: [userId], roomId: room.id }),
      [userId, room.id]
    );
    const state = useAsyncCache(usersCache, resolverKey, {
      suspense: true,
    });

    React.useEffect(() => warnIfNoResolveUsers(usersCache), []);

    return {
      user: state.data,
      isLoading: false,
    } as UserStateSuccess<TUserMeta["info"]>;
  }

  const mentionSuggestionsCache = createAsyncCache<string[], unknown>(
    resolveMentionSuggestions
      ? (stringifiedOptions: string) => {
          return resolveMentionSuggestions(
            JSON.parse(stringifiedOptions) as ResolveMentionSuggestionsArgs
          );
        }
      : () => Promise.resolve([])
  );

  function useMentionSuggestions(search?: string) {
    const room = useRoom();
    const debouncedSearch = useDebounce(search, 500);
    const resolverKey = React.useMemo(
      () =>
        debouncedSearch !== undefined
          ? stringify({ text: debouncedSearch, roomId: room.id })
          : null,
      [debouncedSearch, room.id]
    );
    const { data } = useAsyncCache(mentionSuggestionsCache, resolverKey, {
      keepPreviousDataWhileLoading: true,
    });

    return data;
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
    },
  };

  const internalBundle: InternalRoomContextBundle<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  > = {
    ...bundle,
    hasResolveMentionSuggestions: resolveMentionSuggestions !== undefined,
    useMentionSuggestions,
  };

  return bundle;
}

type ThreadInboxNotificationData = {
  kind: "thread";
  id: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

interface ClientCacheManager<TThreadMetadata extends BaseMetadata> {
  getThreadsCache(): ThreadData<TThreadMetadata>[];
  setThreadsCache(value: ThreadData<TThreadMetadata>[]): void;

  getInboxNotificationsCache(): ThreadInboxNotificationData[];
  setInboxNotificationsCache(value: ThreadInboxNotificationData[]): void;

  subscribe(
    type: "threads",
    callback: (state: ThreadData<TThreadMetadata>[]) => void
  ): () => void;
  subscribe(
    type: "notifications",
    callback: (state: ThreadInboxNotificationData[]) => void
  ): () => void;
}

function createClientCacheManager<
  TThreadMetadata extends BaseMetadata,
>(): ClientCacheManager<TThreadMetadata> {
  let threadsCache: ThreadData<TThreadMetadata>[] = []; // Stores the current threads cache state
  let inboxNotificationsCache: ThreadInboxNotificationData[] = []; // Stores the current inbox notifications cache state

  // Create an event source to notify subscribers when the cache is updated
  const threadsCacheEventSource =
    makeEventSource<ThreadData<TThreadMetadata>[]>();

  const inboxNotificationsCacheEventSource =
    makeEventSource<ThreadInboxNotificationData[]>();

  return {
    getThreadsCache() {
      return threadsCache;
    },
    setThreadsCache(value: ThreadData<TThreadMetadata>[]) {
      threadsCache = value;
      // Notify subscribers that the threads cache has been updated
      threadsCacheEventSource.notify(threadsCache);
    },

    getInboxNotificationsCache() {
      return inboxNotificationsCache;
    },

    setInboxNotificationsCache(value: ThreadInboxNotificationData[]) {
      inboxNotificationsCache = value;
      // Notify subscribers that the notifications cache has been updated
      inboxNotificationsCacheEventSource.notify(inboxNotificationsCache);
    },

    // Subscription
    subscribe(
      type: "threads" | "notifications",
      callback:
        | ((state: ThreadData<TThreadMetadata>[]) => void)
        | ((error: ThreadInboxNotificationData[]) => void)
    ) {
      switch (type) {
        case "threads":
          return threadsCacheEventSource.subscribe(
            callback as (state: ThreadData<TThreadMetadata>[]) => void
          );
        case "notifications":
          return inboxNotificationsCacheEventSource.subscribe(
            callback as (state: ThreadInboxNotificationData[]) => void
          );
      }
    },
  };
}

interface UseThreadsRevalidationManager<TThreadMetadata extends BaseMetadata>
  extends CacheManager<ThreadData<TThreadMetadata>[]> {
  getOptions(): NormalizedFilterOptions<TThreadMetadata>;
  getIsLoading(): boolean;
  setIsLoading(value: boolean): void;
}

function createUseThreadsRevalidationManager<
  TThreadMetadata extends BaseMetadata,
>(
  options: NormalizedFilterOptions<TThreadMetadata>,
  manager: RoomRevalidationManager<TThreadMetadata> // Room threads revalidation manager
): UseThreadsRevalidationManager<TThreadMetadata> {
  let isLoading: boolean = true;
  let request: RequestInfo<ThreadData<TThreadMetadata>[]> | undefined; // Stores the currently active revalidation request
  let error: Error | undefined; // Stores any error that occurred during the last revalidation request

  // Create an event source to notify subscribers when there is an error
  const errorEventSource = makeEventSource<Error>();

  return {
    // Cache
    getCache() {
      return undefined;
    },
    setCache(value: ThreadData<TThreadMetadata>[]) {
      const cache = new Map(
        (manager.getCache() ?? []).map((thread) => [thread.id, thread])
      );

      for (const thread of value) {
        const existingThread = cache.get(thread.id);
        if (existingThread) {
          const result = compareThreads(existingThread, thread);
          if (result === 1) {
            // If the existing thread is newer than the fetched thread, skip it
            continue;
          }
        }

        cache.set(thread.id, thread);
      }
      manager.setCache(Array.from(cache.values()));

      isLoading = false;
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
      // useThreads revalidation manager need not get the current mutation
      return undefined;
    },
    setMutation(_: MutationInfo) {
      // useThreads revalidation manager need not set mutations
      return;
    },

    getOptions() {
      return options;
    },

    getIsLoading() {
      return isLoading;
    },

    setIsLoading(value: boolean) {
      isLoading = value;
    },
  };
}

type NormalizedFilterOptions<TThreadMetadata extends BaseMetadata> = {
  query: { metadata: Partial<TThreadMetadata> };
};

function normalizeFilterOptions<TThreadMetadata extends BaseMetadata>({
  query: { metadata = {} } = {},
}: ThreadsFilterOptions<TThreadMetadata> = {}): NormalizedFilterOptions<TThreadMetadata> {
  return {
    query: {
      metadata,
    },
  };
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
 * Compares two threads to determine which one is newer.
 * @param threadA The first thread to compare.
 * @param threadB The second thread to compare.
 * @returns 1 if threadA is newer, -1 if threadB is newer, or 0 if they are the same age or can't be compared.
 */
function compareThreads<TThreadMetadata extends BaseMetadata>(
  thread1: ThreadData<TThreadMetadata>,
  thread2: ThreadData<TThreadMetadata>
): number {
  // Assuming both threads have the same ID, as mentioned in the question.
  if (thread1.id !== thread2.id) {
    throw new Error("Threads should have the same ID to be comparable");
  }

  // Compare updatedAt if available
  if (thread1.updatedAt && thread2.updatedAt) {
    return thread1.updatedAt > thread2.updatedAt
      ? 1
      : thread1.updatedAt < thread2.updatedAt
        ? -1
        : 0;
  } else if (thread1.updatedAt || thread2.updatedAt) {
    return thread1.updatedAt ? 1 : -1;
  }

  // Finally, compare createdAt
  if (thread1.createdAt > thread2.createdAt) {
    return 1;
  } else if (thread1.createdAt < thread2.createdAt) {
    return -1;
  }

  // If all dates are equal, return 0
  return 0;
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
