import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSyncExternalStore } from "react";

export function useCurrentUserId(): string | null {
  const client = useClient();
  const currentUserIdStore = client[kInternal].currentUserIdStore;
  return (
    useSyncExternalStore(
      currentUserIdStore.subscribe,
      currentUserIdStore.get,
      currentUserIdStore.get
    ) ?? null
  );
}
