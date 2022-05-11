import * as React from "react";
import { useClient } from "./client";
import type {
  BroadcastOptions,
  History,
  Json,
  Lson,
  LsonObject,
  Others,
  Presence,
  Room,
  User,
} from "@liveblocks/client";
import { LiveMap, LiveList, LiveObject } from "@liveblocks/client";
import { deprecateIf } from "@liveblocks/client/internal";
import type { Resolve, RoomInitializers } from "@liveblocks/client/internal";
import useRerender from "./useRerender";

type RoomProviderProps<TStorage> = Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: React.ReactNode;
  } & RoomInitializers<Presence, TStorage>
>;

type UseCrdtResult<T> =
  | { status: "ok"; value: T }
  | { status: "loading" }
  | { status: "notfound" };

export function create() {
  const RoomContext = React.createContext<Room | null>(null);

  /**
   * Makes a Room available in the component hierarchy below.
   * When this component is unmounted, the current user leave the room.
   * That means that you can't have 2 RoomProvider with the same room id in your react tree.
   */
  function RoomProvider<TStorage>(props: RoomProviderProps<TStorage>) {
    const {
      id: roomId,
      initialPresence,
      initialStorage,
      defaultPresence, // Will get removed in 0.18
      defaultStorageRoot, // Will get removed in 0.18
    } = props;

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

    deprecateIf(
      defaultPresence,
      "RoomProvider's `defaultPresence` prop will be removed in @liveblocks/react 0.18. Please use `initialPresence` instead. For more info, see https://bit.ly/3Niy5aP",
      "defaultPresence"
    );
    deprecateIf(
      defaultStorageRoot,
      "RoomProvider's `defaultStorageRoot` prop will be removed in @liveblocks/react 0.18. Please use `initialStorage` instead. For more info, see https://bit.ly/3Niy5aP",
      "defaultStorageRoot"
    );

    const client = useClient();

    const [room, setRoom] = React.useState(() =>
      client.enter(roomId, {
        initialPresence,
        initialStorage,
        defaultPresence, // Will get removed in 0.18
        defaultStorageRoot, // Will get removed in 0.18
        DO_NOT_USE_withoutConnecting: typeof window === "undefined",
      } as any)
    );

    React.useEffect(() => {
      setRoom(
        client.enter(roomId, {
          initialPresence,
          initialStorage,
          defaultPresence, // Will get removed in 0.18
          defaultStorageRoot, // Will get removed in 0.18
          DO_NOT_USE_withoutConnecting: typeof window === "undefined",
        } as any)
      );

      return () => {
        client.leave(roomId);
      };
    }, [client, roomId]);

    return (
      <RoomContext.Provider value={room}>{props.children}</RoomContext.Provider>
    );
  }

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  function useRoom(): Room {
    const room = React.useContext(RoomContext);

    if (room == null) {
      throw new Error("RoomProvider is missing from the react tree");
    }

    return room;
  }

  /**
   * Returns the presence of the current user of the current room, and a function to update it.
   * It is different from the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   *
   * @example
   * import { useMyPresence } from "@liveblocks/react";
   *
   * const [myPresence, updateMyPresence] = useMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, "myPresence" will be equal to "{ x: 0, y: 0 }"
   */
  function useMyPresence<T extends Presence>(): [
    T,
    (overrides: Partial<T>, options?: { addToHistory: boolean }) => void
  ] {
    const room = useRoom();
    const presence = room.getPresence<T>();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("my-presence", rerender);
      return () => {
        unsubscribe();
      };
    }, [room]);

    const setPresence = React.useCallback(
      (overrides: Partial<T>, options?: { addToHistory: boolean }) =>
        room.updatePresence(overrides, options),
      [room]
    );

    return [presence, setPresence];
  }

  /**
   * useUpdateMyPresence is similar to useMyPresence but it only returns the function to update the current user presence.
   * If you don't use the current user presence in your component, but you need to update it (e.g. live cursor), it's better to use useUpdateMyPresence to avoid unnecessary renders.
   *
   * @example
   * import { useUpdateMyPresence } from "@liveblocks/react";
   *
   * const updateMyPresence = useUpdateMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, the presence of the current user will be equal to "{ x: 0, y: 0 }"
   */
  function useUpdateMyPresence<T extends Presence>(): (
    overrides: Partial<T>,
    options?: { addToHistory: boolean }
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (overrides: Partial<T>, options?: { addToHistory: boolean }) => {
        room.updatePresence(overrides, options);
      },
      [room]
    );
  }

  /**
   * Returns an object that lets you get information about all the the users currently connected in the room.
   *
   * @example
   * import { useOthers } from "@liveblocks/react";
   *
   * const others = useOthers();
   *
   * // Example to map all cursors in jsx
   * {
   *   others.map(({ connectionId, presence }) => {
   *     if(presence == null || presence.cursor == null) {
   *       return null;
   *     }
   *     return <Cursor key={connectionId} cursor={presence.cursor} />
   *   })
   * }
   */
  function useOthers<T extends Presence>(): Others<T> {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("others", rerender);
      return () => {
        unsubscribe();
      };
    }, [room]);

    return room.getOthers();
  }

  /**
   * Returns a callback that lets you broadcast custom events to other users in the room
   *
   * @example
   * import { useBroadcastEvent } from "@liveblocks/react";
   *
   * const broadcast = useBroadcastEvent();
   *
   * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
   */
  function useBroadcastEvent(): (
    event: any,
    options?: BroadcastOptions
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (
        event: any,
        options: BroadcastOptions = { shouldQueueEventIfNotReady: false }
      ) => {
        room.broadcastEvent(event, options);
      },
      [room]
    );
  }

  /**
   * useErrorListener is a react hook that lets you react to potential room connection errors.
   *
   * @example
   * import { useErrorListener } from "@liveblocks/react";
   *
   * useErrorListener(er => {
   *   console.error(er);
   * })
   */
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

  /**
   * useEventListener is a react hook that lets you react to event broadcasted by other users in the room.
   *
   * @example
   * import { useEventListener } from "@liveblocks/react";
   *
   * useEventListener(({ connectionId, event }) => {
   *   if (event.type === "CUSTOM_EVENT") {
   *     // Do something
   *   }
   * });
   */
  function useEventListener<TEvent extends Json>(
    callback: ({
      connectionId,
      event,
    }: {
      connectionId: number;
      event: TEvent;
    }) => void
  ): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(() => {
      const listener = (e: { connectionId: number; event: TEvent }) =>
        savedCallback.current(e);

      const unsubscribe = room.subscribe("event", listener);
      return () => {
        unsubscribe();
      };
    }, [room]);
  }

  /**
   * Gets the current user once it is connected to the room.
   *
   * @example
   * import { useSelf } from "@liveblocks/react";
   *
   * const user = useSelf();
   */
  function useSelf<
    TPresence extends Presence = Presence
  >(): User<TPresence> | null {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribePresence = room.subscribe("my-presence", rerender);
      const unsubscribeConnection = room.subscribe("connection", rerender);

      return () => {
        unsubscribePresence();
        unsubscribeConnection();
      };
    }, [room]);

    return room.getSelf<TPresence>();
  }

  function useStorage<TStorage extends Record<string, any>>(): [
    root: LiveObject<TStorage> | null
  ] {
    const room = useRoom();
    const [root, setState] = React.useState<LiveObject<TStorage> | null>(null);

    React.useEffect(() => {
      let didCancel = false;

      async function fetchStorage() {
        const storage = await room.getStorage<TStorage>();
        if (!didCancel) {
          setState(storage.root);
        }
      }

      fetchStorage();

      return () => {
        didCancel = true;
      };
    }, [room]);

    return [root];
  }

  /**
   * Returns the LiveMap associated with the provided key. If the LiveMap does not exist, a new empty LiveMap will be created.
   * The hook triggers a re-render if the LiveMap is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveMap
   * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
   *
   * @example
   * const shapesById = useMap<string, Shape>("shapes");
   */
  function useMap<TKey extends string, TValue extends Lson>(
    key: string
  ): LiveMap<TKey, TValue> | null;
  /**
   * @deprecated We no longer recommend initializing the
   * entries from the useMap() hook. For details, see https://bit.ly/3Niy5aP.
   */
  function useMap<TKey extends string, TValue extends Lson>(
    key: string,
    entries: readonly (readonly [TKey, TValue])[] | null
  ): LiveMap<TKey, TValue> | null;
  function useMap<TKey extends string, TValue extends Lson>(
    key: string,
    entries?: readonly (readonly [TKey, TValue])[] | null | undefined
  ): LiveMap<TKey, TValue> | null {
    deprecateIf(
      entries,
      `Support for initializing entries in useMap() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveMap(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue(key, new LiveMap(entries));
    //                                 ^^^^^^^^^^^^^^^^^^^^
    //                                 NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      deprecateIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useMap() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveMap } from "@liveblocks/client";

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveMap(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

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
  function useList<TValue extends Lson>(key: string): LiveList<TValue> | null;
  /**
   * @deprecated We no longer recommend initializing the
   * items from the useList() hook. For details, see https://bit.ly/3Niy5aP.
   */
  function useList<TValue extends Lson>(
    key: string,
    items: TValue[]
  ): LiveList<TValue> | null;
  function useList<TValue extends Lson>(
    key: string,
    items?: TValue[] | undefined
  ): LiveList<TValue> | null {
    deprecateIf(
      items,
      `Support for initializing items in useList() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    import { LiveList } from "@liveblocks/client";

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveList(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue<LiveList<TValue>>(key, new LiveList(items));
    //                                                   ^^^^^^^^^^^^^^^^^^^
    //                                                   NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      deprecateIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useList() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveList } from "@liveblocks/client";

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveList(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

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
  function useObject<TData extends LsonObject>(
    key: string
  ): LiveObject<TData> | null;
  /**
   * @deprecated We no longer recommend initializing the fields from the
   * useObject() hook. For details, see https://bit.ly/3Niy5aP.
   */
  function useObject<TData extends LsonObject>(
    key: string,
    initialData: TData
  ): LiveObject<TData> | null;
  function useObject<TData extends LsonObject>(
    key: string,
    initialData?: TData
  ): LiveObject<TData> | null {
    deprecateIf(
      initialData,
      `Support for initializing data in useObject() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    import { LiveObject } from "@liveblocks/client";

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveObject(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue(key, new LiveObject(initialData));
    //                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                 NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      deprecateIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useObject() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveObject } from "@liveblocks/client";

    const initialStorage = () => {
      ${JSON.stringify(key)}: new LiveObject(...),
      ...
    };

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

  /**
   * Returns a function that undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  function useUndo(): () => void {
    return useHistory().undo;
  }

  /**
   * Returns a function that redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  function useRedo(): () => void {
    return useHistory().redo;
  }

  /**
   * Returns a function that batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the modifications are merged in a single history item (undo/redo).
   * All the subscribers are called only after the batch is over.
   */
  function useBatch(): (callback: () => void) => void {
    return useRoom().batch;
  }

  /**
   * Returns the room.history
   */
  function useHistory(): History {
    return useRoom().history;
  }

  function useStorageValue<T>(key: string, initialCrdt: T): UseCrdtResult<T> {
    const room = useRoom();
    const [root] = useStorage();
    const rerender = useRerender();

    React.useEffect(() => {
      if (root == null) {
        return;
      }

      let crdt: null | T = root.get(key);

      if (crdt == null) {
        crdt = initialCrdt;
        root.set(key, crdt);
      }

      function onRootChange() {
        const newCrdt = root!.get(key);
        if (newCrdt !== crdt) {
          unsubscribeCrdt();
          crdt = newCrdt;
          unsubscribeCrdt = room.subscribe(
            crdt as any /* AbstractCrdt */,
            rerender
          );
          rerender();
        }
      }

      let unsubscribeCrdt = room.subscribe(
        crdt as any /* AbstractCrdt */,
        rerender
      );
      const unsubscribeRoot = room.subscribe(
        root as any /* AbstractCrdt */,
        onRootChange
      );

      rerender();

      return () => {
        unsubscribeRoot();
        unsubscribeCrdt();
      };
    }, [root, room]);

    if (root == null) {
      return { status: "loading" };
    } else {
      const value = root.get(key);
      if (value == null) {
        return { status: "notfound" };
      } else {
        return { status: "ok", value };
      }
    }
  }

  return {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useBroadcastEvent,
    useErrorListener,
    useEventListener,
    useSelf,
    useStorage,
    useMap,
    useList,
    useObject,
    useUndo,
    useRedo,
    useBatch,
    useHistory,
  };
}
