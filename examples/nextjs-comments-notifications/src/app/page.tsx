"use client";

import {
  ClientSideSuspense,
  useUserThreads_experimental,
} from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { useRenderCount } from "../hooks/useRenderCount";

export default function Page() {
  return (
    <ClientSideSuspense fallback={<Loading />}>
      <Threads />
    </ClientSideSuspense>
  );
}

function Threads() {
  const renderCount = useRenderCount();
  const { threads, fetchMore, isFetchingMore, fetchMoreError, hasFetchedAll } =
    useUserThreads_experimental();

  return (
    <div className="threads">
      <h3>Render count: {renderCount}</h3>
      <div>Count: {threads.length}</div>

      {threads.map((thread) => (
        <div
          key={thread.id}
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid #000",
          }}
        >
          <div
            style={{
              fontSize: 12,
              padding: 8,
              borderBottom: "1px solid #000",
            }}
          >
            Room: {thread.roomId}
          </div>

          {thread.comments.map((comment) => {
            return (
              <div
                key={comment.id}
                style={{
                  padding: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                    fontSize: 12,
                    color: "#555",
                  }}
                >
                  <span>{comment.userId}</span>
                  <span>{comment.createdAt.toISOString()}</span>
                </div>

                <pre
                  style={{
                    fontSize: 10,
                  }}
                >
                  {JSON.stringify(comment.body, undefined, 2)}
                </pre>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
