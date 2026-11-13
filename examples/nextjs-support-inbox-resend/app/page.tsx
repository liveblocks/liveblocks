"use client";

import { useState } from "react";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { SupportInbox } from "@/components/support-inbox";
import { InboxSkeleton } from "@/components/skeletons";
import {
  DEFAULT_WORKSPACE_ID,
  getWorkspace,
  type WorkspaceId,
} from "@/lib/workspaces";

export default function Page() {
  const [workspaceId, setWorkspaceId] =
    useState<WorkspaceId>(DEFAULT_WORKSPACE_ID);
  // One Liveblocks room per shared inbox; switching workspace switches room.
  const roomId = useExampleRoomId(workspaceId);

  return (
    <RoomProvider
      key={roomId}
      id={roomId}
      initialPresence={{ viewingFeedId: null }}
    >
      <ClientSideSuspense fallback={<InboxSkeleton />}>
        <SupportInbox
          roomId={roomId}
          workspace={getWorkspace(workspaceId)}
          onWorkspaceChange={setWorkspaceId}
        />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
