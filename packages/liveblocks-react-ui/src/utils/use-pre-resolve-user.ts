import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useCallback } from "react";

/**
 * Returns a function that resolves a user ID ahead of time to
 * make subsequent calls to `useUser` cached. This is useful for
 * known scenarios like resolving the current user's info
 * before they post a comment.
 *
 * This function is a no-op if the user ID is already resolved.
 */
export function usePreResolveUser() {
  const client = useClient();

  return useCallback(
    (userId: string) => {
      void client[kInternal].usersStore.enqueue(userId);
    },
    [client]
  );
}
