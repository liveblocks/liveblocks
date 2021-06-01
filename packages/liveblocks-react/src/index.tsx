import {
  Client,
  RecordData,
  Others,
  Presence,
  Record,
  InitialStorageFactory,
  List,
  Room,
  LiveStorageState,
} from "@liveblocks/client";
import * as React from "react";

type LiveblocksProviderProps = {
  children: React.ReactNode;
  client: Client;
};

const ClientContext = React.createContext<Client | null>(null);
const RoomContext = React.createContext<Room | null>(null);

/**
 * Makes the Liveblocks client available in the component hierarchy below.
 */
export function LiveblocksProvider(props: LiveblocksProviderProps) {
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  );
}

/**
 * Returns the client of the nearest LiveblocksProvider above in the react component tree
 */
function useClient(): Client {
  const client = React.useContext(ClientContext);
  if (client == null) {
    throw new Error("LiveblocksProvider is missing from the react tree");
  }

  return client;
}

type RoomProviderProps = {
  /**
   * The id of the room you want to connect to
   */
  id: string;
  /**
   * A callback that let you initialize the default presence when entering the room.
   * If ommited, the default presence will be an empty object
   */
  defaultPresence?: () => Presence;

  children: React.ReactNode;
};

/**
 * Makes a Room available in the component hierarchy below.
 * When this component is unmounted, the current user leave the room.
 * That means that you can't have 2 RoomProvider with the same room id in your react tree.
 */
export function RoomProvider({
  id,
  children,
  defaultPresence,
}: RoomProviderProps) {
  const client = useClient();

  React.useEffect(() => {
    return () => {
      client.leave(id);
    };
  }, [client, id]);

  const room =
    client.getRoom(id) ||
    client.enter(id, defaultPresence ? defaultPresence() : undefined);

  return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}

/**
 * Returns the room of the nearest RoomProvider above in the react component tree
 */
function useRoom() {
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
 * ### Example
 * ``` typescript
 * import { useMyPresence } from "@liveblocks/react";
 *
 * const [myPresence, updateMyPresence] = useMyPresence();
 * updateMyPresence({ x: 0 });
 * updateMyPresence({ y: 0 });
 *
 * // At the next render, "myPresence" will be equal to "{ x: 0, y: 0 }"
 * ```
 */
export function useMyPresence<T extends Presence>(): [
  T,
  (overrides: Partial<T>) => void
] {
  const room = useRoom();
  const presence = room.getPresence<T>();
  const [, update] = React.useState(0);

  React.useEffect(() => {
    function onMyPresenceChange() {
      update((x) => x + 1);
    }

    room.subscribe("my-presence", onMyPresenceChange);

    return () => {
      room.unsubscribe("my-presence", onMyPresenceChange);
    };
  }, [room]);

  const setPresence = React.useCallback(
    (overrides: Partial<T>) => room.updatePresence(overrides),
    [room]
  );

  return [presence, setPresence];
}

/**
 * useUpdateMyPresence is similar to useMyPresence but it only returns the function to update the current user presence.
 * If you don't use the current user presence in your component, but you need to update it (e.g. live cursor), it's better to use useUpdateMyPresence to avoid unnecessary renders.
 *
 * ### Example
 * ``` typescript
 * import { useUpdateMyPresence } from "@liveblocks/react";
 *
 * const updateMyPresence = useUpdateMyPresence();
 * updateMyPresence({ x: 0 });
 * updateMyPresence({ y: 0 });
 *
 * // At the next render, the presence of the current user will be equal to "{ x: 0, y: 0 }"
 * ```
 */
export function useUpdateMyPresence<T extends Presence>(): (
  overrides: Partial<T>
) => void {
  const room = useRoom();

  return React.useCallback(
    (overrides: Partial<T>) => {
      room.updatePresence(overrides);
    },
    [room]
  );
}

/**
 * Returns an object that lets you get information about all the the users currently connected in the room.
 *
 * ### Example
 * ``` typescript
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
 * ```
 */
export function useOthers<T extends Presence>(): Others<T> {
  const room = useRoom();

  const [, update] = React.useState(0);

  React.useEffect(() => {
    function onOthersChange() {
      update((x) => x + 1);
    }

    room.subscribe("others", onOthersChange);

    return () => {
      room.subscribe("others", onOthersChange);
    };
  }, [room]);

  return room.getOthers();
}

/**
 * Returns a callback that lets you broadcast custom events to other users in the room
 *
 * ### Example
 * ``` typescript
 * import { useBroadcastEvent } from "@liveblocks/react";
 *
 * const broadcast = useBroadcastEvent();
 *
 * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
 * ```
 */
export function useBroadcastEvent() {
  const room = useRoom();

  return React.useCallback(
    (event: any) => {
      room.broadcastEvent(event);
    },
    [room]
  );
}

/**
 * useErrorListener is a react hook that lets you react to potential room connection errors.
 *
 * ### Example
 * ``` typescript
 * import { useErrorListener } from "@liveblocks/react";
 *
 * useErrorListener(er => {
 *   console.error(er);
 * })
 * ```
 */
export function useErrorListener(callback: (er: Error) => void) {
  const room = useRoom();
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  });

  React.useEffect(() => {
    const listener = (e: Error) => savedCallback.current(e);

    room.subscribe("error", listener);

    return () => {
      room.unsubscribe("error", listener);
    };
  }, [room]);
}

