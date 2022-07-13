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
import type { Resolve, RoomInitializers } from "@liveblocks/client/internal";
import * as React from "react";

import { useRerender } from "./hooks";

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
function useInitial<T>(value: T): T {
  return React.useRef(value).current;
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
    (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ];

  /**
   * Returns an object that lets you get information about all the the users currently connected in the room.
   *
   * @example
   * const others = useOthers();
   *
   * // Example to map all cursors in JSX
   * {
   *   others.map((user) => {
   *     if (user.presence?.cursor == null) {
   *       return null;
   *     }
   *     return <Cursor key={user.connectionId} cursor={user.presence.cursor} />
   *   })
   * }
   */
  useOthers(): Others<TPresence, TUserMeta>;

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Gets the current user once it is connected to the room.
   *
   * @example
   * const user = useSelf();
   */
  useSelf(): User<TPresence, TUserMeta> | null;

  /**
   * Returns the LiveObject instance that is the root of your entire Liveblocks
   * Storage.
   *
   * @example
   * const root = useStorage();
   */
  useStorage(): LiveObject<TStorage> | null;

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
    overrides: Partial<TPresence>,
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
    (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ] {
    const room = useRoom();
    const presence = room.getPresence();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("my-presence", rerender);
      return () => {
        unsubscribe();
      };
    }, [room, rerender]);

    const setPresence = React.useCallback(
      (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) =>
        room.updatePresence(overrides, options),
      [room]
    );

    return [presence, setPresence];
  }

  function useUpdateMyPresence(): (
    overrides: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => {
        room.updatePresence(overrides, options);
      },
      [room]
    );
  }

  function useOthers(): Others<TPresence, TUserMeta> {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("others", rerender);
      return () => {
        unsubscribe();
      };
    }, [room, rerender]);

    return room.getOthers();
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

    React.useEffect(() => {
      const listener = (e: Error) => savedCallback.current(e);

      const unsubscribe = room.subscribe("error", listener);
      return () => {
        unsubscribe();
      };
    }, [room]);
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

      const unsubscribe = room.subscribe("event", listener);
      return () => {
        unsubscribe();
      };
    }, [room]);
  }

  function useSelf(): User<TPresence, TUserMeta> | null {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribePresence = room.subscribe("my-presence", rerender);
      const unsubscribeConnection = room.subscribe("connection", rerender);

      return () => {
        unsubscribePresence();
        unsubscribeConnection();
      };
    }, [room, rerender]);

    return room.getSelf();
  }

  function useStorage(): LiveObject<TStorage> | null {
    const room = useRoom();
    const [root, setState] = React.useState<LiveObject<TStorage> | null>(null);

    React.useEffect(() => {
      let didCancel = false;

      async function fetchStorage() {
        const storage = await room.getStorage();
        if (!didCancel) {
          setState(storage.root);
        }
      }

      fetchStorage();

      return () => {
        didCancel = true;
      };
    }, [room]);

    return root;
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

  function useBatch(): (callback: () => void) => void {
    return useRoom().batch;
  }

  function useStorageValue<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    const room = useRoom();
    const root = useStorage();
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

  return {
    RoomProvider,
    useBatch,
    useBroadcastEvent,
    useErrorListener,
    useEventListener,
    useHistory,
    useMyPresence,
    useOthers,
    useRedo,
    useRoom,
    useSelf,
    useStorage,
    useUndo,
    useUpdateMyPresence,

    // These are just aliases. The passed-in key will define their return values.
    useList: useStorageValue,
    useMap: useStorageValue,
    useObject: useStorageValue,

    // You normally don't need to directly interact with the RoomContext, but
    // it can be necessary if you're building an advanced app where you need to
    // set up a context bridge between two React renderers.
    RoomContext,
  };
}
