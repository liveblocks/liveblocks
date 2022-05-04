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
import type { Resolve, RoomInitializers } from "@liveblocks/client/internal";
import useRerender from "./useRerender";

const RoomContext = React.createContext<Room | null>(null);

type RoomProviderProps<TStorage> = Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: React.ReactNode;
  } & RoomInitializers<Presence, TStorage>
>;

/**
 * Makes a Room available in the component hierarchy below.
 * When this component is unmounted, the current user leave the room.
 * That means that you can't have 2 RoomProvider with the same room id in your react tree.
 */
export function RoomProvider<TStorage>(props: RoomProviderProps<TStorage>) {
  const { id: roomId, defaultPresence, defaultStorageRoot } = props;
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

  const client = useClient();

  const [room, setRoom] = React.useState(() =>
    client.enter(roomId, {
      defaultPresence: defaultPresence ? defaultPresence() : undefined,
      defaultStorageRoot,
      DO_NOT_USE_withoutConnecting: typeof window === "undefined",
    } as any)
  );

  React.useEffect(() => {
    setRoom(
      client.enter(roomId, {
        defaultPresence: defaultPresence ? defaultPresence() : undefined,
        defaultStorageRoot,
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
export function useRoom(): Room {
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
export function useMyPresence<T extends Presence>(): [
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
export function useUpdateMyPresence<T extends Presence>(): (
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
export function useOthers<T extends Presence>(): Others<T> {
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
export function useBroadcastEvent(): (
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
export function useErrorListener(callback: (err: Error) => void): void {
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
export function useEventListener<TEvent extends Json>(
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
export function useSelf<
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

export function useStorage<TStorage extends Record<string, any>>(): [
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
 * @param entries Optional entries that are used to create the LiveMap for the first time
 * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
 *
 * @example
 * const emptyMap = useMap("mapA");
 * const mapWithItems = useMap("mapB", [["keyA", "valueA"], ["keyB", "valueB"]]);
 */
export function useMap<TKey extends string, TValue extends Lson>(
  key: string,
  entries?: readonly (readonly [TKey, TValue])[] | null | undefined
): LiveMap<TKey, TValue> | null {
  return useCrdt(key, new LiveMap(entries));
}

/**
 * Returns the LiveList associated with the provided key. If the LiveList does not exist, a new LiveList will be created.
 * The hook triggers a re-render if the LiveList is updated, however it does not triggers a re-render if a nested CRDT is updated.
 *
 * @param key The storage key associated with the LiveList
 * @param items Optional items that are used to create the LiveList for the first time
 * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
 *
 * @example
 * const emptyList = useList("listA");
 * const listWithItems = useList("listB", ["a", "b", "c"]);
 */
export function useList<TValue extends Lson>(
  key: string,
  items?: TValue[] | undefined
): LiveList<TValue> | null {
  return useCrdt<LiveList<TValue>>(key, new LiveList(items));
}

/**
 * Returns the LiveObject associated with the provided key. If the LiveObject does not exist, it will be created with the initialData parameter.
 * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
 *
 * @param key The storage key associated with the LiveObject
 * @param initialData Optional data that is used to create the LiveObject for the first time
 * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
 *
 * @example
 * const object = useObject("obj", {
 *   company: "Liveblocks",
 *   website: "https://liveblocks.io"
 * });
 */
export function useObject<TData extends LsonObject>(
  key: string,
  initialData?: TData
): LiveObject<TData> | null {
  return useCrdt(key, new LiveObject(initialData));
}

/**
 * Returns a function that undoes the last operation executed by the current client.
 * It does not impact operations made by other clients.
 */
export function useUndo(): () => void {
  return useRoom().history.undo;
}

/**
 * Returns a function that redoes the last operation executed by the current client.
 * It does not impact operations made by other clients.
 */
export function useRedo(): () => void {
  return useRoom().history.redo;
}

/**
 * Returns a function that batches modifications made during the given function.
 * All the modifications are sent to other clients in a single message.
 * All the modifications are merged in a single history item (undo/redo).
 * All the subscribers are called only after the batch is over.
 */
export function useBatch(): (callback: () => void) => void {
  return useRoom().batch;
}

/**
 * Returns the room.history
 */
export function useHistory(): History {
  return useRoom().history;
}

function useCrdt<T>(key: string, initialCrdt: T): T | null {
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

  return root?.get(key) ?? null;
}
