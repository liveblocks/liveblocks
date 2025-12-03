import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LiveObject,
  LsonObject,
  Room,
  Status,
  User,
} from "@liveblocks/client";
import type {
  BaseMetadata,
  DE,
  DM,
  DP,
  DS,
  DU,
  OpaqueClient,
  OpaqueRoom,
  StorageUpdate,
} from "@liveblocks/core";
import {
  detectDupes,
  errorIf,
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "@liveblocks/core";
import type { StateCreator, StoreMutatorIdentifier } from "zustand";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

const ERROR_PREFIX = "Invalid @liveblocks/zustand middleware config.";

function mappingToFunctionIsNotAllowed(key: string): Error {
  return new Error(
    `${ERROR_PREFIX} mapping.${key} is invalid. Mapping to a function is not allowed.`
  );
}

export type LiveblocksContext<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  TM extends BaseMetadata,
  CM extends BaseMetadata,
> = {
  /**
   * Enters a room and starts sync it with zustand state
   * @param roomId The id of the room
   */
  readonly enterRoom: (roomId: string) => () => void;
  /**
   * Leaves the currently entered room and stops sync it with zustand state, if
   * any. If enterRoom was not called before, this is a no-op.
   */
  readonly leaveRoom: () => void;
  /**
   * The room currently synced to your zustand state.
   */
  readonly room: Room<P, S, U, E, TM, CM> | null;
  /**
   * Other users in the room. Empty no room is currently synced
   */
  readonly others: readonly User<P, U>[];
  /**
   * Whether or not the room storage is currently loading
   */
  readonly isStorageLoading: boolean;
  /**
   * Connection status of the room.
   */
  readonly status: Status;
};

/**
 * Adds the `liveblocks` property to your custom Zustand state.
 */
export type WithLiveblocks<
  TState,
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  TM extends BaseMetadata = DM,
  CM extends BaseMetadata = DCM,
> = TState & {
  readonly liveblocks: LiveblocksContext<P, S, U, E, TM, CM>;
};

export type Mapping<T> = {
  [K in keyof T]?: boolean;
};

type Options<T> = {
  /**
   * Liveblocks client created by @liveblocks/client createClient
   */
  client: OpaqueClient;
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
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
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
      Json,
      BaseMetadata,
      BaseMetadata
    >;
  },
>(
  config: StateCreator<TState, [], []>,
  options: Options<TState>
) => StateCreator<TState, [], []>;

type ExtractPresence<TRoom extends OpaqueRoom> =
  TRoom extends Room<infer P, any, any, any, any> ? P : never;

type ExtractStorage<TRoom extends OpaqueRoom> =
  TRoom extends Room<any, infer S, any, any, any> ? S : never;

const middlewareImpl: InnerLiveblocksMiddleware = (config, options) => {
  type TState = ReturnType<typeof config>;
  type TLiveblocksContext = TState["liveblocks"];
  type TRoom = NonNullable<TLiveblocksContext["room"]>;
  type P = ExtractPresence<TRoom>;
  type S = ExtractStorage<TRoom>;

  const { client, presenceMapping, storageMapping } = validateOptions(options);
  return (set, get, api) => {
    let maybeRoom: TRoom | null = null;
    let isPatching: boolean = false;
    let storageRoot: LiveObject<S> | null = null;
    let unsubscribeCallbacks: Array<() => void> = [];
    let lastRoomId: string | null = null;
    let lastLeaveFn: (() => void) | null = null;

    function enterRoom(newRoomId: string): void {
      if (lastRoomId === newRoomId) {
        return;
      }

      lastRoomId = newRoomId;
      if (lastLeaveFn !== null) {
        // First leave the old room before entering a potential new one
        lastLeaveFn();
      }

      const initialPresence = selectFields(
        get(),
        presenceMapping
      ) as unknown as P;

      const { room, leave } = client.enterRoom(newRoomId, {
        initialPresence,
      }) as unknown as { room: TRoom; leave: () => void };
      maybeRoom = room;

      updateLiveblocksContext(set, { isStorageLoading: true, room });

      unsubscribeCallbacks.push(
        room.events.others.subscribe(({ others }) => {
          updateLiveblocksContext(set, { others });
        })
      );

      unsubscribeCallbacks.push(
        room.events.status.subscribe((status) => {
          updateLiveblocksContext(set, {
            status,
          });
        })
      );

      unsubscribeCallbacks.push(
        room.events.myPresence.subscribe(() => {
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

      void room.getStorage().then(({ root }) => {
        const updates = {} as Partial<TState>;

        room.batch(() => {
          for (const key in storageMapping) {
            const liveblocksStatePart = root.get(key);
            if (liveblocksStatePart === undefined) {
              updates[key] = get()[key];
              patchLiveObjectKey(
                root,
                key,
                undefined,
                get()[key] as Json | undefined
              );
            } else {
              updates[key] = lsonToJson(
                liveblocksStatePart
              ) as unknown as TState[Extract<keyof TState, string>];
            }
          }
        });

        set(updates);

        storageRoot = root as LiveObject<S>;
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

      lastLeaveFn = () => {
        for (const unsubscribe of unsubscribeCallbacks) {
          unsubscribe();
        }
        unsubscribeCallbacks = [];

        storageRoot = null;
        maybeRoom = null;
        isPatching = false;

        lastRoomId = null;
        lastLeaveFn = null;
        leave();

        updateLiveblocksContext(set, {
          others: [],
          status: "initial",
          isStorageLoading: false,
          room: null,
        });
      };
    }

    function leaveRoom() {
      lastLeaveFn?.();
    }

    const store = config(
      (...args) => {
        const { liveblocks: _, ...oldState } = get();
        // @ts-expect-error a bit too dynamic to type
        set(...args);
        const { liveblocks: __, ...newState } = get();

        if (maybeRoom) {
          const room = maybeRoom;
          isPatching = true;
          updatePresence(
            room,
            oldState as JsonObject,
            newState as JsonObject,
            presenceMapping
          );

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

function patchState<T>(
  state: T,
  updates: StorageUpdate[],
  mapping: Mapping<T>
) {
  const partialState: Partial<T> = {};

  for (const key in mapping) {
    partialState[key] = state[key];
  }

  const patched = legacy_patchImmutableObject(
    partialState as JsonObject,
    updates
  );

  const result: Partial<T> = {};

  for (const key in mapping) {
    // @ts-expect-error key is a key of T
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
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  set: (
    callbackOrPartial: (
      current: WithLiveblocks<TState, P, S, U, E, TM, CM>
    ) => WithLiveblocks<TState, P, S, U, E> | Partial<any>
  ) => void,
  partial: Partial<LiveblocksContext<P, S, U, E, TM, CM>>
) {
  set((state) => ({ liveblocks: { ...state.liveblocks, ...partial } }));
}

function updatePresence<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  room: Room<P, S, U, E, TM, CM>,
  oldState: P,
  newState: P,
  presenceMapping: Mapping<P>
) {
  for (const key in presenceMapping) {
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed(key);
    }

    if (oldState[key] !== newState[key]) {
      const val = newState?.[key];
      const patch = {} as Partial<P>;
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
      const oldVal = oldState[key] as Json | undefined;
      const newVal = newState[key] as Json | undefined;
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
  client: OpaqueClient;
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
