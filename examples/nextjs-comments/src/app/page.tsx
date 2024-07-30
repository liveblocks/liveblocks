"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer"/>
    </main>
  );
}

export default function Page() {
  // 10 rooms are created for the example
  const exampleIds = Array.from({ length: 1 }, (_, i) => i + 1);

  return (
    <div>
      {exampleIds.map((exampleId) => (
        <Room key={exampleId} exampleId={exampleId.toString()} />
      ))}
    </div>
  );
}

function Room(props: { roomId?: string; exampleId: string }) {
  // const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments");
  const roomId =
    props.roomId ?? props.exampleId
      ? `liveblocks:examples:nextjs-comments:${props.exampleId}`
      : "liveblocks:examples:nextjs-comments";

  return (    
    <RoomProvider id={roomId} autoConnect={false}>
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

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
