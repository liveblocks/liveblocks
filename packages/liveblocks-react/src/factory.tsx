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
  Resolve,
  RoomInitializers,
  ToImmutable,
} from "@liveblocks/client/internal";
import { asArrayWithLegacyMethods } from "@liveblocks/client/internal";
import * as React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

import { useInitial, useRerender } from "./hooks";

/**
 * For any function type, returns a similar function type, but without the
 * first argument.
 */
type OmitFirstArg<F> = F extends (first: any, ...rest: infer A) => infer R
  ? (...args: A) => R
  : never;

const noop = () => {};
const identity: <T>(x: T) => T = (x) => x;

const EMPTY_OTHERS =
  // NOTE: asArrayWithLegacyMethods() wrapping should no longer be necessary in 0.19
  asArrayWithLegacyMethods([]);

function getEmptyOthers() {
  return EMPTY_OTHERS;
}

export type MutationContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = {
  root: LiveObject<TStorage>;
  setMyPresence: (
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void;
};

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
    isEqual?: (prev: T, curr: T) => boolean
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
    isEqual?: (prev: T, curr: T) => boolean
  ): T;

  /**
   * Related to useOthers(), but optimized for selecting only "subsets" of
   * others. This is useful for performance reasons in particular, because
   * selecting only a subset of users also means limiting the number of
   * re-renders that will be triggered.
   *
   * Note that there are two ways to use this hook, and depending on how you
   * call it, the return value will be slightly different.
   *
   * @example
   * const ids = useOtherIds();
   * //    ^^^ number[]
   */
  useOtherIds(): readonly number[]; // TODO: Change to ConnectionID for clarity?

  /**
   * Related to useOthers(), but optimized for selecting only "subsets" of
   * others. This is useful for performance reasons in particular, because
   * selecting only a subset of users also means limiting the number of
   * re-renders that will be triggered.
   *
   * Note that there are two ways to use this hook, and depending on how you
   * call it, the return value will be slightly different.
   *
   * @example
   * const avatars = useOtherIds(user => user.info.avatar);
   * //    ^^^^^^^
   * //    { connectionId: number; data: string }[]
   *
   * The selector function you pass to useOtherIds() is called an "item
   * selector", and operates on a single user at a time. If you provide an
   * (optional) comparison function, it will also work on the _item_ level.
   *
   * For example, to select multiple properties:
   *
   * @example
   * const avatarsAndCursors = useOtherIds(
   *   user => [u.info.avatar, u.presence.cursor],
   *   shallow,  // ❗️
   * );
   */
  useOtherIds<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): readonly { readonly connectionId: number; readonly data: T }[];

  /**
   * Given a connection ID (as obtained by using `useOtherIds()`), you can call
   * this selector deep down in your component stack to only have the component
   * re-render if properties for this particular connection change.
   *
   * @example
   * // Returns full user and re-renders whenever anything on the user changes
   * const secondUser = useOther(2);
   */
  useOther(connectionId: number): User<TPresence, TUserMeta>;

  /**
   * Given a connection ID (as obtained by using `useOtherIds()`), you can call
   * this selector deep down in your component stack to only have the component
   * re-render if properties for this particular connection change.
   *
   * @example
   * // Returns only the selected values re-renders whenever that selection changes)
   * const { x, y } = useOther(2, user => user.presence.cursor);
   */
  useOther<T>(
    connectionId: number,
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
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
    isEqual?: (prev: T, curr: T) => boolean
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

  useMutation<
    F extends (
      context: MutationContext<TPresence, TStorage>,
      ...args: any[]
    ) => any
  >(
    callback: F,
    deps?: unknown[]
  ): OmitFirstArg<F>;

  // prettier-ignore
  suspense: {
    useStorage(): ToImmutable<TStorage>;
    useStorage<T>(selector: (root: ToImmutable<TStorage>) => T, isEqual?: (prev: T, curr: T) => boolean): T;

    useSelf(): User<TPresence, TUserMeta>;
    useSelf<T>(selector: (me: User<TPresence, TUserMeta>) => T, isEqual?: (prev: T, curr: T) => boolean): T;

    useOthers(): Others<TPresence, TUserMeta>;
    useOthers<T>(selector: (others: Others<TPresence, TUserMeta>) => T, isEqual?: (prev: T, curr: T) => boolean): T;

    useOtherIds(): readonly number[]; // TODO: Change to ConnectionID for clarity?
    useOtherIds<T>(itemSelector: (other: User<TPresence, TUserMeta>) => T, isEqual?: (prev: T, curr: T) => boolean): readonly { readonly connectionId: number; readonly data: T }[];

    useOther(connectionId: number): User<TPresence, TUserMeta>;
    useOther<T>(connectionId: number, selector: (other: User<TPresence, TUserMeta>) => T, isEqual?: (prev: T, curr: T) => boolean): T;

    // Legacy hooks
    useList<TKey extends Extract<keyof TStorage, string>>(key: TKey): TStorage[TKey];
    useMap<TKey extends Extract<keyof TStorage, string>>(key: TKey): TStorage[TKey];
    useObject<TKey extends Extract<keyof TStorage, string>>(key: TKey): TStorage[TKey];
  };
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

  function connectionIdSelector(
    others: Others<TPresence, TUserMeta>
  ): number[] {
    return others.map((user) => user.connectionId);
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
    const setPresence = room.updatePresence;

    React.useEffect(() => room.events.me.subscribe(rerender), [room, rerender]);

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

  function useOtherIds(): readonly number[]; // TODO: Change to ConnectionID for clarity?
  function useOtherIds<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): readonly { readonly connectionId: number; readonly data: T }[];
  function useOtherIds<T>(
    itemSelector?: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ):
    | readonly number[]
    | readonly { readonly connectionId: number; readonly data: T }[] {
    // Deliberately bypass React warnings about conditionally calling hooks
    const _useCallback = React.useCallback;
    const _useOthers = useOthers;
    if (itemSelector === undefined) {
      return _useOthers(/* not inlined! */ connectionIdSelector, shallow);
    } else {
      const wrappedSelector = _useCallback(
        (others: Others<TPresence, TUserMeta>) =>
          others.map((other) => ({
            connectionId: other.connectionId,
            data: itemSelector(other),
          })),
        [itemSelector]
      );

      const wrappedIsEqual = _useCallback(
        (
          a: { readonly connectionId: number; readonly data: T }[],
          b: { readonly connectionId: number; readonly data: T }[]
        ): boolean => {
          const eq = isEqual ?? Object.is;
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
        [isEqual]
      );

      return _useOthers(wrappedSelector, wrappedIsEqual);
    }
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
        "You cannot call the Suspense version of this hook on the server side. Make sure to only call them on the client side.\nFor tips for structuring your app, see XXX"
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

  /**
   * Usage:
   *
   *     const fillLayers = useMutation1(({ root }, color: Color) => { ... });
   *     //    ^? (color: Color) => void
   *     const deleteLayers = useMutation1(({ root }) => { ... });
   *     //    ^? () => void
   */
  function useMutation<
    F extends (
      context: MutationContext<TPresence, TStorage>,
      ...args: any[]
    ) => any
  >(callback: F, deps?: unknown[]): OmitFirstArg<F> {
    const room = useRoom();
    const root = useMutableStorageRoot();
    const setMyPresence = room.updatePresence;
    return React.useMemo(
      () => {
        if (root !== null) {
          const mutationCtx: MutationContext<TPresence, TStorage> = {
            root,
            setMyPresence,
          };
          return ((...args) => {
            let rv;
            room.batch(() => {
              rv = callback(mutationCtx, ...args);
            });
            return rv;
          }) as OmitFirstArg<F>;
        } else {
          return ((): void => {
            throw new Error(
              "Mutation cannot be called while Liveblocks Storage has not loaded yet"
            );
          }) as OmitFirstArg<F>;
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      deps !== undefined
        ? [root, room, setMyPresence, ...deps]
        : [root, room, setMyPresence, callback]
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

  function useOtherIdsSuspense(): readonly number[];
  function useOtherIdsSuspense<T>(
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): readonly { readonly connectionId: number; readonly data: T }[];
  function useOtherIdsSuspense<T>(
    itemSelector?: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ):
    | readonly number[]
    | readonly { readonly connectionId: number; readonly data: T }[] {
    useSuspendUntilPresenceLoaded();

    // NOTE: Lots of type forcing here, but only to avoid calling the hooks
    // conditionally
    return useOtherIds(
      itemSelector as (other: User<TPresence, TUserMeta>) => T,
      isEqual as (prev: T, curr: T) => boolean
    ) as
      | readonly number[]
      | readonly { readonly connectionId: number; readonly data: T }[];
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
    useOtherIds,
    useOther,
    useRedo,
    useRoom,

    useSelf,
    useStorageRoot,
    useStorage,
    useUndo,
    useUpdateMyPresence,

    useMutation,

    // These are just aliases. The passed-in key will define their return values.
    useList: useLegacyKey,
    useMap: useLegacyKey,
    useObject: useLegacyKey,

    // You normally don't need to directly interact with the RoomContext, but
    // it can be necessary if you're building an advanced app where you need to
    // set up a context bridge between two React renderers.
    RoomContext,

    suspense: {
      useStorage: useStorageSuspense,
      useSelf: useSelfSuspense,
      useOthers: useOthersSuspense,
      useOtherIds: useOtherIdsSuspense,
      useOther: useOtherSuspense,

      // Legacy hooks
      useList: useLegacyKeySuspense,
      useMap: useLegacyKeySuspense,
      useObject: useLegacyKeySuspense,
    },
  };
}
