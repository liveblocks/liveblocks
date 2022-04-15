import {
  Client,
  User,
  Room,
  LiveObject,
  LiveObjectData,
  Presence,
  internals,
  StorageUpdate,
} from "@liveblocks/client";
import { StoreEnhancer } from "redux";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
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
    patchLiveObjectKey<T extends LiveObjectData>(
      liveObject: LiveObject<T>,
      key: keyof T,
      prev: any,
      next: any
    ): void;
    liveNodeToJson(value: any): any;
  };
}

const { patchImmutableObject, patchLiveObjectKey, liveNodeToJson } = internals;

export type Mapping<T> = Partial<{
  [Property in keyof T]: boolean;
}>;

const ACTION_TYPES = {
  ENTER: "@@LIVEBLOCKS/ENTER",
  LEAVE: "@@LIVEBLOCKS/LEAVE",
  START_LOADING_STORAGE: "@@LIVEBLOCKS/START_LOADING_STORAGE",
  INIT_STORAGE: "@@LIVEBLOCKS/INIT_STORAGE",
  PATCH_REDUX_STATE: "@@LIVEBLOCKS/PATCH_REDUX_STATE",
  UPDATE_CONNECTION: "@@LIVEBLOCKS/UPDATE_CONNECTION",
  UPDATE_OTHERS: "@@LIVEBLOCKS/UPDATE_OTHERS",
};

export type LiveblocksState<
  TState,
  TPresence extends Presence = Presence
> = TState & {
  /**
   * Liveblocks extra state attached by the enhancer
   */
  readonly liveblocks: {
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

const internalEnhancer = <T>(options: {
  client: Client;
  storageMapping?: Mapping<T>;
  presenceMapping?: Mapping<T>;
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
    (reducer: any, initialState: any, enhancer: any) => {
      let room: Room | null = null;
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

      const store = createStore(newReducer, initialState, enhancer);

      function enterRoom(
        roomId: string,
        storageInitialState = {} as any,
        reduxState: any
      ) {
        if (storageRoot) {
          return;
        }

        room = client.enter(roomId);

        broadcastInitialPresence(room, reduxState, presenceMapping as any);

        unsubscribeCallbacks.push(
          room.subscribe("connection", () => {
            store.dispatch({
              type: ACTION_TYPES.UPDATE_CONNECTION,
              connection: room!.getConnectionState(),
            });
          })
        );

        unsubscribeCallbacks.push(
          room.subscribe("others", (others) => {
            store.dispatch({
              type: ACTION_TYPES.UPDATE_OTHERS,
              others: others.toArray(),
            });
          })
        );

        unsubscribeCallbacks.push(
          room.subscribe("my-presence", () => {
            if (isPatching === false) {
              store.dispatch({
                type: ACTION_TYPES.PATCH_REDUX_STATE,
                state: patchPresenceState(
                  room!.getPresence(),
                  presenceMapping as any
                ),
              });
            }
          })
        );

        store.dispatch({
          type: ACTION_TYPES.START_LOADING_STORAGE,
        });

        room.getStorage<any>().then(({ root }) => {
          const updates: any = {};

          room!.batch(() => {
            for (const key in mapping) {
              const liveblocksStatePart = root.get(key);

              if (liveblocksStatePart == null) {
                updates[key] = storageInitialState[key];
                patchLiveObjectKey(
                  root,
                  key,
                  undefined,
                  storageInitialState[key]
                );
              } else {
                updates[key] = liveNodeToJson(liveblocksStatePart);
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

      function newDispatch(action: any, state: any) {
        if (action.type === ACTION_TYPES.ENTER) {
          enterRoom(action.roomId, action.initialState, store.getState());
        } else if (action.type === ACTION_TYPES.LEAVE) {
          leaveRoom(action.roomId);
        } else {
          store.dispatch(action, state);
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
   * Enters a room and starts sync it with zustand state
   * @param roomId The id of the room
   * @param initialState The initial state of the room storage. If a key does not exist if your room storage root, initialState[key] will be used.
   */
  enterRoom,
  /**
   * Leaves a room and stops sync it with zustand state.
   * @param roomId The id of the room
   */
  leaveRoom,
};

function enterRoom(roomId: string, initialState?: any) {
  return {
    type: ACTION_TYPES.ENTER,
    roomId,
    initialState,
  };
}

function leaveRoom(roomId: string) {
  return {
    type: ACTION_TYPES.LEAVE,
    roomId,
  };
}

export const enhancer = internalEnhancer as <T>(options: {
  client: Client;
  storageMapping?: Mapping<T>;
  presenceMapping?: Mapping<T>;
}) => StoreEnhancer;

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

function patchPresenceState<T>(presence: any, mapping: Mapping<T>) {
  const partialState: Partial<T> = {};

  for (const key in mapping) {
    partialState[key] = presence[key];
  }

  return partialState;
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

/**
 * Remove false keys from mapping and generate to a new object to avoid potential mutation from outside the middleware
 */
function validateMapping<T>(
  mapping: Mapping<T>,
  mappingType: "storageMapping" | "presenceMapping"
): Mapping<T> {
  if (process.env.NODE_ENV !== "production") {
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
