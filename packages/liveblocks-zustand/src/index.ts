import { StateCreator, SetState, GetState, StoreApi } from "zustand";
import {
  Client,
  LiveObject,
  User,
  patchLiveObjectKey,
  patchImmutableObject,
  liveNodeToJson,
  Room,
} from "@liveblocks/client";
import { StorageUpdate } from "../../liveblocks/lib/cjs/types";

export type LiveblocksState<TState, TPresence = any> = TState & {
  readonly liveblocks: {
    readonly enter: (room: string, initialState: Partial<TState>) => void;
    readonly leave: (room: string) => void;
    readonly others: Array<User<TPresence>>;
    readonly isStorageLoading: boolean;
    readonly history: {
      undo: () => void;
      redo: () => void;
      pause: () => void;
      resume: () => void;
    };
    readonly connection:
      | "closed"
      | "authenticating"
      | "unavailable"
      | "failed"
      | "open"
      | "connecting";
  };
};

export type Mapping<T> = Partial<
  {
    [Property in keyof T]: boolean;
  }
>;

export const middleware: <T extends Object, TPresence extends Object = any>(
  config: StateCreator<
    T,
    SetState<T>,
    GetState<LiveblocksState<T>>,
    StoreApi<T> & { getRoom: () => Room }
  >,
  options: { client: Client; mapping: Mapping<T>; presenceMapping?: Mapping<T> }
) => StateCreator<
  LiveblocksState<T, TPresence>,
  SetState<LiveblocksState<T, TPresence>>,
  GetState<LiveblocksState<T, TPresence>>,
  StoreApi<LiveblocksState<T, TPresence>>
> = (config, { client, mapping, presenceMapping = {} }) => {
  return (set: any, get, api: any) => {
    const typedSet: (
      callbackOrPartial: (
        current: LiveblocksState<any>
      ) => LiveblocksState<any> | Partial<any>
    ) => void = set;

    let room: Room | null = null;
    let isPatching: boolean = false;
    let storageRoot: LiveObject<any> | null = null;
    let unsubscribeCallbacks: Array<() => void> = [];

    const store = config(
      (args) => {
        const oldState = get();
        set(args);
        const newState = get();

        if (room) {
          isPatching = true;
          updatePresence(room, oldState, newState, presenceMapping as any);

          if (storageRoot) {
            patchLiveblocksStorage(
              storageRoot,
              oldState,
              newState,
              mapping as any
            );
          }
          isPatching = false;
        }
      },
      get,
      {
        ...api,
        getRoom: () => room!,
      }
    );

    function enter(roomId: string, initialState: any) {
      if (storageRoot) {
        return;
      }

      // set isLoading storage to true
      updateZustandLiveblocksState(set, { isStorageLoading: true });

      room = client.enter(roomId);

      const state = get();

      broadcastInitialPresence(room, state, presenceMapping as any);

      unsubscribeCallbacks.push(
        room.subscribe("others", (others) => {
          updateZustandLiveblocksState(set, { others: others.toArray() });
        })
      );

      unsubscribeCallbacks.push(
        room.subscribe("connection", () => {
          updateZustandLiveblocksState(set, {
            connection: room!.getConnectionState(),
          });
        })
      );

      room.getStorage<any>().then(({ root }) => {
        const updates: any = {};

        for (const key in mapping) {
          const liveblocksStatePart = root.get(key);

          if (liveblocksStatePart == null) {
            updates[key] = initialState[key];
            patchLiveObjectKey(root, key, undefined, initialState[key]);
          } else {
            updates[key] = liveNodeToJson(liveblocksStatePart);
          }
        }

        typedSet(updates);

        storageRoot = root;
        unsubscribeCallbacks.push(
          room!.subscribe(
            root,
            (updates) => {
              if (isPatching === false) {
                set(patchState(get(), updates, mapping as any));
              }
            },
            { isDeep: true }
          )
        );

        // set isLoading storage to false once storage is loaded
        updateZustandLiveblocksState(set, { isStorageLoading: false });
      });
    }

    function leave(roomId: string) {
      for (const unsubscribe of unsubscribeCallbacks) {
        unsubscribe();
      }
      storageRoot = null;
      room = null;
      isPatching = false;
      unsubscribeCallbacks = [];
      client.leave(roomId);
    }

    return {
      ...store,
      liveblocks: {
        enter,
        leave,
        others: [],
        connection: "closed",
        isStorageLoading: false,
        history: {
          undo: () => room?.history.undo(),
          redo: () => room?.history.redo(),
          pause: () => room?.history.pause(),
          resume: () => room?.history.resume(),
        },
      },
    };
  };
};

function patchState<T>(
  state: T,
  updates: StorageUpdate[],
  mapping: Mapping<T>
) {
  const partialState: Partial<T> = {};

  for (const key in mapping) {
    partialState[key] = state[key];
  }

  const patched = patchImmutableObject(partialState, updates);

  const result: Partial<T> = {};

  for (const key in mapping) {
    result[key] = patched[key];
  }

  return result;
}

function updateZustandLiveblocksState<T>(
  set: (
    callbackOrPartial: (
      current: LiveblocksState<T>
    ) => LiveblocksState<T> | Partial<any>
  ) => void,
  partial: Partial<LiveblocksState<T>["liveblocks"]>
) {
  set((state) => ({ liveblocks: { ...state.liveblocks, ...partial } }));
}

function broadcastInitialPresence<T>(
  room: Room,
  state: T,
  mapping: Mapping<T>
) {
  for (const key in mapping) {
    room?.updatePresence({ [key]: (state as any)[key] });
  }
}

function updatePresence<T>(
  room: Room,
  oldState: T,
  newState: T,
  presenceMapping: Mapping<T>
) {
  for (const key in presenceMapping) {
    if (oldState[key] !== newState[key]) {
      room.updatePresence({ [key]: newState[key] });
    }
  }
}

function patchLiveblocksStorage<T>(
  root: LiveObject,
  oldState: T,
  newState: T,
  mapping: Mapping<T>
) {
  for (const key in mapping) {
    if (oldState[key] !== newState[key]) {
      patchLiveObjectKey(root, key, oldState[key], newState[key]);
    }
  }
}
