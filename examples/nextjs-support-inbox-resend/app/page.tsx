"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { SupportInbox } from "@/components/support-inbox";
import { InboxSkeleton } from "@/components/skeletons";

export default function Page() {
  // One Liveblocks room per shared inbox.
  const roomId = useExampleRoomId();

  return (
    <RoomProvider id={roomId} initialPresence={{ viewingFeedId: null }}>
      <ClientSideSuspense fallback={<InboxSkeleton />}>
        <SupportInbox roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
