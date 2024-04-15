"use client";

import { RoomProvider, useThreads } from "../../../liveblocks.config";
import { Loading } from "../../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { useExampleRoomId } from "../../hooks";
import { send } from "./send";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <>
      <button onClick={() => send()}>Send custom</button>
      <div className="threads">
        {threads.map((thread) => (
          <Thread key={thread.id} thread={thread} className="thread" />
        ))}
        <Composer className="composer" />
      </div>
    </>
  );
}

function Room({ room }: { room: string }) {
  const roomId = useExampleRoomId(room);

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

export default function Page({ params }: { params: { room: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <Room room={params.room} />
    </Suspense>
  );
}
