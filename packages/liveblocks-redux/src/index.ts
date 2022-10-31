import type {
  BaseUserMeta,
  Client,
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
} from "@liveblocks/core";
import type { StoreEnhancer } from "redux";

import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
} from "./errors";

export type Mapping<T> = {
  [K in keyof T]?: boolean;
};

const ACTION_TYPES = {
  ENTER: "@@LIVEBLOCKS/ENTER",
  LEAVE: "@@LIVEBLOCKS/LEAVE",
  START_LOADING_STORAGE: "@@LIVEBLOCKS/START_LOADING_STORAGE",
  INIT_STORAGE: "@@LIVEBLOCKS/INIT_STORAGE",
  PATCH_REDUX_STATE: "@@LIVEBLOCKS/PATCH_REDUX_STATE",
  UPDATE_CONNECTION: "@@LIVEBLOCKS/UPDATE_CONNECTION",
  UPDATE_OTHERS: "@@LIVEBLOCKS/UPDATE_OTHERS",
};

type LiveblocksContext<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = {
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
 * @deprecated Please rename to WithLiveblocks<...>
 */
export type LiveblocksState<
  TState,
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = WithLiveblocks<TState, TPresence, TUserMeta>;

/**
 * Adds the `liveblocks` property to your custom Redux state.
 */
export type WithLiveblocks<
  TState,
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = TState & { readonly liveblocks: LiveblocksContext<TPresence, TUserMeta> };

const internalEnhancer = <TState>(options: {
  client: Client;
  storageMapping?: Mapping<TState>;
  presenceMapping?: Mapping<TState>;
}) => {
  if (process.env.NODE_ENV !== "production" && options.client == null) {
    throw missingClient();
  }
  const client = options.client;
  const mapping = validateMapping(
    options.storageMapping || {},
    "storageMapping"
  );
  const presenceMapping = validateMapping(
    options.presenceMapping || {},
    "presenceMapping"
  );
  if (process.env.NODE_ENV !== "production") {
    validateNoDuplicateKeys(mapping, presenceMapping);
  }

  return (createStore: any) =>
    (reducer: any, initialState: any) => {
      let room: Room<any, any, any, any> | null = null;
      let isPatching: boolean = false;
      let storageRoot: LiveObject<any> | null = null;
      let unsubscribeCallbacks: Array<() => void> = [];

      const newReducer = (state: any, action: any) => {
        switch (action.type) {
          case ACTION_TYPES.PATCH_REDUX_STATE:
            return {
              ...state,
              ...action.state,
            };
          case ACTION_TYPES.INIT_STORAGE:
            return {
              ...state,
              ...action.state,
              liveblocks: {
                ...state.liveblocks,
                isStorageLoading: false,
              },
            };
          case ACTION_TYPES.START_LOADING_STORAGE:
            return {
              ...state,
              liveblocks: {
                ...state.liveblocks,
                isStorageLoading: true,
              },
            };
          case ACTION_TYPES.UPDATE_CONNECTION: {
            return {
              ...state,
              liveblocks: {
                ...state.liveblocks,
                connection: action.connection,
              },
            };
          }
          case ACTION_TYPES.UPDATE_OTHERS: {
            return {
              ...state,
              liveblocks: {
                ...state.liveblocks,
                others: action.others,
              },
            };
          }
          default: {
            const newState = reducer(state, action);

            if (room) {
              isPatching = true;
              updatePresence(room!, state, newState, presenceMapping as any);

              room.batch(() => {
                if (storageRoot) {
                  patchLiveblocksStorage(
                    storageRoot,
                    state,
                    newState,
                    mapping as any
                  );
                }
              });
              isPatching = false;
            }

            if (newState.liveblocks == null) {
              return {
                ...newState,
                liveblocks: {
                  others: [],
                  isStorageLoading: false,
                  connection: "closed",
                },
              };
            }
            return newState;
          }
        }
      };

      const store = createStore(newReducer, initialState);

      function enterRoom(roomId: string) {
        if (storageRoot) {
          return;
        }

        const initialPresence = selectFields(
          store.getState(),
          presenceMapping
        ) as any;

        room = client.enter(roomId, { initialPresence });

        unsubscribeCallbacks.push(
          room.events.connection.subscribe(() => {
            store.dispatch({
              type: ACTION_TYPES.UPDATE_CONNECTION,
              connection: room!.getConnectionState(),
            });
          })
        );

        unsubscribeCallbacks.push(
          room.events.others.subscribe(({ others }) => {
            store.dispatch({
              type: ACTION_TYPES.UPDATE_OTHERS,
              others,
            });
          })
        );

        unsubscribeCallbacks.push(
          room.events.me.subscribe(() => {
            if (isPatching === false) {
              store.dispatch({
                type: ACTION_TYPES.PATCH_REDUX_STATE,
                state: selectFields(room!.getPresence(), presenceMapping),
              });
            }
          })
        );

        store.dispatch({
          type: ACTION_TYPES.START_LOADING_STORAGE,
        });

        room.getStorage().then(({ root }) => {
          const updates: any = {};

          room!.batch(() => {
            for (const key in mapping) {
              const liveblocksStatePart = root.get(key);

              if (liveblocksStatePart == null) {
                updates[key] = store.getState()[key];
                patchLiveObjectKey(root, key, undefined, store.getState()[key]);
              } else {
                updates[key] = lsonToJson(liveblocksStatePart);
              }
            }
          });

          store.dispatch({
            type: ACTION_TYPES.INIT_STORAGE,
            state: updates,
          });

          storageRoot = root;
          unsubscribeCallbacks.push(
            room!.subscribe(
              root,
              (updates) => {
                if (isPatching === false) {
                  store.dispatch({
                    type: ACTION_TYPES.PATCH_REDUX_STATE,
                    state: patchState(
                      store.getState(),
                      updates,
                      mapping as any
                    ),
                  });
                }
              },
              { isDeep: true }
            )
          );
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
      }

      function newDispatch(action: any) {
        if (action.type === ACTION_TYPES.ENTER) {
          enterRoom(action.roomId);
        } else if (action.type === ACTION_TYPES.LEAVE) {
          leaveRoom(action.roomId);
        } else {
          store.dispatch(action);
        }
      }

      return {
        ...store,
        dispatch: newDispatch,
      };
    };
};

/**
 * Actions used to interact with Liveblocks
 */
export const actions = {
  /**
   * Enters a room and starts sync it with Redux state
   * @param roomId The id of the room
   */
  enterRoom,
  /**
   * Leaves a room and stops sync it with Redux state.
   * @param roomId The id of the room
   */
  leaveRoom,
};

function enterRoom(roomId: string): {
  type: string;
  roomId: string;
} {
  return {
    type: ACTION_TYPES.ENTER,
    roomId,
  };
}

function leaveRoom(roomId: string): {
  type: string;
  roomId: string;
} {
  return {
    type: ACTION_TYPES.LEAVE,
    roomId,
  };
}

/**
 * Redux store enhancer that will make the `liveblocks` key available on your
 * Redux store.
 */
export const liveblocksEnhancer = internalEnhancer as <TState>(options: {
  client: Client;
  storageMapping?: Mapping<TState>;
  presenceMapping?: Mapping<TState>;
}) => StoreEnhancer;

/**
 * @deprecated Renamed to `liveblocksEnhancer`.
 */
export const enhancer = liveblocksEnhancer;

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
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      const oldVal = oldState[key];
      const newVal = newState[key];
      patchLiveObjectKey(root, key, oldVal as any, newVal);
    }
  }
}

