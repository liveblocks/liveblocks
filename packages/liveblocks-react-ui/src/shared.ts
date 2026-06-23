import type { PermissionResources, ThreadVisibility } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { createContext, useContext } from "react";

export function useCurrentUserId(): string | null {
  const client = useClient();
  return useSignal(client[kInternal].currentUserId) ?? null;
}

export const ThreadVisibilityContext = createContext<
  ThreadVisibility | undefined
>(undefined);

export function useThreadVisibility(): ThreadVisibility | undefined {
  return useContext(ThreadVisibilityContext);
}

export function getCommentsPermissionResource(
  visibility: ThreadVisibility
): PermissionResources {
  return visibility === "private" ? "comments:private" : "comments:public";
}