/**
 * useEventListener is a react hook that lets you react to event broadcasted by other users in the room.
 *
 * ### Example
 * ``` typescript
 * import { useEventListener } from "@liveblocks/react";
 *
 * useEventListener(({ connectionId, event }) => {
 *   if (event.type === "CUSTOM_EVENT") {
 *     // Do something
 *   }
 * });
 * ```
 */
export function useEventListener<TEvent>(
  callback: ({
    connectionId,
    event,
  }: {
    connectionId: number;
    event: TEvent;
  }) => void
) {
  const room = useRoom();
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  });

  React.useEffect(() => {
    const listener = (e: { connectionId: number; event: TEvent }) =>
      savedCallback.current(e);

    room.subscribe("event", listener);

    return () => {
      room.unsubscribe("event", listener);
    };
  }, [room]);
}

type StorageActions = {
  createRecord: Room["createRecord"];
  updateRecord: Room["updateRecord"];

  createList: Room["createList"];
  moveItem: Room["moveItem"];
  deleteItem: Room["deleteItem"];
  deleteItemById: Room["deleteItemById"];
  pushItem: Room["pushItem"];
};

export function useStorage<TRoot extends RecordData>(
  initialStorage: InitialStorageFactory<TRoot>
): [root: Record<TRoot> | null, actions: StorageActions] {
  const room = useRoom();
  const storage = room.getStorage();
  const [, update] = React.useState(0);

  React.useEffect(() => {
    function onStorageChange() {
      update((x) => x + 1);
    }

    room.fetchStorage(initialStorage);
    room.subscribe("storage", onStorageChange);

    return () => {
      room.unsubscribe("storage", onStorageChange);
    };
  }, [room]);

  const root =
    storage.state === LiveStorageState.Loaded
      ? (storage.root as Record<TRoot>)
      : null;

  const actions = useStorageActions();
  return [root, actions];
}

export function useStorageActions(): StorageActions {
  const room = useRoom();
  return React.useMemo(() => {
    function createRecord<T extends RecordData>(data: T) {
      return room.createRecord<T>(data);
    }

    function updateRecord<T extends RecordData>(
      record: Record<T>,
      overrides: Partial<T>
    ) {
      return room.updateRecord<T>(record, overrides);
    }

    function createList<T extends RecordData>(): List<Record<T>> {
      return room.createList<T>();
    }

    function moveItem<T extends RecordData>(
      list: List<Record<T>>,
      index: number,
      targetIndex: number
    ) {
      return room.moveItem<T>(list, index, targetIndex);
    }

    function deleteItem<T extends RecordData>(
      list: List<Record<T>>,
      index: number
    ) {
      return room.deleteItem<T>(list, index);
    }

    function deleteItemById<T extends RecordData>(
      list: List<Record<T>>,
      itemId: string
    ) {
      return room.deleteItemById<T>(list, itemId);
    }

    function pushItem<T extends RecordData>(
      list: List<Record<T>>,
      item: Record<T>
    ) {
      return room.pushItem<T>(list, item);
    }

    return {
      createRecord,
      updateRecord,

      createList,
      moveItem,
      deleteItem,
      deleteItemById,
      pushItem,
    };
  }, [room]);
}

export { createClient } from "@liveblocks/client";
export type { Record, Client, List } from "@liveblocks/client";
