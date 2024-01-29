import { type BaseUserMeta, type Client, kInternal } from "@liveblocks/core";
import { useCallback, useContext, useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import { ContextBundle as LiveblocksContextBundle } from "./liveblocks";
import { ContextBundle as RoomContextBundle } from "./room";
import type {
  RoomInfoState,
  RoomInfoStateSuccess,
  SharedContextBundle,
  UserState,
  UserStateSuccess,
} from "./types";

/**
 * @private
 *
 * This is an internal API, use `createLiveblocksContext` or `createRoomContext` instead.
 */
export function useSharedContextBundle() {
  const roomContextBundle = useContext(RoomContextBundle);
  const liveblocksContextBundle = useContext(LiveblocksContextBundle);

  if (roomContextBundle !== null) {
    return roomContextBundle;
  } else if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle;
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
  const roomsInfoStore = client[kInternal].roomsInfoStore;

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

  function useRoomInfo(roomId: string): RoomInfoState {
    const getRoomInfoState = useCallback(
      () => roomsInfoStore.getState(roomId),
      [roomId]
    );

    useEffect(() => {
      void roomsInfoStore.get(roomId);
    }, [roomId]);

    const state = useSyncExternalStore(
      roomsInfoStore.subscribe,
      getRoomInfoState,
      getRoomInfoState
    );

    return state
      ? ({
          ...state,
          info: state.data,
        } as RoomInfoState)
      : { isLoading: true };
  }

  function useRoomInfoSuspense(roomId: string) {
    const getRoomInfoState = useCallback(
      () => roomsInfoStore.getState(roomId),
      [roomId]
    );
    const roomInfoState = getRoomInfoState();

    if (!roomInfoState || roomInfoState.isLoading) {
      throw usersStore.get(roomId);
    }

    if (roomInfoState.error) {
      throw roomInfoState.error;
    }

    const state = useSyncExternalStore(
      usersStore.subscribe,
      getRoomInfoState,
      getRoomInfoState
    );

    return {
      ...state,
      info: state?.data,
    } as RoomInfoStateSuccess;
  }

  const bundle: SharedContextBundle<TUserMeta> = {
    useUser,
    useRoomInfo,

    suspense: {
      useUser: useUserSuspense,
      useRoomInfo: useRoomInfoSuspense,
    },
  };

  return bundle;
}
