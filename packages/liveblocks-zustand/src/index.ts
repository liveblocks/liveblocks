import { StateCreator, SetState, GetState, StoreApi } from "zustand";
import {
  Client,
  LiveObject,
  User,
  patchLiveObjectKey,
  liveObjectToJson,
  patchImmutableObject,
  liveNodeToJson,
  Room,
} from "@liveblocks/client";
import { StorageUpdate } from "../../liveblocks/lib/cjs/types";

export interface LiveblocksState<TPresence = any> {
  readonly liveblocks: {
    readonly enter: (room: string) => void;
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
}

export type Mapping<T> = Partial<
  {
    [Property in keyof T]: boolean;
  }
>;

export const middleware: <T extends Object, TPresence extends Object = any>(
  config: StateCreator<
    T,
    SetState<T>,
    GetState<T & LiveblocksState>,
    StoreApi<T> & { getRoom: () => Room }
  >,
  options: { client: Client; mapping: Mapping<T>; presenceMapping?: Mapping<T> }
) => StateCreator<
  T & LiveblocksState<TPresence>,
  SetState<T & LiveblocksState<TPresence>>,
  GetState<T & LiveblocksState>,
  StoreApi<T & LiveblocksState>
> = (config, { client, mapping, presenceMapping = {} as Mapping<Object> }) => {
  return (set: any, get, api: any) => {
    const typedSet: (
      callback: (current: LiveblocksState) => LiveblocksState
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

        if (storageRoot) {
          isPatching = true;
          for (const key in mapping) {
            if (oldState[key] !== newState[key]) {
              patchLiveObjectKey(
                storageRoot,
                key,
                oldState[key],
                newState[key]
              );
            }
          }
          for (const key in presenceMapping) {
            if ((oldState as any)[key] !== (newState as any)[key]) {
              room?.updatePresence({ [key]: (newState as any)[key] });
            }
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

    function enter(roomId: string) {
      if (storageRoot) {
        return;
      }

      typedSet((state) => ({
        liveblocks: { ...state.liveblocks, isStorageLoading: true },
      }));

      room = client.enter(roomId);

      const state = get();

      for (const key in presenceMapping) {
        room?.updatePresence({ [key]: (state as any)[key] });
      }

      unsubscribeCallbacks.push(
        room.subscribe("others", (others) => {
          typedSet((state) => ({
            liveblocks: { ...state.liveblocks, others: others.toArray() },
          }));
        })
      );

      unsubscribeCallbacks.push(
        room.subscribe("connection", () => {
          typedSet((state) => ({
            liveblocks: {
              ...state.liveblocks,
              connection: room!.getConnectionState(),
            },
          }));
        })
      );

      room
        .getStorage<any>()
        .then(({ root }) => {
          const updates: any = {};
          for (const key in mapping) {
            updates[key] = liveNodeToJson(root.get(key));
          }
          set(updates);
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
        })
        .finally(() => {
          typedSet((state) => ({
            liveblocks: { ...state.liveblocks, isStorageLoading: false },
          }));
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
        me: null,
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
