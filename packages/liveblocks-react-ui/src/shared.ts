import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

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
