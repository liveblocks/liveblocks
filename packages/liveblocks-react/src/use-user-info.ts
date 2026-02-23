import {
  type BaseUserMeta,
  type DU,
  kInternal,
  type Room,
} from "@liveblocks/core";
import { useEffect, useState } from "react";

import { useClient, useRoomOrNull } from "./contexts";
import { selectorFor_useUser } from "./liveblocks";
import type { UserAsyncResult } from "./types";

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function getPresenceUserInfo<U extends BaseUserMeta>(
  room: Room<any, any, U>,
  userId: string
): U["info"] | undefined {
  const self = room.getSelf();

  if (self?.id === userId) {
    return self.info;
  }

  return room.getOthers().find((u) => u.id === userId)?.info;
}

/**
 * @private This is a private API. Do not rely on it.
 *
 * A hook that returns user info either from Presence or using `resolveUsers`.
 * It can be used like `useUser` but for scenarios where `resolveUsers` might
 * not be used (e.g. for Presence-based components like avatars or cursors).
 */
export function useUserInfo<U extends BaseUserMeta = DU>(
  userId: string
): UserAsyncResult<U["info"]> {
  const client = useClient();
  const room = useRoomOrNull();
  const [result, setResult] = useState<UserAsyncResult<U["info"]>>({
    isLoading: true,
  });

  useEffect(() => {
    const usersStore = client[kInternal].usersStore;
    const abortController = new AbortController();

    void (async () => {
      try {
        setResult({ isLoading: true });

        if (room) {
          await room.waitUntilPresenceReady();
          throwIfAborted(abortController.signal);

          const presenceUserInfo = getPresenceUserInfo(room, userId);
          if (presenceUserInfo !== undefined) {
            setResult({ isLoading: false, user: presenceUserInfo });
            return;
          }
        }

        await usersStore.enqueue(userId);
        throwIfAborted(abortController.signal);

        setResult(
          selectorFor_useUser<U>(usersStore.getItemState(userId), userId)
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        throw err;
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [client, room, userId]);

  return result;
}
