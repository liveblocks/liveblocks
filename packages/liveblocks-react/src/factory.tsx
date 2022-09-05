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
import type {
  Resolve,
  RoomInitializers,
  ToImmutable,
} from "@liveblocks/client/internal";
import { freeze } from "@liveblocks/client/internal";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

import { useInitial, useRerender } from "./hooks";

const noop = () => {};
const identity: <T>(x: T) => T = (x) => x;

const EMPTY_OTHERS: Others<never, never> = [] as unknown as Others<
  never,
  never
>;

// NOTE: We extend the array instance with custom `count` and `toArray()`
// methods here. This is done for backward-compatible reasons. These APIs
// will be deprecated in a future version.
Object.defineProperty(EMPTY_OTHERS, "count", {
  value: 0,
  enumerable: false,
});
Object.defineProperty(EMPTY_OTHERS, "toArray", {
  value: () => EMPTY_OTHERS,
  enumerable: false,
});

freeze(EMPTY_OTHERS);

function getEmptyOthers() {
  return EMPTY_OTHERS;
}

export type RoomProviderProps<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: React.ReactNode;
  } & RoomInitializers<TPresence, TStorage>
>;

type RoomContextBundle<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  RoomContext: React.Context<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>;

  /**
   * Makes a Room available in the component hierarchy below.
   * When this component is unmounted, the current user leave the room.
   * That means that you can't have 2 RoomProvider with the same room id in your react tree.
   */
  RoomProvider(props: RoomProviderProps<TPresence, TStorage>): JSX.Element;

  /**
   * Returns a function that batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the modifications are merged in a single history item (undo/redo).
   * All the subscribers are called only after the batch is over.
   */
  useBatch(): (callback: () => void) => void;

  /**
   * Returns a callback that lets you broadcast custom events to other users in the room
   *
   * @example
   * const broadcast = useBroadcastEvent();
   *
   * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
   */
  useBroadcastEvent(): (event: TRoomEvent, options?: BroadcastOptions) => void;

  /**
   * useErrorListener is a react hook that lets you react to potential room connection errors.
   *
   * @example
   * useErrorListener(er => {
   *   console.error(er);
   * })
   */
  useErrorListener(callback: (err: Error) => void): void;

  /**
   * useEventListener is a react hook that lets you react to event broadcasted by other users in the room.
   *
   * @example
   * useEventListener(({ connectionId, event }) => {
   *   if (event.type === "CUSTOM_EVENT") {
   *     // Do something
   *   }
   * });
   */
  useEventListener(
    callback: (eventData: { connectionId: number; event: TRoomEvent }) => void
  ): void;

  /**
   * Returns the room.history
   */
  useHistory(): History;

  /**
   * Returns a function that undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useUndo(): () => void;

  /**
   * Returns a function that redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useRedo(): () => void;

  /**
   * Returns whether there are any operations to undo.
   */
  useCanUndo(): boolean;

  /**
   * Returns whether there are any operations to redo.
   */
  useCanRedo(): boolean;

  /**
   * Returns the LiveList associated with the provided key.
   * The hook triggers a re-render if the LiveList is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveList
   * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
   *
   * @example
   * const animals = useList("animals");  // e.g. [] or ["🦁", "🐍", "🦍"]
   */
  useList<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns the LiveMap associated with the provided key. If the LiveMap does not exist, a new empty LiveMap will be created.
   * The hook triggers a re-render if the LiveMap is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveMap
   * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
   *
   * @example
   * const shapesById = useMap("shapes");
   */
  useMap<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns the LiveObject associated with the provided key.
   * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveObject
   * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
   *
   * @example
   * const object = useObject("obj");
   */
  useObject<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns your entire Liveblocks Storage as an immutable data structure.
   *
   * @example
   * const root = useStorage();
   */
  useStorage(): ToImmutable<TStorage> | null;

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
  useStorage<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (a: T, b: T) => boolean
  ): T | null;

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
  useMyPresence(): [
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ];

  /**
   * Returns an object that lets you get information about all the users
   * currently connected in the room.
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
  useOthers(): Others<TPresence, TUserMeta>;

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
  useOthers<T>(
    selector: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (a: T, b: T) => boolean
  ): T;

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Gets the current user once it is connected to the room.
   *
   * @example
   * const me = useSelf();
   * const { x, y } = me.presence.cursor;
   */
  useSelf(): User<TPresence, TUserMeta> | null;

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
  useSelf<T>(
    selector: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (a: T, b: T) => boolean
  ): T | null;

  /**
   * Returns the mutable (!) Storage root. This hook exists for
   * backward-compatible reasons.
   *
   * @example
   * const [root] = useStorageRoot();
   */
  useStorageRoot(): [root: LiveObject<TStorage> | null];

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
  useUpdateMyPresence(): (
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void;
};

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
      if (roomId == null) {
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

  function useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const room = React.useContext(RoomContext);
    if (room == null) {
      throw new Error("RoomProvider is missing from the react tree");
    }
    return room;
  }

  function useMyPresence(): [
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ] {
    const room = useRoom();
    const presence = room.getPresence();
    const rerender = useRerender();

    React.useEffect(() => room.events.me.subscribe(rerender), [room, rerender]);

    const setPresence = React.useCallback(
      (patch: Partial<TPresence>, options?: { addToHistory: boolean }) =>
        room.updatePresence(patch, options),
      [room]
    );

    return [presence, setPresence];
  }

  function useUpdateMyPresence(): (
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => {
        room.updatePresence(patch, options);
      },
      [room]
    );
  }

  function useOthers(): Others<TPresence, TUserMeta>;
  function useOthers<T>(
    selector: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (a: T, b: T) => boolean
  ): T;
  function useOthers<T>(
    selector?: (others: Others<TPresence, TUserMeta>) => T,
    isEqual?: (a: T, b: T) => boolean
  ): T | Others<TPresence, TUserMeta> {
    type Snapshot = Others<TPresence, TUserMeta>;

    const room = useRoom();

    const subscribe = room.events.others.subscribe;

    const getSnapshot = React.useCallback(
      (): Snapshot => room.getOthers(),
      [room]
    );

    const getServerSnapshot = getEmptyOthers;

    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      selector ?? (identity as (others: Others<TPresence, TUserMeta>) => T),
      isEqual
    );
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
    isEqual?: (a: T | null, b: T | null) => boolean
  ): T | null;
  function useSelf<T>(
    maybeSelector?: (me: User<TPresence, TUserMeta>) => T,
    isEqual?: (a: T | null, b: T | null) => boolean
  ): T | null {
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
    const subscribe = room.events.storageDidLoad.subscribe;
    const getSnapshot = room.getStorageSnapshot;
    const getServerSnapshot = React.useCallback((): Snapshot => null, []);
    const selector = identity;
    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getServerSnapshot,
      selector
    );
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
    const [canUndo, setCanUndo] = React.useState(room.history.canUndo);

    React.useEffect(
      () => room.events.history.subscribe(({ canUndo }) => setCanUndo(canUndo)),
      [room]
    );

    return canUndo;
  }

  function useCanRedo(): boolean {
    const room = useRoom();
    const [canRedo, setCanRedo] = React.useState(room.history.canRedo);

    React.useEffect(
      () => room.events.history.subscribe(({ canRedo }) => setCanRedo(canRedo)),
      [room]
    );

    return canRedo;
  }

  function useBatch(): (callback: () => void) => void {
    return useRoom().batch;
  }

  function useLegacyKey<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    const room = useRoom();
    const root = useMutableStorageRoot();
    const rerender = useRerender();

    React.useEffect(() => {
      if (root == null) {
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

    if (root == null) {
      return null;
    } else {
      return root.get(key);
    }
  }

  function useStorage(): ToImmutable<TStorage> | null;
  function useStorage<T>(
    selector: (root: ToImmutable<TStorage>) => T,
    isEqual?: (a: T | null, b: T | null) => boolean
  ): T | null;
  function useStorage<T>(
    maybeSelector?: (root: ToImmutable<TStorage>) => T,
    isEqual?: (a: T | null, b: T | null) => boolean
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

  return {
    RoomProvider,
    useBatch,
    useBroadcastEvent,
    useCanRedo,
    useCanUndo,
    useErrorListener,
    useEventListener,
    useHistory,
    useMyPresence,
    useOthers,
    useRedo,
    useRoom,

    useSelf,
    useStorageRoot,
    useStorage,
    useUndo,
    useUpdateMyPresence,

    // These are just aliases. The passed-in key will define their return values.
    useList: useLegacyKey,
    useMap: useLegacyKey,
    useObject: useLegacyKey,

    // You normally don't need to directly interact with the RoomContext, but
    // it can be necessary if you're building an advanced app where you need to
    // set up a context bridge between two React renderers.
    RoomContext,
  };
}
