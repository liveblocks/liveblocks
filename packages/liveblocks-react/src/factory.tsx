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
  Room,
  Status,
  User,
} from "@liveblocks/client";
import { shallow } from "@liveblocks/client";
import type {
  AsyncCache,
  BaseMetadata,
  CommentData,
  RoomEventMessage,
  ToImmutable,
} from "@liveblocks/core";
import {
  createAsyncCache,
  deprecateIf,
  errorIf,
  isLiveNode,
  makeEventSource,
  stringify,
} from "@liveblocks/core";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import type {
  CommentReactionOptions,
  CommentsRoom,
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  ThreadsState,
} from "./comments/CommentsRoom";
import { createCommentsRoom } from "./comments/CommentsRoom";
import type { CommentsApiError } from "./comments/errors";
import { useDebounce } from "./comments/lib/use-debounce";
import { useAsyncCache } from "./lib/use-async-cache";
import { useInitial } from "./lib/use-initial";
import { useRerender } from "./lib/use-rerender";
import type {
  InternalRoomContextBundle,
  MutationContext,
  OmitFirstArg,
  ResolveMentionSuggestionsOptions,
  ResolveUserOptions,
  RoomContextBundle,
  RoomProviderProps,
  UserState,
  UserStateSuccess,
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

Why? Please see https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child for more information`;

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

// Don't try to inline this. This function is intended to be a stable
// reference, to avoid a React.useCallback() wrapper.
function alwaysConnecting() {
  return "connecting" as const;
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
   * An asynchronous function that returns user info from a user ID.
   */
  resolveUser?: (
    options: ResolveUserOptions
  ) => Promise<TUserMeta["info"] | undefined>;

  /**
   * @beta
   *
   * An asynchronous function that returns a list of user IDs matching a string.
   */
  resolveMentionSuggestions?: (
    options: ResolveMentionSuggestionsOptions
  ) => Promise<string[]>;

  /**
   * @internal Internal endpoint
   */
  serverEndpoint?: string;
};

let hasWarnedIfNoResolveUser = false;

function warnIfNoResolveUser(usersCache?: AsyncCache<unknown, unknown>) {
  if (
    !hasWarnedIfNoResolveUser &&
    !usersCache &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "Set the resolveUser option in createRoomContext to specify user info."
    );
    hasWarnedIfNoResolveUser = true;
  }
}

// TODO: Remove after beta
let hasWarnedAboutCommentsBeta = false;
function warnIfBetaCommentsHook() {
  if (!hasWarnedAboutCommentsBeta && process.env.NODE_ENV !== "production") {
    console.warn(
      "Comments is currently in private beta. Learn more at https://liveblocks.io/docs/products/comments."
    );
    hasWarnedAboutCommentsBeta = true;
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
  const RoomContext = React.createContext<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>(null);

  function RoomProvider(props: RoomProviderProps<TPresence, TStorage>) {
    const {
      id: roomId,
      initialPresence,
      initialStorage,
      unstable_batchedUpdates,
      shouldInitiallyConnect,
    } = props;

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
    const frozen = useInitial({
      initialPresence,
      initialStorage,
      unstable_batchedUpdates,
      shouldInitiallyConnect:
        shouldInitiallyConnect === undefined
          ? typeof window !== "undefined"
          : shouldInitiallyConnect,
    });

    const [room, setRoom] = React.useState<
      Room<TPresence, TStorage, TUserMeta, TRoomEvent>
    >(() =>
      client.enter(roomId, {
        initialPresence: frozen.initialPresence,
        initialStorage: frozen.initialStorage,
        shouldInitiallyConnect: frozen.shouldInitiallyConnect,
        unstable_batchedUpdates: frozen.unstable_batchedUpdates,
      })
    );

    React.useEffect(() => {
      const room = client.enter<TPresence, TStorage, TUserMeta, TRoomEvent>(
        roomId,
        {
          initialPresence: frozen.initialPresence,
          initialStorage: frozen.initialStorage,
          shouldInitiallyConnect: frozen.shouldInitiallyConnect,
          unstable_batchedUpdates: frozen.unstable_batchedUpdates,
        }
      );

      setRoom(room);

      return () => {
        const commentsRoom = commentsRooms.get(room);
        if (commentsRoom) {
          commentsRooms.delete(room);
        }
        client.leave(roomId);
      };
    }, [roomId, frozen]);

    return (
      <RoomContext.Provider value={room}>
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
      </RoomContext.Provider>
    );
  }

  function connectionIdSelector(
    others: readonly User<TPresence, TUserMeta>[]
  ): number[] {
    return others.map((user) => user.connectionId);
  }

  function useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
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
    const getServerSnapshot = alwaysConnecting;
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

  function useLostConnectionListener(
    callback: (event: LostConnectionEvent) => void
  ): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(
      () =>
        room.events.lostConnection.subscribe((event: LostConnectionEvent) =>
          savedCallback.current(event)
        ),
      [room]
    );
  }

  function useErrorListener(callback: (err: Error) => void): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(
      () => room.events.error.subscribe((e: Error) => savedCallback.current(e)),
      [room]
    );
  }

  function useEventListener(
    callback: (data: RoomEventMessage<TPresence, TUserMeta, TRoomEvent>) => void
  ): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(() => {
      const listener = (
        eventData: RoomEventMessage<TPresence, TUserMeta, TRoomEvent>
      ) => {
        savedCallback.current(eventData);
      };

      return room.events.customEvent.subscribe(listener);
    }, [room]);
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

  const commentsErrorEventSource =
    makeEventSource<CommentsApiError<TThreadMetadata>>();
  const commentsRooms = new Map<
    Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
    CommentsRoom<TThreadMetadata>
  >();

  function getCommentsRoom(
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>
  ) {
    let commentsRoom = commentsRooms.get(room);
    if (commentsRoom === undefined) {
      commentsRoom = createCommentsRoom(room, commentsErrorEventSource);
      commentsRooms.set(room, commentsRoom);
    }
    return commentsRoom;
  }

  function useThreads(): ThreadsState<TThreadMetadata> {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return getCommentsRoom(room).useThreads();
  }

  function useThreadsSuspense() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return getCommentsRoom(room).useThreadsSuspense();
  }

  function useCreateThread() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: CreateThreadOptions<TThreadMetadata>) =>
        getCommentsRoom(room).createThread(options),
      [room]
    );
  }

  function useEditThreadMetadata() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>) =>
        getCommentsRoom(room).editThreadMetadata(options),
      [room]
    );
  }

  function useAddReaction() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: CommentReactionOptions) =>
        getCommentsRoom(room).addReaction(options),
      [room]
    );
  }

  function useRemoveReaction() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: CommentReactionOptions) =>
        getCommentsRoom(room).removeReaction(options),
      [room]
    );
  }

  function useCreateComment(): (options: CreateCommentOptions) => CommentData {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: CreateCommentOptions) =>
        getCommentsRoom(room).createComment(options),
      [room]
    );
  }

  function useEditComment(): (options: EditCommentOptions) => void {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: EditCommentOptions) =>
        getCommentsRoom(room).editComment(options),
      [room]
    );
  }

  function useDeleteComment() {
    const room = useRoom();

    React.useEffect(() => {
      warnIfBetaCommentsHook();
    }, []);

    return React.useCallback(
      (options: DeleteCommentOptions) =>
        getCommentsRoom(room).deleteComment(options),
      [room]
    );
  }

  const { resolveUser, resolveMentionSuggestions } = options ?? {};

  const usersCache = resolveUser
    ? createAsyncCache((stringifiedOptions: string) => {
        return resolveUser(
          JSON.parse(stringifiedOptions) as ResolveUserOptions
        );
      })
    : undefined;

  function useUser(userId: string) {
    const resolverKey = React.useMemo(() => stringify({ userId }), [userId]);
    const state = useAsyncCache(usersCache, resolverKey);

    React.useEffect(() => warnIfNoResolveUser(usersCache), []);

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
    const resolverKey = React.useMemo(() => stringify({ userId }), [userId]);
    const state = useAsyncCache(usersCache, resolverKey, {
      suspense: true,
    });

    React.useEffect(() => warnIfNoResolveUser(usersCache), []);

    return {
      user: state.data,
      isLoading: false,
    } as UserStateSuccess<TUserMeta["info"]>;
  }

  const mentionSuggestionsCache = createAsyncCache<string[], unknown>(
    resolveMentionSuggestions
      ? (stringifiedOptions: string) => {
          return resolveMentionSuggestions(
            JSON.parse(stringifiedOptions) as ResolveMentionSuggestionsOptions
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
    RoomProvider,

    useRoom,
    useStatus,

    useBatch,
    useBroadcastEvent,
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
      RoomProvider,

      useRoom,
      useStatus,

      useBatch,
      useBroadcastEvent,
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
