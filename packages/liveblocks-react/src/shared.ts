import type { BaseUserMeta, Client } from "@liveblocks/core";
import { kInternal, raise } from "@liveblocks/core";
import { useCallback, useContext, useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import { useLiveblocksContextBundleOrNull } from "./liveblocks";
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
  const liveblocksContextBundle = useLiveblocksContextBundleOrNull();

  if (roomContextBundle !== null) {
    return roomContextBundle;
  } else if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle;
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
}

const missingUserError = new Error(
  "resolveUsers didn't return anything for this user ID."
);
const missingRoomInfoError = new Error(
  "resolveRoomsInfo didn't return anything for this room ID."
);

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
          isLoading: state.isLoading,
          user: state.data,
          // Return an error if `undefined` was returned by `resolveUsers` for this user ID
          error:
            !state.isLoading && !state.data && !state.error
              ? missingUserError
              : state.error,
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

    // Throw an error if `undefined` was returned by `resolveUsers` for this user ID
    if (!userState.data) {
      throw missingUserError;
    }

    const state = useSyncExternalStore(
      usersStore.subscribe,
      getUserState,
      getUserState
    );

    return {
      isLoading: false,
      user: state?.data,
      error: state?.error,
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
          isLoading: state.isLoading,
          info: state.data,
          // Return an error if `undefined` was returned by `resolveRoomsInfo` for this room ID
          error:
            !state.isLoading && !state.data && !state.error
              ? missingRoomInfoError
              : state.error,
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
      throw roomsInfoStore.get(roomId);
    }

    if (roomInfoState.error) {
      throw roomInfoState.error;
    }

    // Throw an error if `undefined` was returned by `resolveRoomsInfo` for this room ID
    if (!roomInfoState.data) {
      throw missingRoomInfoError;
    }

    const state = useSyncExternalStore(
      roomsInfoStore.subscribe,
      getRoomInfoState,
      getRoomInfoState
    );

    return {
      isLoading: false,
      info: state?.data,
      error: state?.error,
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
