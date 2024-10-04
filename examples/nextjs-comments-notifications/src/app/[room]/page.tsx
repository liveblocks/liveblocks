"use client";

import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { useExampleRoomId } from "../../example.client";
import { Suspense } from "react";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads, fetchMore, isFetchingMore, fetchMoreError, hasFetchedAll } =
    useThreads();

  return (
    <div className="threads">
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}

      {fetchMoreError && (
        <div className="error">
          😞 Failed to get more: ${fetchMoreError.message}
        </div>
      )}

      {/* A button to load more threads which is disabled while fetching new threads and hidden when there is nothing more to fetch */}
      {!hasFetchedAll && (
        <button
          onClick={fetchMore}
          disabled={isFetchingMore}
          className="button primary"
        >
          {isFetchingMore ? "…" : "Load more"}
        </button>
      )}

      {hasFetchedAll && (
        <div className="complete">🎉 You're all caught up!</div>
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
