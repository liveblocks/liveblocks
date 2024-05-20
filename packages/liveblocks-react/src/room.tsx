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
  CacheState,
  CacheStore,
  CommentData,
  CommentsEventServerMsg,
  EnterOptions,
  LiveblocksError,
  OptionalPromise,
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
  ThreadsStateResolved,
  ThreadsStateSuccess,
  ThreadSubscription,
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

export const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

// --- Selector helpers ------------------------------------------------- {{{

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

// ---------------------------------------------------------------------- }}}
// --- Private APIs ----------------------------------------------------- {{{

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

const _bundles = new WeakMap<
  Client,
  RoomContextBundle<JsonObject, LsonObject, BaseUserMeta, Json, BaseMetadata>
>();

function getOrCreateRoomContextBundle<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
  TThreadMetadata extends BaseMetadata,
>(
  client: Client
): RoomContextBundle<
  TPresence,
  TStorage,
  TUserMeta,
  TRoomEvent,
  TThreadMetadata
> {
  let bundle = _bundles.get(client);
  if (!bundle) {
    bundle = makeRoomContextBundle(client);
    _bundles.set(client, bundle);
  }
  return bundle as unknown as RoomContextBundle<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  >;
}

type OpaqueRoom = Room<JsonObject, LsonObject, BaseUserMeta, Json>;

const RoomContext = React.createContext<OpaqueRoom | null>(null);

