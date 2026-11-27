"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "@/components/loading";
import { PodcastEditor } from "@/components/podcast-editor";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { createInitialStorage } from "@/lib/storage";

/**
 * One room per episode. Everyone editing the episode joins it: Storage holds
 * the edit, Presence holds each person's playhead and selection, and the
 * room's threads are the episode's comments.
 */
export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ playhead: 0, playing: false, selection: null }}
      initialStorage={createInitialStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <PodcastEditor />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
