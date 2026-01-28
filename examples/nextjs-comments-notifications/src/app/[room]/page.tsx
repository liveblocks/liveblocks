"use client";

import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { useExampleRoomId } from "../../example.client";
import { Suspense, use } from "react";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <div className="threads">
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </div>
  );
}

function Room({ room }: { room: string }) {
  const roomId = useExampleRoomId(room);

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Example />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

export default function Page({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params);
  return (
    <Suspense fallback={<Loading />}>
      <Room room={room} />
    </Suspense>
  );
}
