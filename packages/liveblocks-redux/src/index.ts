import {
  Client,
  patchImmutableObject,
  User,
  Room,
  LiveObject,
  patchLiveObjectKey,
  liveNodeToJson,
} from "@liveblocks/client";
import { StoreEnhancer } from "redux";
import {
  mappingShouldBeAnObject,
  mappingShouldNotHaveTheSameKeys,
  mappingToFunctionIsNotAllowed,
  mappingValueShouldBeABoolean,
  missingClient,
  missingMapping,
} from "./errors";

export type Mapping<T> = Partial<
  {
    [Property in keyof T]: boolean;
  }
>;

export type LiveblocksState<TState, TPresence = any> = TState & {
  /**
   * Liveblocks extra state attached by the middleware
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

const internalPlugin = <T>(options: {
  client: Client;
  storageMapping: Mapping<T>;
  presenceMapping?: Mapping<T>;
}) => {
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

  return (createStore: any) =>
    (reducer: any, initialState: any, enhancer: any) => {
      let room: Room | null = null;
      let isPatching: boolean = false;
      let storageRoot: LiveObject<any> | null = null;
      let unsubscribeCallbacks: Array<() => void> = [];

      const newReducer = (state: any, action: any) => {
        switch (action.type) {
          case "LIVEBLOCKS_REPLACE":
            return {
              ...state,
              ...action.state,
            };
          case "LIVEBLOCKS_INIT":
            return {
              ...state,
              ...action.state,
              liveblocks: {
                ...state.liveblocks,
                isStorageLoading: false,
              },
            };
          case "LIVEBLOCKS_ENTER_ROOM":
            return {
              ...state,
              liveblocks: {
                ...state.liveblocks,
                isStorageLoading: true,
              },
            };
          case "LIVEBLOCKS_UPDATE_CONNECTION": {
            return {
              ...state,
              liveblocks: {
                ...state.liveblocks,
                connection: action.connection,
              },
            };
          }
          case "LIVEBLOCKS_UPDATE_OTHERS": {
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
            return newState;
          }
        }
      };

      const store = createStore(
        newReducer,
        {
          ...initialState,
          liveblocks: {
            others: [],
            isStorageLoading: false,
            connection: "closed",
          },
        },
        enhancer
      );

      function enterRoom(roomId: string, initialState: any) {
        if (storageRoot) {
          return;
        }

        room = client.enter(roomId);

        broadcastInitialPresence(
          room,
          store.getState(),
          presenceMapping as any
        );

        unsubscribeCallbacks.push(
          room.subscribe("connection", () => {
            store.dispatch({
              type: "LIVEBLOCKS_UPDATE_CONNECTION",
              connection: room!.getConnectionState(),
            });
          })
        );

        unsubscribeCallbacks.push(
          room.subscribe("others", (others) => {
            store.dispatch({
              type: "LIVEBLOCKS_UPDATE_OTHERS",
              others: others.toArray(),
            });
          })
        );

        store.dispatch({
          type: "LIVEBLOCKS_ENTER_ROOM",
        });

        room.getStorage<any>().then(({ root }) => {
          const updates: any = {};

          console.log("initial State", initialState);

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

          console.log("updates", updates);

          store.dispatch({
            type: "LIVEBLOCKS_INIT",
            state: updates,
          });

          storageRoot = root;
          unsubscribeCallbacks.push(
            room!.subscribe(
              root,
              (updates) => {
                if (isPatching === false) {
                  store.dispatch({
                    type: "LIVEBLOCKS_REPLACE",
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

      return {
        ...store,
        enterRoom,
        leaveRoom,
      };
    };
};

export const plugin = internalPlugin as <T>(options: {
  client: Client;
  storageMapping: Mapping<T>;
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
