import {
  kInternal,
  type PermissionResources,
  type ThreadVisibility,
} from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";

export function useCurrentUserId(): string | null {
  const client = useClient();
  return useSignal(client[kInternal].currentUserId) ?? null;
}

export function commentsResourceForVisibility(
  visibility: ThreadVisibility | undefined
): PermissionResources {
  if (visibility === "private") {
    return "comments:private";
  }

  if (visibility === "public") {
    return "comments:public";
  }

  return "comments";
}
