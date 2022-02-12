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
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
  missingMapping,
} from "./errors";

export type LiveblocksState<TState, TPresence = any> = TState & {
  readonly liveblocks: {
    readonly enterRoom: (room: string, initialState: Partial<TState>) => void;
    readonly leaveRoom: (room: string) => void;
    readonly room: Room | null;
    readonly others: Array<User<TPresence>>;
    readonly isStorageLoading: boolean;
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
  client: Client;
  storageMapping: Mapping<T>;
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
  const mapping = validateMapping(options.storageMapping, "storageMapping");
  const presenceMapping = validateMapping(
    options.presenceMapping || {},
    "presenceMapping"
  );
  if (process.env.NODE_ENV !== "production") {
    validateNoDuplicateKeys(mapping, presenceMapping);
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
                mapping as any
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

      room.getStorage<any>().then(({ root }) => {
        const updates: any = {};

        room!.batch(() => {
          for (const key in mapping) {
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
