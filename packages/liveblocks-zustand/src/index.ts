import { StateCreator, SetState, GetState, StoreApi } from "zustand";
import {
  Client,
  LiveObject,
  User,
  patchLiveObjectKey,
  liveObjectToJson,
  patchImmutableObject,
  Room,
} from "@liveblocks/client";

export interface LiveblocksState<TPresence = any> {
  enter: (room: string) => void;
  leave: (room: string) => void;
  others: Array<User<TPresence>>;
  me: User<TPresence> | null;
  isStorageLoading: boolean;
  history: {
    undo: () => void;
    redo: () => void;
    pause: () => void;
    resume: () => void;
  };
  connection:
    | "closed"
    | "authenticating"
    | "unavailable"
    | "failed"
    | "open"
    | "connecting";
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
    GetState<T>,
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

      set({ isStorageLoading: true });

      room = client.enter(roomId);

      unsubscribeCallbacks.push(
        room.subscribe("others", (others) => {
          set({ others: others.toArray() });
        })
      );

      unsubscribeCallbacks.push(
        room.subscribe("my-presence", () => {
          set({ me: room!.getSelf() });
        })
      );

      unsubscribeCallbacks.push(
        room.subscribe("connection", () => {
          set({ connection: room!.getConnectionState() });
          set({ me: room!.getSelf() });
        })
      );

      room
        .getStorage()
        .then(({ root }) => {
          set(liveObjectToJson(root));
          storageRoot = root;
          unsubscribeCallbacks.push(
            room!.subscribe(
              root,
              (updates) => {
                if (isPatching === false) {
                  set(patchImmutableObject(get(), updates));
                }
              },
              { isDeep: true }
            )
          );
        })
        .finally(() => {
          set({ isStorageLoading: false });
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
    };
  };
};
