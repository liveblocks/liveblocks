"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  return (
    <main>
      <div style={{ color: "white" }}>RESOLVED</div>
      <ResolveThreads />
      <div style={{ color: "white" }}>NOT RESOLVED</div>
      <UnresolvedThreads />
      <div style={{ color: "white" }}>ALL THREADS</div>
      <AllThreads />
      <Composer className="composer" />
    </main>
  );
}

function AllThreads() {
  const { threads } = useThreads();
  return (
    <>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
    </>
  );
}

function ResolveThreads() {
  const { threads } = useThreads({
    query: { metadata: { resolved: true } },
  });
  return (
    <>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
    </>
  );
}

function UnresolvedThreads() {
  const { threads } = useThreads({
    query: { metadata: { resolved: false } },
  });
  return (
    <>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
    </>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Example />}
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
