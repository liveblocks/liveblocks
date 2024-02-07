"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, ThreadMetadata, useThreads } from "../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example({ roomUrl }: { roomUrl: string }) {
  const { threads } = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer<ThreadMetadata>
        className="composer"
        // Add link to the room for email notifications
        metadata={{ url: roomUrl }}
      />
    </main>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments-emails");

  // The URL of this page in your app. We're using this in email notification links.
  const roomUrl = `http://example.com?roomId=${roomId}`;

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Example roomUrl={roomUrl} />}
        </ClientSideSuspense>
      </ErrorBoundary>
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
