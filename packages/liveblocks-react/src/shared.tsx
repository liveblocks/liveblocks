import { type BaseUserMeta, type Client, kInternal } from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import type { SharedContextBundle, UserState, UserStateSuccess } from "./types";

const ContextBundle = createContext<SharedContextBundle<BaseUserMeta> | null>(
  null
);

/**
 * @private
 *
 * Private context used in the core internals, but as a user
 * of Liveblocks, NEVER USE THIS DIRECTLY, because bad things
 * will probably happen if you do.
 */
export function useSharedContextBundle() {
  const bundle = useContext(ContextBundle);
  if (bundle === null) {
    throw new Error(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
  return bundle;
}

/**
 * @private
 *
 * This shared context is meant to be used both within the global
 * `LiveblocksContext` and the room-based `RoomContext`.
 *
 * It can be used to offer APIs that are accessible from both contexts
 * without requiring both contexts' providers to be present.
 */
export function createSharedContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(client: Client): SharedContextBundle<TUserMeta> {
  function SharedProvider(props: PropsWithChildren) {
    return (
      <ContextBundle.Provider
        value={bundle as unknown as SharedContextBundle<BaseUserMeta>}
      >
        {props.children}
      </ContextBundle.Provider>
    );
  }

  const usersStore = client[kInternal].usersStore;

  function useUser(userId: string): UserState<TUserMeta["info"]> {
    const getUserState = useCallback(
      () => usersStore.getState(userId),
      [userId]
    );

    useEffect(() => {
      void usersStore.get(userId);
    }, [userId]);

    const state = useSyncExternalStore(
      usersStore.subscribe,
      getUserState,
      getUserState
    );

    return state
      ? ({
          ...state,
          user: state.data,
        } as UserState<TUserMeta["info"]>)
      : { isLoading: true };
  }

  function useUserSuspense(userId: string) {
    const getUserState = useCallback(
      () => usersStore.getState(userId),
      [userId]
    );
    const userState = getUserState();

    if (!userState || userState.isLoading) {
      throw usersStore.get(userId);
    }

    if (userState.error) {
      throw userState.error;
    }

    const state = useSyncExternalStore(
      usersStore.subscribe,
      getUserState,
      getUserState
    );

    return {
      ...state,
      user: state?.data,
    } as UserStateSuccess<TUserMeta["info"]>;
  }

  const bundle: SharedContextBundle<TUserMeta> = {
    SharedProvider,

    useUser,

    suspense: {
      SharedProvider,

      useUser: useUserSuspense,
    },
  };

  return bundle;
}
