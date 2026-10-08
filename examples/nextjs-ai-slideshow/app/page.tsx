"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Loader } from "@/components/ai-elements/loader";
import { useExampleRoomId } from "@/lib/use-example-room-id";
import { SlideshowApp } from "@/views/slideshow-app";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        promptingFeedId: null,
        cursor: null,
        cursorSlideId: null,
        selection: null,
      }}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        }
      >
        <SlideshowApp roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
