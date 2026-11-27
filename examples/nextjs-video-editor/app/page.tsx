"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { EditorSkeleton } from "@/components/editor-skeleton";
import { VideoEditor } from "@/components/video-editor";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { PlaybackProvider } from "@/hooks/use-playback";
import { createInitialStorage } from "@/lib/project";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        playhead: 0,
        playing: false,
        selectedClipIds: [],
        cursor: null,
      }}
      initialStorage={createInitialStorage}
    >
      <PlaybackProvider>
        <ClientSideSuspense fallback={<EditorSkeleton />}>
          <VideoEditor />
        </ClientSideSuspense>
      </PlaybackProvider>
    </RoomProvider>
  );
}
