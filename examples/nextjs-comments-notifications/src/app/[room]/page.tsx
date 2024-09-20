"use client";

import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { useExampleRoomId } from "../../example.client";
import { Suspense, useRef, useState } from "react";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  // TODO: Use actual pagination implementation
  const hasMore = true;
  const [isFetching, setFetching] = useState(false);
  const fetchTimeoutRef = useRef<number | null>(null);
  const fetchMore = () => {
    if (fetchTimeoutRef.current !== null) {
      window.clearTimeout(fetchTimeoutRef.current);
    }

    console.log("Fetching more threads");

    setFetching(true);

    fetchTimeoutRef.current = window.setTimeout(() => {
      setFetching(false);
    }, 2000);
  };

  return (
    <div className="threads">
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      {/* A button to load more threads which is disabled while fetching new threads and hidden when there is nothing more to fetch */}
      {hasMore && (
        <button
          onClick={fetchMore}
          disabled={isFetching}
          className="button primary"
        >
          {isFetching ? "…" : "Load more"}
        </button>
      )}
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

export default function Page({ params }: { params: { room: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <Room room={params.room} />
    </Suspense>
  );
}