function makeRoomContextBundle<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
  TThreadMetadata extends BaseMetadata,
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

  const commentsErrorEventSource =
    makeEventSource<CommentsError<TThreadMetadata>>();

  const shared = createSharedContext<TUserMeta>(client);

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
    }, [room]);

    React.useEffect(() => {
      // Retrieve threads that have been updated/deleted since the last time the room requested threads updates
      void getThreadsUpdates(room.id);
    }, [room.id]);

    /**
     * Subscribe to the 'online' event to fetch threads/notifications updates when the browser goes back online.
     */
    React.useEffect(() => {
      function handleIsOnline() {
        void getThreadsUpdates(room.id);
      }

      window.addEventListener("online", handleIsOnline);
      return () => {
        window.removeEventListener("online", handleIsOnline);
      };
    }, [room.id]);

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
      <LiveblocksProvider client={client}>
        <RoomContext.Provider value={room}>
          {props.children}
        </RoomContext.Provider>
      </LiveblocksProvider>
    );
  }

  // Bind to typed hooks
  const useTRoom = () => useRoom() as TRoom;

  function useMyPresence(): [
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void,
  ] {
    const room = useTRoom();
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
    return useTRoom().updatePresence;
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
    const room = useTRoom();
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
    return useOthers(selectorFor_useOthersConnectionIds, shallow);
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

  function useEventListener(
    callback: (data: RoomEventMessage<TPresence, TUserMeta, TRoomEvent>) => void
  ): void {
    const room = useTRoom();
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

    const room = useTRoom();
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
    const room = useTRoom();
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
    return useTRoom().history;
  }

  function useUndo(): () => void {
    return useHistory().undo;
  }

  function useRedo(): () => void {
    return useHistory().redo;
  }

  function useCanUndo(): boolean {
    const room = useTRoom();
    const subscribe = room.events.history.subscribe;
    const canUndo = room.history.canUndo;
    return useSyncExternalStore(subscribe, canUndo, canUndo);
  }

  function useCanRedo(): boolean {
    const room = useTRoom();
    const subscribe = room.events.history.subscribe;
    const canRedo = room.history.canRedo;
    return useSyncExternalStore(subscribe, canRedo, canRedo);
  }

  function useLegacyKey<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    const room = useTRoom();
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

    const room = useTRoom();
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
    const room = useTRoom();
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
    const room = useTRoom();
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
    const room = useTRoom();
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
      // TODO: Create public error and notify via notificationsErrorEventSource?
      return;
    }

    throw innerError;
  }

  const subscribersByQuery: Map<string, number> = new Map(); // A map of query keys to the number of subscribers for that query
  const requestsByQuery: Map<string, Promise<any>> = new Map(); // A map of query keys to the promise of the request for that query

  const poller = makePoller(refreshThreadsAndNotifications);

  async function refreshThreadsAndNotifications() {
    const requests: Promise<any>[] = [];

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
  }

  function decrementQuerySubscribers(queryKey: string) {
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
  }

  async function getThreadsAndInboxNotifications(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    queryKey: string,
    options: UseThreadsOptions<TThreadMetadata>,
    { retryCount }: { retryCount: number } = { retryCount: 0 }
  ) {
    const existingRequest = requestsByQuery.get(queryKey);

    // If a request was already made for the query, we do not make another request and return the existing promise of the request
    if (existingRequest !== undefined) return existingRequest;

    const request = room[kInternal].comments.getThreads(options);

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

      return;
    }
  }

  const DEFAULT_DEDUPING_INTERVAL = 2000; // 2 seconds

  const lastRequestedAtByRoom = new Map<string, Date>(); // A map of room ids to the timestamp when the last request for threads updates was made
  const requestStatusByRoom = new Map<string, boolean>(); // A map of room ids to a boolean indicating whether a request to retrieve threads updates is in progress

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

  /**
   * Scroll to the comment with the ID in the hash of the URL based on whether
   * the query is loading and whether the hook should scroll to the comment on load.
   */
  function handleScrollToCommentOnLoad(
    isQueryLoading: boolean,
    shouldScrollOnLoad: boolean,
    state: ThreadsStateResolved<TThreadMetadata>
  ) {
    if (shouldScrollOnLoad === false) return;

    if (isQueryLoading === true) return;

    const isWindowDefined = typeof window !== "undefined";
    if (!isWindowDefined) return;

    const hash = window.location.hash;
    const commentId = hash.slice(1);

    // If the hash is not a comment ID, we do not scroll to it
    if (!commentId.startsWith("cm_")) return;

    // If a comment with the ID does not exist in the DOM, we do not scroll to it
    const comment = document.getElementById(commentId);
    if (comment === null) return;

    const comments = state.threads.flatMap((thread) => thread.comments);
    const isCommentInThreads = comments.some(
      (comment) => comment.id === commentId
    );

    // If the comment is not in the threads for this hook, we do not scroll to it
    if (!isCommentInThreads) return;

    comment.scrollIntoView();
  }

  function useThreads(
    options: UseThreadsOptions<TThreadMetadata> = {
      query: { metadata: {} },
    }
  ): ThreadsState<TThreadMetadata> {
    const { scrollOnLoad = true } = options;
    const room = useTRoom();
    const queryKey = React.useMemo(
      () => generateQueryKey(room.id, options.query),
      [room, options]
    );

    React.useEffect(() => {
      void getThreadsAndInboxNotifications(room, queryKey, options);
      incrementQuerySubscribers(queryKey);

      return () => decrementQuerySubscribers(queryKey);
    }, [room, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const selector = React.useCallback(
      (state: CacheState<TThreadMetadata>): ThreadsState<TThreadMetadata> => {
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

    React.useEffect(
      () => {
        if (state.isLoading === true) return;

        handleScrollToCommentOnLoad(state.isLoading, scrollOnLoad, state);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to run this effect once
      [state.isLoading]
    );

    return state;
  }

  function useThreadsSuspense(
    options: UseThreadsOptions<TThreadMetadata> = {
      query: { metadata: {} },
    }
  ): ThreadsStateSuccess<TThreadMetadata> {
    const { scrollOnLoad = true } = options;

    const room = useTRoom();
    const queryKey = React.useMemo(
      () => generateQueryKey(room.id, options.query),
      [room, options]
    );

    const query = store.get().queries[queryKey];

    if (query === undefined || query.isLoading) {
      throw getThreadsAndInboxNotifications(room, queryKey, options);
    }

    if (query.error) {
      throw query.error;
    }

    const selector = React.useCallback(
      (
        state: CacheState<TThreadMetadata>
      ): ThreadsStateSuccess<TThreadMetadata> => {
        return {
          threads: selectedThreads(room.id, state, options),
          isLoading: false,
        };
      },
      [room, queryKey] // eslint-disable-line react-hooks/exhaustive-deps
    );

    React.useEffect(() => {
      incrementQuerySubscribers(queryKey);

      return () => {
        decrementQuerySubscribers(queryKey);
      };
    }, [queryKey]);

    const state = useSyncExternalStoreWithSelector(
      store.subscribe,
      store.get,
      store.get,
      selector
    );

    React.useEffect(
      () => {
        handleScrollToCommentOnLoad(state.isLoading, scrollOnLoad, state);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to run this effect once
      [state.isLoading]
    );

    return state;
  }

  function useCreateThread() {
    const room = useTRoom();
    return React.useCallback(
      (
        options: CreateThreadOptions<TThreadMetadata>
      ): ThreadData<TThreadMetadata> => {
        const body = options.body;
        const metadata: TThreadMetadata =
          "metadata" in options ? options.metadata : ({} as TThreadMetadata);

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
        const newThread: ThreadData<TThreadMetadata> = {
          id: threadId,
          type: "thread",
          createdAt,
          updatedAt: createdAt,
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

        room[kInternal].comments
          .createThread({ threadId, commentId, body, metadata })
          .then(
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
    const room = useTRoom();
    return React.useCallback(
      (options: EditThreadMetadataOptions<TThreadMetadata>): void => {
        if (!("metadata" in options)) {
          return;
        }

        const threadId = options.threadId;
        const metadata = options.metadata;
        const updatedAt = new Date();

        const optimisticUpdateId = nanoid();

        store.pushOptimisticUpdate({
          type: "edit-thread-metadata",
          metadata,
          id: optimisticUpdateId,
          threadId,
          updatedAt,
        });

        room[kInternal].comments
          .editThreadMetadata({ metadata, threadId })
          .then(
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
                      metadata: metadata as [TThreadMetadata] extends [never]
                        ? Record<string, never>
                        : TThreadMetadata,
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
      [room]
    );
  }

  function useAddReaction() {
    const room = useTRoom();
    return React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const createdAt = new Date();
        const userId = getCurrentUserId(room);

        const optimisticUpdateId = nanoid();

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

        room[kInternal].comments
          .addReaction({ threadId, commentId, emoji })
          .then(
            (addedReaction) => {
              store.set((state): CacheState<TThreadMetadata> => {
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
      [room]
    );
  }

  function useRemoveReaction() {
    const room = useTRoom();
    return React.useCallback(
      ({ threadId, commentId, emoji }: CommentReactionOptions): void => {
        const userId = getCurrentUserId(room);

        const removedAt = new Date();
        const optimisticUpdateId = nanoid();

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
      [room]
    );
  }

  function useCreateComment(): (options: CreateCommentOptions) => CommentData {
    const room = useTRoom();
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
      [room]
    );
  }

  function useEditComment(): (options: EditCommentOptions) => void {
    const room = useTRoom();
    return React.useCallback(
      ({ threadId, commentId, body }: EditCommentOptions): void => {
        const editedAt = new Date();
        const optimisticUpdateId = nanoid();

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

        room[kInternal].comments
          .editComment({ threadId, commentId, body })
          .then(
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
      [room]
    );
  }

  function useDeleteComment() {
    const room = useTRoom();
    return React.useCallback(
      ({ threadId, commentId }: DeleteCommentOptions): void => {
        const deletedAt = new Date();

        const optimisticUpdateId = nanoid();

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
                  [threadId]: deleteComment(
                    existingThread,
                    commentId,
                    deletedAt
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
    const room = useTRoom();
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

  function useThreadSubscription(threadId: string): ThreadSubscription {
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

  function useMarkThreadAsRead() {
    const room = useTRoom();

    return React.useCallback(
      (threadId: string) => {
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
      [room]
    );
  }

  function makeNotificationSettingsQueryKey(roomId: string) {
    return `${roomId}:NOTIFICATION_SETTINGS`;
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

      return;
    }
  }

  function useRoomNotificationSettings(): [
    RoomNotificationSettingsState,
    (settings: Partial<RoomNotificationSettings>) => void,
  ] {
    const room = useTRoom();

    React.useEffect(() => {
      const queryKey = makeNotificationSettingsQueryKey(room.id);
      void getInboxNotificationSettings(room, queryKey);
    }, [room]);

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

  function useRoomNotificationSettingsSuspense(): [
    RoomNotificationSettingsStateSuccess,
    (settings: Partial<RoomNotificationSettings>) => void,
  ] {
    const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();
    const room = useTRoom();
    const queryKey = makeNotificationSettingsQueryKey(room.id);
    const query = store.get().queries[queryKey];

    if (query === undefined || query.isLoading) {
      throw getInboxNotificationSettings(room, queryKey);
    }

    if (query.error) {
      throw query.error;
    }

    const selector = React.useCallback(
      (
        state: CacheState<BaseMetadata>
      ): RoomNotificationSettingsStateSuccess => {
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
    const room = useTRoom();
    return React.useCallback(
      (settings: Partial<RoomNotificationSettings>) => {
        const optimisticUpdateId = nanoid();

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
      [room]
    );
  }

  function useCurrentUserId() {
    return useSelf((user) => (typeof user.id === "string" ? user.id : null));
  }

  const bundle: RoomContextBundle<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  > = {
    RoomContext: RoomContext as React.Context<TRoom | null>,
    RoomProvider: RoomProviderOuter, // XXX Convert

    useRoom: useTRoom,
    useStatus,

    useBatch,
    useBroadcastEvent,
    useOthersListener,
    useLostConnectionListener,
    useErrorListener,
    useEventListener, // XXX Convert

    useHistory, // XXX Convert
    useUndo, // XXX Convert
    useRedo, // XXX Convert
    useCanRedo, // XXX Convert
    useCanUndo, // XXX Convert

    // These are just aliases. The passed-in key will define their return values.
    useList: useLegacyKey, // XXX Convert
    useMap: useLegacyKey, // XXX Convert
    useObject: useLegacyKey, // XXX Convert

    useStorageRoot, // XXX Convert
    useStorage, // XXX Convert

    useSelf, // XXX Convert
    useMyPresence, // XXX Convert
    useUpdateMyPresence, // XXX Convert
    useOthers, // XXX Convert
    useOthersMapped, // XXX Convert
    useOthersConnectionIds, // XXX Convert
    useOther, // XXX Convert

    useMutation, // XXX Convert

    useThreads, // XXX Convert

    useCreateThread, // XXX Convert
    useEditThreadMetadata, // XXX Convert
    useCreateComment, // XXX Convert
    useEditComment, // XXX Convert
    useDeleteComment, // XXX Convert
    useAddReaction, // XXX Convert
    useRemoveReaction, // XXX Convert
    useMarkThreadAsRead, // XXX Convert
    useThreadSubscription, // XXX Convert

    useRoomNotificationSettings, // XXX Convert
    useUpdateRoomNotificationSettings, // XXX Convert

    ...shared.classic,

    suspense: {
      RoomContext: RoomContext as React.Context<TRoom | null>,
      RoomProvider: RoomProviderOuter, // XXX Convert

      useRoom: useTRoom,
      useStatus,

      useBatch,
      useBroadcastEvent,
      useOthersListener,
      useLostConnectionListener,
      useErrorListener,
      useEventListener, // XXX Convert

      useHistory, // XXX Convert
      useUndo, // XXX Convert
      useRedo, // XXX Convert
      useCanRedo, // XXX Convert
      useCanUndo, // XXX Convert

      // Legacy hooks
      useList: useLegacyKeySuspense, // XXX Convert
      useMap: useLegacyKeySuspense, // XXX Convert
      useObject: useLegacyKeySuspense, // XXX Convert

      useStorageRoot, // XXX Convert
      useStorage: useStorageSuspense, // XXX Convert

      useSelf: useSelfSuspense, // XXX Convert
      useMyPresence, // XXX Convert
      useUpdateMyPresence, // XXX Convert
      useOthers: useOthersSuspense, // XXX Convert
      useOthersMapped: useOthersMappedSuspense, // XXX Convert
      useOthersConnectionIds: useOthersConnectionIdsSuspense, // XXX Convert
      useOther: useOtherSuspense, // XXX Convert

      useMutation, // XXX Convert

      useThreads: useThreadsSuspense, // XXX Convert

      useCreateThread, // XXX Convert
      useEditThreadMetadata, // XXX Convert
      useCreateComment, // XXX Convert
      useEditComment, // XXX Convert
      useDeleteComment, // XXX Convert
      useAddReaction, // XXX Convert
      useRemoveReaction, // XXX Convert
      useMarkThreadAsRead, // XXX Convert
      useThreadSubscription, // XXX Convert

      useRoomNotificationSettings: useRoomNotificationSettingsSuspense, // XXX Convert
      useUpdateRoomNotificationSettings, // XXX Convert

      ...shared.suspense,
    },

    [kInternal]: {
      useCurrentUserId, // XXX Convert
      hasResolveMentionSuggestions: resolveMentionSuggestions !== undefined, // XXX Convert
      useMentionSuggestions, // XXX Convert
    },
  };

  return Object.defineProperty(bundle, kInternal, {
    enumerable: false,
  });
}

// ---------------------------------------------------------------------- }}}
// --- Private useXxx_withClient() helpers ------------------------------ {{{

function useRoom(): OpaqueRoom {
  const room = React.useContext(RoomContext);
  if (room === null) {
    throw new Error("RoomProvider is missing from the React tree.");
  }
  return room as OpaqueRoom;
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

function useBroadcastEvent<TRoomEvent extends Json>(): (
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

function useOthersListener<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
>(callback: (event: OthersEvent<TPresence, TUserMeta>) => void) {
  const room = useRoom() as Room<TPresence, never, TUserMeta, never>;
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

// ---------------------------------------------------------------------- }}}
// --- Public APIs ------------------------------------------------------ {{{

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

type Options<TUserMeta extends BaseUserMeta> = {
  /**
   * @deprecated Define 'resolveUsers' in 'createClient' from '@liveblocks/client' instead.
   * Please refer to our Upgrade Guide to learn more, see https://liveblocks.io/docs/platform/upgrading/1.10.
   *
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(TUserMeta["info"] | undefined)[] | undefined>;

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

  return getOrCreateRoomContextBundle<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  >(client);
}

export function generateQueryKey<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  options: UseThreadsOptions<TThreadMetadata>["query"]
) {
  return `${roomId}-${stringify(options ?? {})}`;
}

// ---------------------------------------------------------------------- }}}
