"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Chat } from "./Chat";
import { Loader } from "@/components/ai-elements/loader";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider id={roomId} initialPresence={{ promptingFeedId: null }}>
      <ClientSideSuspense
        fallback={
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        }
      >
        <Chat roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
