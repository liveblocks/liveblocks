"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense, useSearchComments } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads, and a search bar.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      <CommentsSearch />
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </main>
  );
}

function CommentsSearch() {
  const [text, setText] = useState("");
  const { results, isLoading, error } = useSearchComments({ query: { text } });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="search-results lb-root">
      <input
        type="search"
        className="search-input"
        placeholder="Search comments…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.length ? (
        <>
          {isLoading ? (
            <div className="search-message">Searching…</div>
          ) : results.length > 0 ? (
            <div>
              <div className="search-results-title">Search results</div>
              {results.map((result) => (
                <a
                  key={result.commentId}
                  href={"#" + result.commentId}
                  className="search-result"
                >
                  {result.content}
                </a>
              ))}
            </div>
          ) : (
            <div className="search-message">No results found</div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments-search");

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
