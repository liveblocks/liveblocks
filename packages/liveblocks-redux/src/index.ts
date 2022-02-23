import {
  Client,
  patchLiveObject,
  liveObjectToJson,
  patchImmutableObject,
  User,
} from "@liveblocks/client";

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

export const plugin: any =
  (client: Client) =>
  (createStore: any) =>
  (reducer: any, initialState: any, enhancer: any) => {
    let isPatching: boolean = false;

    let storageRoot: any | null = null;
    let unsubscribe: null | (() => void) = null;

    const newReducer = (state: any, action: any) => {
      const newState = reducer(state, action);

      if (storageRoot) {
        isPatching = true;
        patchLiveObject(storageRoot, state, newState);
        isPatching = false;
      }

      switch (action.type) {
        case "LIVEBLOCKS_REPLACE":
          return action.state;
      }

      return newState;
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

    function enter(roomId: string) {
      if (storageRoot) {
        return;
      }

      const room = client.enter(roomId);

      room.getStorage().then(({ root }) => {
        store.dispatch({
          type: "LIVEBLOCKS_REPLACE",
          state: liveObjectToJson(root),
        });

        storageRoot = root;
        unsubscribe = room.subscribe(
          root,
          (updates) => {
            if (isPatching === false) {
              store.dispatch({
                type: "LIVEBLOCKS_REPLACE",
                state: patchImmutableObject(store.getState(), updates),
              });
            }
          },
          { isDeep: true }
        );
      });
    }

    function leave(roomId: string) {
      if (unsubscribe == null) {
        return;
      }

      unsubscribe();
      client.leave(roomId);
    }

    return {
      ...store,
      enter,
      leave,
    };
  };
