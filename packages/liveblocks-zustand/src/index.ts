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
import type { StorageUpdate } from "@liveblocks/core";
import {
  errorIf,
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "@liveblocks/core";
import type { StateCreator, StoreMutatorIdentifier } from "zustand";

const ERROR_PREFIX = "Invalid @liveblocks/zustand middleware config.";

function mappingToFunctionIsNotAllowed(key: string): Error {
  return new Error(
    `${ERROR_PREFIX} mapping.${key} is invalid. Mapping to a function is not allowed.`
  );
}

export type LiveblocksContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  /**
   * Enters a room and starts sync it with zustand state
   * @param roomId The id of the room
   */
  readonly enterRoom: (roomId: string) => void;
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
  readonly others: readonly User<TPresence, TUserMeta>[];
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

/**
 * @deprecated Renamed to WithLiveblocks<...>
 */
export type LiveblocksState<
  TState,
  TPresence extends JsonObject = JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = Json
> = WithLiveblocks<TState, TPresence, TStorage, TUserMeta, TRoomEvent>;

/**
 * Adds the `liveblocks` property to your custom Zustand state.
 */
export type WithLiveblocks<
  TState,
  TPresence extends JsonObject = JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = Json
> = TState & {
  readonly liveblocks: LiveblocksContext<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >;
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

type OuterLiveblocksMiddleware = <
  TState,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<TState, Mps, Mcs, Omit<TState, "liveblocks">>,
  options: Options<Omit<TState, "liveblocks">>
) => StateCreator<TState, Mps, Mcs, TState>;

type InnerLiveblocksMiddleware = <
  TState extends {
    readonly liveblocks: LiveblocksContext<
      JsonObject,
      LsonObject,
      BaseUserMeta,
      Json
    >;
  }
>(
  config: StateCreator<TState, [], []>,
  options: Options<TState>
) => StateCreator<TState, [], []>;

type ExtractPresence<
  TRoom extends Room<JsonObject, LsonObject, BaseUserMeta, Json>
> = TRoom extends Room<infer P, any, any, any> ? P : never;

type ExtractStorage<
  TRoom extends Room<JsonObject, LsonObject, BaseUserMeta, Json>
> = TRoom extends Room<any, infer S, any, any> ? S : never;

const middlewareImpl: InnerLiveblocksMiddleware = (config, options) => {
  type TState = ReturnType<typeof config>;
  type TLiveblocksContext = TState["liveblocks"];
  type TRoom = NonNullable<TLiveblocksContext["room"]>;
  type TPresence = ExtractPresence<TRoom>;
  type TStorage = ExtractStorage<TRoom>;

  const { client, presenceMapping, storageMapping } = validateOptions(options);
  return (set, get, api) => {
    let maybeRoom: TRoom | null = null;
    let isPatching: boolean = false;
    let storageRoot: LiveObject<TStorage> | null = null;
    let unsubscribeCallbacks: Array<() => void> = [];

    function enterRoom(roomId: string) {
      if (storageRoot) {
        return;
      }

      const initialPresence = selectFields(
        get(),
        presenceMapping
      ) as unknown as TPresence;

      const room = client.enter(roomId, {
        initialPresence,
      }) as unknown as TRoom;
      maybeRoom = room;

      updateLiveblocksContext(set, { isStorageLoading: true, room });

      unsubscribeCallbacks.push(
        room.events.others.subscribe(({ others }) => {
          updateLiveblocksContext(set, { others });
        })
      );

      unsubscribeCallbacks.push(
        room.events.connection.subscribe(() => {
          updateLiveblocksContext(set, {
            connection: room.getConnectionState(),
          });
        })
      );

      unsubscribeCallbacks.push(
        room.events.me.subscribe(() => {
          if (isPatching === false) {
            set(
              selectFields(
                room.getPresence(),
                presenceMapping
              ) as Partial<TState>
            );
          }
        })
      );

      room.getStorage().then(({ root }) => {
        const updates = {} as Partial<TState>;

        room.batch(() => {
          for (const key in storageMapping) {
            const liveblocksStatePart = root.get(key);
            if (liveblocksStatePart === undefined) {
              updates[key] = get()[key];
              patchLiveObjectKey(root, key, undefined, get()[key]);
            } else {
              updates[key] = lsonToJson(
                liveblocksStatePart
              ) as unknown as TState[Extract<keyof TState, string>];
            }
          }
        });

        set(updates);

        storageRoot = root as LiveObject<TStorage>;
        unsubscribeCallbacks.push(
          room.subscribe(
            root,
            (updates) => {
              if (isPatching === false) {
                set(patchState(get(), updates, storageMapping));
              }
            },
            { isDeep: true }
          )
        );

        // set isLoading storage to false once storage is loaded
        updateLiveblocksContext(set, {
          isStorageLoading: false,
        });
      });
    }

    function leaveRoom(roomId: string) {
      for (const unsubscribe of unsubscribeCallbacks) {
        unsubscribe();
      }
      storageRoot = null;
      maybeRoom = null;
      isPatching = false;
      unsubscribeCallbacks = [];
      client.leave(roomId);
      updateLiveblocksContext(set, {
        others: [],
        connection: "closed",
        isStorageLoading: false,
        room: null,
      });
    }

    const store = config(
      (args) => {
        const { liveblocks: _, ...oldState } = get();
        set(args);
        const { liveblocks: __, ...newState } = get();

        if (maybeRoom) {
          const room = maybeRoom;
          isPatching = true;
          updatePresence(room, oldState, newState, presenceMapping);

          room.batch(() => {
            if (storageRoot) {
              patchLiveblocksStorage(
                storageRoot,
                oldState,
                newState,
                storageMapping
              );
            }
          });

          isPatching = false;
        }
      },
      get,
      api
    );

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
};

export const liveblocks =
  middlewareImpl as unknown as OuterLiveblocksMiddleware;

/**
 * @deprecated Renamed to `liveblocks`.
 */
export const middleware = liveblocks;

function patchState<T>(
  state: T,
  updates: StorageUpdate[],
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

function selectFields<TState>(
  presence: TState,
  mapping: Mapping<TState>
): /* TODO: Actually, Pick<TState, keyof Mapping<TState>> ? */
Partial<TState> {
  const partialState = {} as Partial<TState>;
  for (const key in mapping) {
    partialState[key] = presence[key];
  }
  return partialState;
}

function updateLiveblocksContext<
  TState,
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  set: (
    callbackOrPartial: (
      current: WithLiveblocks<
        TState,
        TPresence,
        TStorage,
        TUserMeta,
        TRoomEvent
      >
    ) =>
      | WithLiveblocks<TState, TPresence, TStorage, TUserMeta, TRoomEvent>
      | Partial<any>
  ) => void,
  partial: Partial<
    LiveblocksContext<TPresence, TStorage, TUserMeta, TRoomEvent>
  >
) {
  set((state) => ({ liveblocks: { ...state.liveblocks, ...partial } }));
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
      throw mappingToFunctionIsNotAllowed(key);
    }

    if (oldState[key] !== newState[key]) {
      const val = newState?.[key];
      const patch = {} as Partial<TPresence>;
      patch[key] = val;
      room.updatePresence(patch);
    }
  }
}

