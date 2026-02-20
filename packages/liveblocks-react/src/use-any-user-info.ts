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

function waitUntilConnected(room: Room, signal: AbortSignal): Promise<void> {
  if (room.getSelf() !== null || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = room.events.self.subscribe(() => {
      if (room.getSelf() !== null || signal.aborted) {
        unsubscribe();
        resolve();
      }
    });

    signal.addEventListener(
      "abort",
      () => {
        unsubscribe();
        resolve();
      },
      { once: true }
    );
  });
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
 * A hook that returns user info either from Presence or using `resolveUsers`.
 * It can be used like `useUser` but for scenarios where `resolveUsers` might
 * not be used (e.g. for Presence-based components like avatars or cursors).
 */
export function useAnyUserInfo<U extends BaseUserMeta = DU>(
  userId: string
): UserAsyncResult<U["info"]> {
  const client = useClient();
  const room = useRoomOrNull();
  const [result, setResult] = useState<UserAsyncResult<U["info"]>>({
    isLoading: true,
  });

  useEffect(() => {
    const usersStore = client[kInternal].usersStore;
    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        setResult({ isLoading: true });

        if (room) {
          await waitUntilConnected(room, signal);
          throwIfAborted(signal);

          const presenceUserInfo = getPresenceUserInfo(room, userId);
          if (presenceUserInfo !== undefined) {
            setResult({ isLoading: false, user: presenceUserInfo });
            return;
          }
        }

        await usersStore.enqueue(userId);
        throwIfAborted(signal);

        setResult(
          selectorFor_useUser<U>(usersStore.getItemState(userId), userId)
        );
      } catch (err) {
        // Ignore `AbortSignal` errors
        if ((err as Error).name === "AbortError") {
          return;
        }

        throw err;
      }
    })();

    return () => {
      controller.abort();
    };
  }, [client, room, userId]);

  return result;
}
