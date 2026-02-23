import type {
  BaseUserMeta,
  JsonObject,
  LiveObject,
  LsonObject,
  Room,
  Status,
  User,
} from "@liveblocks/client";
import type { EnterOptions, OpaqueClient, OpaqueRoom } from "@liveblocks/core";
import {
  detectDupes,
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
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

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

type LiveblocksContext<P extends JsonObject, U extends BaseUserMeta> = {
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
 * Adds the `liveblocks` property to your custom Redux state.
 */
export type WithLiveblocks<
  TState,
  P extends JsonObject,
  U extends BaseUserMeta,
> = TState & { readonly liveblocks: LiveblocksContext<P, U> };

const internalEnhancer = <TState>(options: {
  client: OpaqueClient;
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

  return (createStore: any) => {
    return (reducer: any, initialState: any, enhancer: any) => {
      let maybeRoom: OpaqueRoom | null = null;
      let isPatching: boolean = false;
      let storageRoot: LiveObject<LsonObject> | null = null;
      let unsubscribeCallbacks: Array<() => void> = [];
      let lastRoomId: string | null = null;
      let lastLeaveFn: (() => void) | null = null;

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
                status: action.status,
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

            if (maybeRoom) {
              isPatching = true;
              updatePresence(
                maybeRoom,
                state,
                newState,
                presenceMapping as any
              );

              maybeRoom.batch(() => {
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
                  status: "initial",
                },
              };
            }
            return newState;
          }
        }
      };

      const store = createStore(newReducer, initialState, enhancer);

      function enterRoom(
        newRoomId: string,
        options?: Pick<EnterOptions, "engine">
      ): void {
        if (lastRoomId === newRoomId) {
          return;
        }

        lastRoomId = newRoomId;
        if (lastLeaveFn !== null) {
          // First leave the old room before entering a potential new one
          lastLeaveFn();
        }

        const initialPresence = selectFields(
          store.getState(),
          presenceMapping
        ) as any;

        const { room, leave } = client.enterRoom(newRoomId, {
          engine: options?.engine,
          initialPresence,
        });
        maybeRoom = room as OpaqueRoom;

        unsubscribeCallbacks.push(
          room.events.status.subscribe((status) => {
            store.dispatch({
              type: ACTION_TYPES.UPDATE_CONNECTION,
              status,
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
          room.events.myPresence.subscribe(() => {
            if (isPatching === false) {
              store.dispatch({
                type: ACTION_TYPES.PATCH_REDUX_STATE,
                state: selectFields(room.getPresence(), presenceMapping),
              });
            }
          })
        );

        store.dispatch({
          type: ACTION_TYPES.START_LOADING_STORAGE,
        });

        void room.getStorage().then(({ root }) => {
          const updates: any = {};

          maybeRoom!.batch(() => {
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
            maybeRoom!.subscribe(
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
        };
      }

      function leaveRoom() {
        lastLeaveFn?.();
      }

      function newDispatch(action: any) {
        if (action.type === ACTION_TYPES.ENTER) {
          enterRoom(action.roomId, action.options);
        } else if (action.type === ACTION_TYPES.LEAVE) {
          leaveRoom();
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
};

/**
 * Actions used to interact with Liveblocks
 */
export const actions = {
  /**
   * Enters a room and starts sync it with Redux state
   * @param roomId The id of the room
   * @param options Optional. Options to pass to the underlying client.enterRoom call (e.g. `engine`).
   */
  enterRoom,
  /**
   * Leaves the currently entered room and stops sync it with Redux state.
   */
  leaveRoom,
};

function enterRoom(
  roomId: string,
  options?: Pick<EnterOptions, "engine">
): {
  type: string;
  roomId: string;
  options?: Pick<EnterOptions, "engine">;
} {
  return {
    type: ACTION_TYPES.ENTER,
    roomId,
    options,
  };
}

function leaveRoom(): {
  type: string;
} {
  return { type: ACTION_TYPES.LEAVE };
}

/**
 * Redux store enhancer that will make the `liveblocks` key available on your
 * Redux store.
 */
export const liveblocksEnhancer = internalEnhancer as <TState>(options: {
  client: OpaqueClient;
  storageMapping?: Mapping<TState>;
  presenceMapping?: Mapping<TState>;
}) => StoreEnhancer;

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

function updatePresence<P extends JsonObject>(
  room: Room<P, any, any, any, any>,
  oldState: P,
  newState: P,
  presenceMapping: Mapping<P>
) {
  for (const key in presenceMapping) {
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed("value");
    }

    if (oldState[key] !== newState[key]) {
      room.updatePresence({ [key]: newState[key] } as P);
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
