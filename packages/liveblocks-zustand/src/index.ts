import type {
  BaseUserMeta,
  Client,
  Json,
  JsonObject,
  LiveObject,
  LsonObject,
  Room,
  User,
} from "@liveblocks/client";
import {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "@liveblocks/client/internal";
import type { GetState, SetState, StateCreator, StoreApi } from "zustand";

import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
  missingMapping,
} from "./errors";

function isJson(value: unknown): value is Json {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every(isJson)) ||
    (typeof value === "object" && Object.values(value).every(isJson))
  );
}

export type ZustandState =
  // TODO: Properly type out the constraints for this type here!
  Record<string, unknown>;

export type LiveblocksState<
  TState extends ZustandState,
  TPresence extends JsonObject = JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = Json
> = TState & {
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
    readonly room: Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;
    /**
     * Other users in the room. Empty no room is currently synced
     */
    readonly others: Array<User<TPresence, TUserMeta>>;
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

export type Mapping<T> = {
  [K in keyof T]?: boolean;
};

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

export function middleware<
  T extends ZustandState,
  TPresence extends JsonObject = JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = Json
>(
  config: StateCreator<
    T,
    SetState<T>,
    GetState<LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>>,
    StoreApi<T>
  >,
  options: Options<T>
): StateCreator<
  LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>,
  SetState<LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>>,
  GetState<LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>>,
  StoreApi<LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>>
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
        current: LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
      ) =>
        | LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
        | Partial<T>
    ) => void = set;

    let room: Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null = null;
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
          updatePresence(
            room!,
            oldState as any,
            newState,
            presenceMapping as any
          );

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
      get as any,
      api
    );

    function enterRoom(roomId: string, initialState: any) {
      if (storageRoot) {
        return;
      }

      room = client.enter(roomId);

      updateZustandLiveblocksState(set, {
        isStorageLoading: true,
        room: room as any,
      });

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

      room.getStorage().then(({ root }) => {
        const updates: any = {};

        room!.batch(() => {
          for (const key in storageMapping) {
            const liveblocksStatePart = root.get(key);

            if (liveblocksStatePart == null) {
              updates[key] = initialState[key];
              patchLiveObjectKey(root, key, undefined, initialState[key]);
            } else {
              updates[key] = lsonToJson(liveblocksStatePart);
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

  const patched = legacy_patchImmutableObject(partialState, updates);

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

function updateZustandLiveblocksState<
  T extends ZustandState,
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  set: (
    callbackOrPartial: (
      current: LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
    ) =>
      | LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
      | Partial<any>
  ) => void,
  partial: Partial<
    LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>["liveblocks"]
  >
) {
  set((state) => ({ liveblocks: { ...state.liveblocks, ...partial } }));
}

function broadcastInitialPresence<T>(
  room: Room<any, any, any, any>,
  state: T,
  mapping: Mapping<T>
) {
  for (const key in mapping) {
    room?.updatePresence({ [key]: (state as any)[key] });
  }
}

function updatePresence<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
  oldState: TPresence,
  newState: TPresence,
  presenceMapping: Mapping<TPresence>
) {
  for (const key in presenceMapping) {
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      const val = newState[key] as unknown as Json | undefined;
      room.updatePresence({ [key]: val } as any);
    }
  }
}

function patchLiveblocksStorage<
  O extends LsonObject,
  TState extends ZustandState,
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  root: LiveObject<O>,
  oldState: LiveblocksState<TState, TPresence, TStorage, TUserMeta, TRoomEvent>,
  newState: LiveblocksState<TState, TPresence, TStorage, TUserMeta, TRoomEvent>,
  mapping: Mapping<TState>
) {
  for (const key in mapping) {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof newState[key] === "function"
    ) {
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      const oldVal: unknown = oldState[key];
      const newVal: unknown = newState[key];

      // Ensure to only patch values that are actually legal Json values. The
      // old and new states could well contain functions (the Zustand setters),
      // and we definitely want to rule those out, even if they make it into
      // the mapping.
      if (
        (oldVal === undefined || isJson(oldVal)) &&
        (newVal === undefined || isJson(newVal))
      ) {
        patchLiveObjectKey(root, key, oldVal, newVal);
      }
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
