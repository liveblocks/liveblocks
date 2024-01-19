import { type BaseUserMeta, type Client, kInternal } from "@liveblocks/core";
import { useCallback, useContext, useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import { ContextBundle as LiveblocksContextBundle } from "./liveblocks";
import { ContextBundle as RoomContextBundle } from "./room";
import type { SharedContextBundle, UserState, UserStateSuccess } from "./types";

/**
 * @private
 *
 * This is an internal API, use `createLiveblocksContext` or `createRoomContext` instead.
 */
export function useSharedContextBundle<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(): SharedContextBundle<TUserMeta> {
  const liveblocksContextBundle = useContext(LiveblocksContextBundle);
  const roomContextBundle = useContext(RoomContextBundle);

  if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle;
  } else if (roomContextBundle !== null) {
    return roomContextBundle;
  } else {
    throw new Error(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
}

export function createSharedContext<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(client: Client): SharedContextBundle<TUserMeta> {
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
    useUser,

    suspense: {
      useUser: useUserSuspense,
    },
  };

  return bundle;
}
