import { StateCreator, SetState, GetState, StoreApi } from "zustand";
import {
  Client,
  LiveObject,
  User,
  Room,
  StorageUpdate,
  internals,
} from "@liveblocks/client";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
  missingMapping,
} from "./errors";

// @liveblocks/client export internals API to be used only by our packages.
// Internals APIs are removed from public d.ts so we patch them manually here to consume them.
// They are patched inline because @rollup/plugin-typescript does not respect tsconfig typeRoots
// @internal is necessary to remove it from public d.ts
/**
 * @internal
 */
declare module "@liveblocks/client" {
  const internals: {
    liveObjectToJson(liveObject: LiveObject<any>): void;
    patchImmutableObject<T>(state: T, updates: StorageUpdate[]): T;
    patchLiveObjectKey<T>(
      liveObject: LiveObject<T>,
      key: keyof T,
      prev: any,
      next: any
    ): void;
    liveNodeToJson(value: any): any;
  };
}

const { patchLiveObjectKey, patchImmutableObject, liveNodeToJson } = internals;

export type LiveblocksState<TState, TPresence = any> = TState & {
  /**
   * Liveblocks extra state attached by the middleware
   */
  readonly liveblocks: {
    /**
     * Enters a room and starts sync it with zustand state
     * @param roomId The id of the room
     * @param initialState The initial state of the room storage. If a key does not exist if your room storage root, initialState[key] will be used.
     */
    readonly enterRoom: (roomId: string, initialState: Partial<TState>) => void;
    /**
     * Leaves a room and stops sync it with zustand state.
     * @param roomId The id of the room
     */
    readonly leaveRoom: (roomId: string) => void;
    /**
     * The room currently synced to your zustand state.
     */
    readonly room: Room | null;
    /**
     * Other users in the room. Empty no room is currently synced
     */
    readonly others: Array<User<TPresence>>;
    /**
     * Whether or not the room storage is currently loading
     */
    readonly isStorageLoading: boolean;
    /**
     * Connection state of the room
     */
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

type Options<T> = {
  /**
   * Liveblocks client created by @liveblocks/client createClient
   */
  client: Client;
  /**
   * Mapping used to synchronize a part of your zustand state with one Liveblocks Room storage.
   */
  storageMapping?: Mapping<T>;
  /**
   * Mapping used to synchronize a part of your zustand state with one Liveblocks Room presence.
   */
  presenceMapping?: Mapping<T>;
};

export function middleware<T extends Object, TPresence extends Object = any>(
  config: StateCreator<
    T,
    SetState<T>,
    GetState<LiveblocksState<T>>,
    StoreApi<T>
  >,
  options: Options<T>
): StateCreator<
  LiveblocksState<T, TPresence>,
  SetState<LiveblocksState<T, TPresence>>,
  GetState<LiveblocksState<T, TPresence>>,
  StoreApi<LiveblocksState<T, TPresence>>
> {
  if (process.env.NODE_ENV !== "production" && options.client == null) {
    throw missingClient();
  }
  const client = options.client;
  const storageMapping = validateMapping(
    options.storageMapping || {},
    "storageMapping"
  );

  const presenceMapping = validateMapping(
    options.presenceMapping || {},
    "presenceMapping"
  );
  if (process.env.NODE_ENV !== "production") {
    validateNoDuplicateKeys(storageMapping, presenceMapping);
  }

  return (set: any, get, api: any) => {
    const typedSet: (
      callbackOrPartial: (
        current: LiveblocksState<T>
      ) => LiveblocksState<T> | Partial<T>
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
          updatePresence(room!, oldState, newState, presenceMapping as any);

          room.batch(() => {
            if (storageRoot) {
              patchLiveblocksStorage(
                storageRoot,
                oldState,
                newState,
                storageMapping as any
              );
            }
          });

          isPatching = false;
        }
      },
      get,
      api
    );

    function enterRoom(roomId: string, initialState: any) {
      if (storageRoot) {
        return;
      }

      room = client.enter(roomId);

      updateZustandLiveblocksState(set, { isStorageLoading: true, room });

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

      unsubscribeCallbacks.push(
        room.subscribe("my-presence", () => {
          if (isPatching === false) {
            set(
              patchPresenceState(room!.getPresence(), presenceMapping as any)
            );
          }
        })
      );

      room.getStorage<any>().then(({ root }) => {
        const updates: any = {};

        room!.batch(() => {
          for (const key in storageMapping) {
            const liveblocksStatePart = root.get(key);

            if (liveblocksStatePart == null) {
              updates[key] = initialState[key];
              patchLiveObjectKey(root, key, undefined, initialState[key]);
            } else {
              updates[key] = liveNodeToJson(liveblocksStatePart);
            }
          }
        });

        typedSet(updates);

        storageRoot = root;
        unsubscribeCallbacks.push(
          room!.subscribe(
            root,
            (updates) => {
              if (isPatching === false) {
                set(patchState(get(), updates, storageMapping as any));
              }
            },
            { isDeep: true }
          )
        );

        // set isLoading storage to false once storage is loaded
        updateZustandLiveblocksState(set, { isStorageLoading: false });
      });
    }

    function leaveRoom(roomId: string) {
      for (const unsubscribe of unsubscribeCallbacks) {
        unsubscribe();
      }
      storageRoot = null;
      room = null;
      isPatching = false;
      unsubscribeCallbacks = [];
      client.leave(roomId);
      updateZustandLiveblocksState(set, {
        others: [],
        connection: "closed",
        isStorageLoading: false,
        room: null,
      });
    }

    return {
      ...store,
      liveblocks: {
        enterRoom,
        leaveRoom,
        room: null,
        others: [],
        connection: "closed",
        isStorageLoading: false,
      },
    };
  };
}

function patchState<T>(
  state: T,
  updates: any[], // StorageUpdate
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

function patchPresenceState<T>(presence: any, mapping: Mapping<T>) {
  const partialState: Partial<T> = {};

  for (const key in mapping) {
    partialState[key] = presence[key];
  }

  return partialState;
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
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed("value");
    }

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
    if (
      process.env.NODE_ENV !== "production" &&
      typeof newState[key] === "function"
    ) {
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      patchLiveObjectKey(root, key, oldState[key], newState[key]);
    }
  }
}

function isObject(value: any): value is object {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function validateNoDuplicateKeys<T>(
  storageMapping: Mapping<T>,
  presenceMapping: Mapping<T>
) {
  for (const key in storageMapping) {
    if (presenceMapping[key] !== undefined) {
      throw mappingShouldNotHaveTheSameKeys(key);
    }
  }
}

/**
 * Remove false keys from mapping and generate to a new object to avoid potential mutation from outside the middleware
 */
function validateMapping<T>(
  mapping: Mapping<T>,
  mappingType: "storageMapping" | "presenceMapping"
): Mapping<T> {
  if (process.env.NODE_ENV !== "production") {
    if (mapping == null) {
      throw missingMapping(mappingType);
    }
    if (!isObject(mapping)) {
      throw mappingShouldBeAnObject(mappingType);
    }
  }

  const result: Mapping<T> = {};
  for (const key in mapping) {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof mapping[key] !== "boolean"
    ) {
      throw mappingValueShouldBeABoolean(mappingType, key);
    }

    if (mapping[key] === true) {
      result[key] = true;
    }
  }
  return result;
}
