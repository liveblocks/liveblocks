import * as React from "react";
import { useClient } from "./client";
import {
  BroadcastOptions,
  History,
  Json,
  JsonObject,
  LiveList,
  LiveMap,
  LiveObject,
  Lson,
  LsonObject,
  Others,
  Room,
  User,
} from "@liveblocks/client";
import useRerender from "./useRerender";

type LiveStructure = Exclude<Lson, Json>;

export function createHooks<
  TPresence extends JsonObject,
  TStorageRoot extends LsonObject
>() {

const RoomContext = React.createContext<Room<TPresence, TStorageRoot> | null>(
  null
);

type RoomProviderProps<
  TPresence extends JsonObject,
  TStorageRoot extends LsonObject
> = {
  /**
   * The id of the room you want to connect to
   */
  id: string;
  /**
   * A callback that let you initialize the default presence when entering the room.
   * If ommited, the default presence will be an empty object
   */
  defaultPresence?: () => TPresence;

  defaultStorageRoot?: TStorageRoot;

  children: React.ReactNode;
};

/**
 * Makes a Room available in the component hierarchy below.
 * When this component is unmounted, the current user leave the room.
 * That means that you can't have 2 RoomProvider with the same room id in your react tree.
 */
function RoomProvider({
  id,
  children,
  defaultPresence,
  defaultStorageRoot,
}: RoomProviderProps<TPresence, TStorageRoot>) {
  if (process.env.NODE_ENV !== "production") {
    if (id == null) {
      throw new Error(
        "RoomProvider id property is required. For more information: https://liveblocks.io/docs/errors/liveblocks-react/RoomProvider-id-property-is-required"
      );
    }
    if (typeof id !== "string") {
      throw new Error("RoomProvider id property should be a string.");
    }
  }

  const client = useClient();

  const [room, setRoom] = React.useState<Room<TPresence, TStorageRoot>>(() =>
    client.enter(id, {
      defaultPresence: defaultPresence ? defaultPresence() : undefined,
      defaultStorageRoot,
      DO_NOT_USE_withoutConnecting: typeof window === "undefined",
    } as any)
  );

  React.useEffect(() => {
    setRoom(
      client.enter(id, {
        defaultPresence: defaultPresence ? defaultPresence() : undefined,
        defaultStorageRoot,
        DO_NOT_USE_withoutConnecting: typeof window === "undefined",
      } as any)
    );

    return () => {
      client.leave(id);
    };
  }, [client, id]);

  return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}

/**
 * Returns the Room of the nearest RoomProvider above in the React component
 * tree.
 */
function useRoom(): Room<TPresence, TStorageRoot> {
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
  }, [room]);

  const setPresence = React.useCallback(
    (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) =>
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
function useOthers(): Others<TPresence> {
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
function useSelf(): User<TPresence> | null {
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

  return room.getSelf();
}

function useStorage(): [root: LiveObject<TStorageRoot> | null] {
  const room = useRoom();
  const [root, setState] = React.useState<LiveObject<TStorageRoot> | null>(
    null
  );

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
function useMap<TKey extends string, TValue extends Lson>(
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
function useList<TValue extends Lson>(
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
function useObject<TData extends LsonObject>(
  key: string,
  initialData?: TData
): LiveObject<TData> | null {
  return useCrdt(key, new LiveObject(initialData));
}

/**
 * Returns a function that undoes the last operation executed by the current client.
 * It does not impact operations made by other clients.
 */
function useUndo(): () => void {
  return useRoom().history.undo;
}

/**
 * Returns a function that redoes the last operation executed by the current client.
 * It does not impact operations made by other clients.
 */
function useRedo(): () => void {
  return useRoom().history.redo;
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

function useCrdt<T extends LiveStructure>(
  key: string,
  //   ^^^^^^ FIXME... can now be `keyof TStorageRoot` I think!
  initialCrdt: T
): T | null {
  const room = useRoom();
  const [root] = useStorage();
  const rerender = useRerender();

  React.useEffect(() => {
    if (root == null) {
      return;
    }

    let crdt: T | null = root.get(key) as T | null;
    //                                 ^^^^^^^^^^^ FIXME

    if (crdt == null) {
      crdt = initialCrdt as T;
      //                 ^^^^ FIXME
      root.set(key, crdt as any);
      //                 ^^^^^^ FIXME
    }

    function onRootChange() {
      const newCrdt = root!.get(key) as LiveStructure;
      //                             ^^^^^^^^^^^^^^^^ FIXME
      if (newCrdt !== crdt) {
        unsubscribeCrdt();
        crdt = newCrdt as T;
        //             ^^^^ FIXME
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

  return (root?.get(key) as T | undefined) ?? null;
  //                     ^^^^^^^^^^^^^^^^ FIXME
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