function patchLiveblocksStorage<O extends LsonObject, TState>(
  root: LiveObject<O>,
  oldState: TState,
  newState: TState,
  mapping: Mapping<TState>
) {
  for (const key in mapping) {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof newState[key] === "function"
    ) {
      throw mappingToFunctionIsNotAllowed(key);
    }

    if (oldState[key] !== newState[key]) {
      const oldVal = oldState[key];
      const newVal = newState[key];
      patchLiveObjectKey(root, key, oldVal, newVal);
    }
  }
}

function isObject(value: unknown): value is object {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function validateNoDuplicateKeys<T>(
  storageMapping: Mapping<T>,
  presenceMapping: Mapping<T>
) {
  for (const key in storageMapping) {
    if (presenceMapping[key] !== undefined) {
      throw new Error(
        `${ERROR_PREFIX} "${key}" is mapped on both presenceMapping and storageMapping. A key shouldn't exist on both mapping.`
      );
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
  errorIf(
    !isObject(mapping),
    `${ERROR_PREFIX} ${mappingType} should be an object where the values are boolean.`
  );

  const result: Mapping<T> = {};
  for (const key in mapping) {
    errorIf(
      typeof mapping[key] !== "boolean",
      `${ERROR_PREFIX} ${mappingType}.${key} value should be a boolean`
    );

    if (mapping[key] === true) {
      result[key] = true;
    }
  }
  return result;
}

function validateOptions<TState>(options: Options<TState>): {
  client: Client;
  presenceMapping: Mapping<TState>;
  storageMapping: Mapping<TState>;
} {
  const client = options.client;
  errorIf(!client, `${ERROR_PREFIX} client is missing`);

  const storageMapping = validateMapping(
    options.storageMapping ?? {},
    "storageMapping"
  );

  const presenceMapping = validateMapping(
    options.presenceMapping ?? {},
    "presenceMapping"
  );

  if (process.env.NODE_ENV !== "production") {
    validateNoDuplicateKeys(storageMapping, presenceMapping);
  }

  return { client, storageMapping, presenceMapping };
}
