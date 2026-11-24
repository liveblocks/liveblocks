"use client";

import { useSearchParams } from "next/navigation";
import { roomIdForWorkspace, type WorkspaceId } from "@/lib/workspaces";

/**
 * Room id for a workspace. On liveblocks.io, multiple isolated rooms are
 * created from a single example using an `exampleId` search param; you can
 * ignore that part if you run the example locally.
 */
export function useExampleRoomId(workspaceId: WorkspaceId) {
  const params = useSearchParams();
  return roomIdForWorkspace(workspaceId, params?.get("exampleId"));
}
