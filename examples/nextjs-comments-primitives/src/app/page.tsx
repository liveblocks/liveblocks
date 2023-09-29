"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  RoomProvider,
  useCreateThread,
  useThreads,
} from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { ClientSideSuspense } from "@liveblocks/react";

/**
 * Displays a list of threads, each allowing comment replies, along
 * with a composer for creating new threads.
 */

function Example() {
  const { threads } = useThreads();
  const createThread = useCreateThread();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="rounded-xl bg-white shadow-md"
        />
      ))}
      <Composer
        onComposerSubmit={({ body }) => {
          createThread({ body });
        }}
        className="rounded-xl bg-white shadow-md"
      />
    </main>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments-primitives");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const params = useSearchParams();
  const roomIdParam = params?.get("roomId");

  const overrideRoomId = useMemo(() => {
    return roomIdParam ? `${roomId}-${roomIdParam}` : roomId;
  }, [roomId, roomIdParam]);

  return overrideRoomId;
}
