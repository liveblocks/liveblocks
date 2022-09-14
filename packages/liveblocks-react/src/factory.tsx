import type {
  BaseUserMeta,
  BroadcastOptions,
  Client,
  History,
  Json,
  JsonObject,
  LiveObject,
  LsonObject,
  Others,
  Room,
  User,
} from "@liveblocks/client";
import { shallow } from "@liveblocks/client";
import type {
  RoomInitializers,
  ToImmutable,
} from "@liveblocks/client/internal";
import { asArrayWithLegacyMethods } from "@liveblocks/client/internal";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

import { useInitial, useRerender } from "./hooks";
import type {
  MutationContext,
  OmitFirstArg,
  RoomContextBundle,
  RoomProviderProps,
} from "./types";

const noop = () => {};
const identity: <T>(x: T) => T = (x) => x;

function useSyncExternalStore<Snapshot>(
  s: (onStoreChange: () => void) => () => void,
  g: () => Snapshot,
  gg: undefined | null | (() => Snapshot)
): Snapshot {
  return useSyncExternalStoreWithSelector(s, g, gg, identity);
}

const EMPTY_OTHERS =
  // NOTE: asArrayWithLegacyMethods() wrapping should no longer be necessary in 0.19
  asArrayWithLegacyMethods([]);

function getEmptyOthers() {
  return EMPTY_OTHERS;
}

function makeMutationContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>
): MutationContext<TPresence, TStorage, TUserMeta> {
  const errmsg =
    "This mutation cannot be used until connected to the Liveblocks room";

  return {
    get root() {
      const root = room.getStorageSnapshot();
      if (root === null) {
        throw new Error(errmsg);
      }
      return root;
    },

    get self() {
      const self = room.getSelf();
      // NOTE: We could use room.isSelfAware() here to keep the check
      // consistent with `others`, but we also want to refine the `null` case
      // away here.
      if (self === null) {
        throw new Error(errmsg);
      }
      return self;
    },

    get others() {
      const others = room.getOthers();
      if (!room.isSelfAware()) {
        throw new Error(errmsg);
      }
      return others;
    },

    setMyPresence: room.updatePresence,
  };
}

