import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useCanComment, useSignal } from "@liveblocks/react/_private";

export function useCurrentUserId(): string | null {
  const client = useClient();
  return useSignal(client[kInternal].currentUserId) ?? null;
}

export { useCanComment };
