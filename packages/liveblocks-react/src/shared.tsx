import { type BaseUserMeta, type Client, kInternal } from "@liveblocks/core";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SharedContextBundle, UserState } from "./types";

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

  const resolveUser = client[kInternal].resolveUser;

  // The `resolveUser` function is already batched, cached, and deduped
  // so we don't need to think about that at the hook level.
  function useUser(userId: string) {
    const [state, setState] = useState<UserState<TUserMeta["info"]>>({
      isLoading: true,
    });

    useEffect(() => {
      const getUser = async () => {
        setState({ isLoading: true });

        if (resolveUser) {
          try {
            const user = await resolveUser(userId);

            setState({ isLoading: false, user });
          } catch (error) {
            setState({ isLoading: false, error: error as Error });
          }
        } else {
          setState({ isLoading: false, user: undefined });
        }
      };

      void getUser();
    }, [userId]);

    return state;
  }

  // The `resolveUser` function is already batched, cached, and deduped
  // so we don't need to think about that at the hook level.
  function useUserSuspense(userId: string) {
    const [state, setState] = useState<UserState<TUserMeta["info"]>>({
      isLoading: true,
    });
    const promiseRef = useRef<Promise<void>>();

    useEffect(() => {
      const getUser = async () => {
        setState({ isLoading: true });

        if (resolveUser) {
          try {
            const user = await resolveUser(userId);

            setState({ isLoading: false, user });
          } catch (error) {
            setState({ isLoading: false, error: error as Error });
          }
        } else {
          setState({ isLoading: false, user: undefined });
        }
      };

      promiseRef.current = getUser();
    }, [userId]);

    if (state.isLoading) {
      throw promiseRef.current ?? new Promise(() => {});
    }

    if (state.error) {
      throw state.error;
    }

    return state;
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