export function createRoomContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = never
>(
  client: Client
): RoomContextBundle<TPresence, TStorage, TUserMeta, TRoomEvent> {
  const RoomContext = React.createContext<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>(null);

  function RoomProvider(props: RoomProviderProps<TPresence, TStorage>) {
    const { id: roomId, initialPresence, initialStorage } = props;

    if (process.env.NODE_ENV !== "production") {
      if (!roomId) {
        throw new Error(
          "RoomProvider id property is required. For more information: https://liveblocks.io/docs/errors/liveblocks-react/RoomProvider-id-property-is-required"
        );
      }
      if (typeof roomId !== "string") {
        throw new Error("RoomProvider id property should be a string.");
      }
    }

    // Note: We'll hold on to the initial value given here, and ignore any
    // changes to this argument in subsequent renders
    const frozen = useInitial({
      initialPresence,
      initialStorage,
    });

    const [room, setRoom] = React.useState<
      Room<TPresence, TStorage, TUserMeta, TRoomEvent>
    >(() =>
      client.enter(roomId, {
        initialPresence,
        initialStorage,
        DO_NOT_USE_withoutConnecting: typeof window === "undefined",
      } as RoomInitializers<TPresence, TStorage>)
    );

    React.useEffect(() => {
      setRoom(
        client.enter(roomId, {
          initialPresence: frozen.initialPresence,
          initialStorage: frozen.initialStorage,
          DO_NOT_USE_withoutConnecting: typeof window === "undefined",
        } as RoomInitializers<TPresence, TStorage>)
      );

      return () => {
        client.leave(roomId);
      };
    }, [roomId, frozen]);

    return (
      <RoomContext.Provider value={room}>{props.children}</RoomContext.Provider>
    );
  }

  function connectionIdSelector(
    others: Others<TPresence, TUserMeta>
  ): number[] {
    return others.map((user) => user.connectionId);
  }

  function useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const room = React.useContext(RoomContext);
    if (room === null) {
      throw new Error("RoomProvider is missing from the react tree");
    }
    return room;
  }

  function useMyPresence(): [
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ] {
    const room = useRoom();
    const subscribe = room.events.me.subscribe;
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

  function useOthers(): Others<TPresence, TUserMeta>;
  function useOthers<T>(
    selector: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useOthers<T>(
    selector?: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | Others<TPresence, TUserMeta> {
    const room = useRoom();
    const subscribe = room.events.others.subscribe;
    const getSnapshot = room.getOthers;
    const getServerSnapshot = getEmptyOthers;
    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      selector ?? (identity as (others: Others<TPresence, TUserMeta>) => T),
      isEqual
    );
  }

  function useConnectionIds(): readonly number[] {
    return useOthers(connectionIdSelector, shallow);
  }

  function useOthersWithData<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): readonly { readonly connectionId: number; readonly data: T }[] {
    const wrappedSelector = React.useCallback(
      (others: Others<TPresence, TUserMeta>) =>
        others.map((other) => ({
          connectionId: other.connectionId,
          data: itemSelector(other),
        })),
      [itemSelector]
    );

    const wrappedIsEqual = React.useCallback(
      (
        a: { readonly connectionId: number; readonly data: T }[],
        b: { readonly connectionId: number; readonly data: T }[]
      ): boolean => {
        const eq = itemIsEqual ?? Object.is;
        return (
          a.length === b.length &&
          a.every((atuple, index) => {
            const btuple = b[index];
            return (
              atuple.connectionId === btuple.connectionId &&
              eq(atuple.data, btuple.data)
            );
          })
        );
      },
      [itemIsEqual]
    );

    return useOthers(wrappedSelector, wrappedIsEqual);
  }

  const sentinel = Symbol();

  function useOther(connectionId: number): User<TPresence, TUserMeta>;
  function useOther<T>(
    connectionId: number,
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useOther<T>(
    connectionId: number,
    selector?: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | User<TPresence, TUserMeta> {
    // Deliberately bypass React warnings about conditionally calling hooks
    const _useCallback = React.useCallback;
    const _useOthers = useOthers;
    if (selector === undefined) {
      const selector = _useCallback(
        (others: Others<TPresence, TUserMeta>) =>
          // TODO: Make this O(1) instead of O(n)?
          others.find((other) => other.connectionId === connectionId),
        [connectionId]
      );
      const other = _useOthers(selector, shallow);
      if (other === undefined) {
        throw new Error(
          `No such other user with connection id ${connectionId} exists`
        );
      }
      return other;
    } else {
      const wrappedSelector = _useCallback(
        (others: Others<TPresence, TUserMeta>) => {
          // TODO: Make this O(1) instead of O(n)?
          const other = others.find(
            (other) => other.connectionId === connectionId
          );
          return other !== undefined ? selector(other) : sentinel;
        },
        [connectionId, selector]
      );

      const wrappedIsEqual = _useCallback(
        (prev: T | typeof sentinel, curr: T | typeof sentinel): boolean => {
          if (prev === sentinel || curr === sentinel) {
            return prev === curr;
          }

          const eq = isEqual ?? Object.is;
          return eq(prev, curr);
        },
        [isEqual]
      );

      const other = _useOthers(wrappedSelector, wrappedIsEqual);
      if (other === sentinel) {
        throw new Error(
          `No such other user with connection id ${connectionId} exists`
        );
      }
      return other;
    }
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
    callback: (eventData: { connectionId: number; event: TRoomEvent }) => void
  ): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(() => {
      const listener = (eventData: {
        connectionId: number;
        event: TRoomEvent;
      }) => {
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

    const subscribe = React.useCallback(
      (onChange: () => void) => {
        const unsub1 = room.events.me.subscribe(onChange);
        const unsub2 = room.events.connection.subscribe(onChange);
        return () => {
          unsub1();
          unsub2();
        };
      },
      [room]
    );

    const getSnapshot: () => Snapshot = room.getSelf;

    const selector =
      maybeSelector ?? (identity as (me: User<TPresence, TUserMeta>) => T);

    const wrappedSelector = React.useCallback(
      (me: Snapshot): Selection => (me !== null ? selector(me) : null),
      [selector]
    );

    const getServerSnapshot = React.useCallback((): Snapshot => null, []);

    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      wrappedSelector,
      isEqual
    );
  }

  function useMutableStorageRoot(): LiveObject<TStorage> | null {
    type Snapshot = LiveObject<TStorage> | null;
    const room = useRoom();
    const subscribe = room.events.storageDidLoad.subscribeOnce;
    const getSnapshot = room.getStorageSnapshot;
    const getServerSnapshot = React.useCallback((): Snapshot => null, []);
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
    const root = useMutableStorageRoot();
    const rerender = useRerender();

    React.useEffect(() => {
      if (root === null) {
        return;
      }

      let liveValue = root.get(key);

      function onRootChange() {
        const newCrdt = root!.get(key);
        if (newCrdt !== liveValue) {
          unsubscribeCrdt();
          liveValue = newCrdt;
          unsubscribeCrdt = room.subscribe(
            liveValue as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
            rerender
          );
          rerender();
        }
      }

      let unsubscribeCrdt = room.subscribe(
        liveValue as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
        rerender
      );
      const unsubscribeRoot = room.subscribe(
        root as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
        onRootChange
      );

      rerender();

      return () => {
        unsubscribeRoot();
        unsubscribeCrdt();
      };
    }, [root, room, key, rerender]);

    if (root === null) {
      return null;
    } else {
      return root.get(key);
    }
  }

  function useStorage(): ToImmutable<TStorage> | null;
  function useStorage<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | null;
  function useStorage<T>(
    maybeSelector?: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T | null, curr: T | null) => boolean
  ): T | null {
    type Snapshot = ToImmutable<TStorage> | null;
    type Selection = T | null;

    const room = useRoom();
    const rootOrNull = useMutableStorageRoot();

    const selector =
      maybeSelector ?? (identity as (root: ToImmutable<TStorage>) => T);

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
        return imm as ToImmutable<TStorage>;
      }
    }, [rootOrNull]);

    const getServerSnapshot = React.useCallback((): Snapshot => null, []);

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
    if (room.isSelfAware()) {
      return;
    }

    ensureNotServerSide();

    // Throw a _promise_. Suspense will suspend the component tree until this
    // promise resolves (aka until storage has loaded). After that, it will
    // render this component tree again.
    throw new Promise<void>((res) => {
      room.events.connection.subscribeOnce(() => res());
    });
  }

  function useMutation<
    F extends (
      context: MutationContext<TPresence, TStorage, TUserMeta>,
      ...args: any[]
    ) => any
  >(callback: F, deps: readonly unknown[]): OmitFirstArg<F> {
    const room = useRoom();
    return React.useMemo(
      () => {
        return ((...args) =>
          room.batch(() =>
            callback(makeMutationContext(room), ...args)
          )) as OmitFirstArg<F>;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [room, ...deps]
    );
  }

  function useStorageSuspense(): ToImmutable<TStorage>;
  function useStorageSuspense<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useStorageSuspense<T>(
    selector?: (root: ToImmutable<TStorage>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | ToImmutable<TStorage> {
    useSuspendUntilStorageLoaded();

    // NOTE: Lots of type forcing here, but only to avoid calling the hooks
    // conditionally
    return useStorage(
      selector as (root: ToImmutable<TStorage>) => T,
      isEqual as (prev: T | null, curr: T | null) => boolean
    ) as T | ToImmutable<TStorage>;
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

    // NOTE: Lots of type forcing here, but only to avoid calling the hooks
    // conditionally
    return useSelf(
      selector as (me: User<TPresence, TUserMeta>) => T,
      isEqual as (prev: T | null, curr: T | null) => boolean
    ) as T | User<TPresence, TUserMeta>;
  }

  function useOthersSuspense<T>(
    selector?: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | Others<TPresence, TUserMeta> {
    useSuspendUntilPresenceLoaded();

    // NOTE: Lots of type forcing here, but only to avoid calling the hooks
    // conditionally
    return useOthers(
      selector as (others: Others<TPresence, TUserMeta>) => T,
      isEqual as (prev: T, curr: T) => boolean
    ) as T | Others<TPresence, TUserMeta>;
  }

  function useConnectionIdsSuspense(): readonly number[] {
    useSuspendUntilPresenceLoaded();
    return useConnectionIds();
  }

  function useOthersWithDataSuspense<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): readonly { readonly connectionId: number; readonly data: T }[] {
    useSuspendUntilPresenceLoaded();
    return useOthersWithData(itemSelector, itemIsEqual);
  }

  function useOtherSuspense(connectionId: number): User<TPresence, TUserMeta>;
  function useOtherSuspense<T>(
    connectionId: number,
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;
  function useOtherSuspense<T>(
    connectionId: number,
    selector?: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T | User<TPresence, TUserMeta> {
    useSuspendUntilPresenceLoaded();

    // NOTE: Lots of type forcing here, but only to avoid calling the hooks
    // conditionally
    return useOther(
      connectionId,
      selector as (other: User<TPresence, TUserMeta>) => T,
      isEqual as (prev: T, curr: T) => boolean
    ) as T | User<TPresence, TUserMeta>;
  }

  function useLegacyKeySuspense<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] {
    useSuspendUntilStorageLoaded();
    return useLegacyKey(key) as TStorage[TKey];
  }

  return {
    RoomContext,
    RoomProvider,

    useRoom,

    useBatch,
    useBroadcastEvent,
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
    useOthersWithData,
    useConnectionIds,
    useOther,

    useMutation,

    suspense: {
      RoomContext,
      RoomProvider,

      useRoom,

      useBatch,
      useBroadcastEvent,
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
      useOthersWithData: useOthersWithDataSuspense,
      useConnectionIds: useConnectionIdsSuspense,
      useOther: useOtherSuspense,

      useMutation,
    },
  };
}