function updatePresence<TPresence extends JsonObject>(
  room: Room<TPresence, any, any, any>,
  oldState: TPresence,
  newState: TPresence,
  presenceMapping: Mapping<TPresence>
) {
  for (const key in presenceMapping) {
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      room.updatePresence({ [key]: newState[key] } as TPresence);
    }
  }
}

function isObject(value: any): value is object {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function validateNoDuplicateKeys<TState>(
  storageMapping: Mapping<TState>,
  presenceMapping: Mapping<TState>
) {
  for (const key in storageMapping) {
    if (presenceMapping[key] !== undefined) {
      throw mappingShouldNotHaveTheSameKeys(key);
    }
  }
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

function patchState<TState extends JsonObject>(
  state: TState,
  updates: any[], // StorageUpdate
  mapping: Mapping<TState>
) {
  const partialState: Partial<TState> = {};

  for (const key in mapping) {
    partialState[key] = state[key];
  }

  const patched = legacy_patchImmutableObject(partialState, updates);

  const result: Partial<TState> = {};

  for (const key in mapping) {
    result[key] = patched[key];
  }

  return result;
}

/**
 * Remove false keys from mapping and generate to a new object to avoid potential mutation from outside the middleware
 */
function validateMapping<TState>(
  mapping: Mapping<TState>,
  mappingType: "storageMapping" | "presenceMapping"
): Mapping<TState> {
  if (process.env.NODE_ENV !== "production") {
    if (!isObject(mapping)) {
      throw mappingShouldBeAnObject(mappingType);
    }
  }

  const result: Mapping<TState> = {};
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
