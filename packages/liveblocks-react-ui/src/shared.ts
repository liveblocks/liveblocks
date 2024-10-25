import type { OpaqueClient } from "@liveblocks/core";
import { kInternal, raise } from "@liveblocks/core";
import { ClientContext, RoomContext, useSelf } from "@liveblocks/react";
import { useContext } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

function useCurrentUserIdFromRoom() {
  return useSelf((user) => (typeof user.id === "string" ? user.id : null));
}

function useCurrentUserIdFromClient_withClient(client: OpaqueClient) {
  const currentUserIdStore = client[kInternal].currentUserIdStore;
  return useSyncExternalStore(
    currentUserIdStore.subscribe,
    currentUserIdStore.get,
    currentUserIdStore.get
  );
}

export function useCurrentUserId(): string | null {
  const client = useContext(ClientContext);
  const room = useContext(RoomContext);

  // NOTE: These hooks are called conditionally, but in a way that will not
  // take different code paths between re-renders, so we can ignore the
  // rules-of-hooks lint warning here.
  /* eslint-disable react-hooks/rules-of-hooks */
  if (room !== null) {
    return useCurrentUserIdFromRoom();
  } else if (client !== null) {
    return useCurrentUserIdFromClient_withClient(client);
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
  /* eslint-enable react-hooks/rules-of-hooks */
}
