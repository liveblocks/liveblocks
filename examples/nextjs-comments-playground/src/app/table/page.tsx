"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { FloatingThread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

const TABLE_DATA = [
  { id: "1", task: "Design homepage", status: "Done", priority: "High" },
  { id: "2", task: "Build API", status: "In Progress", priority: "High" },
  { id: "3", task: "Write tests", status: "Todo", priority: "Medium" },
  { id: "4", task: "Deploy to prod", status: "Todo", priority: "Low" },
];

const COLUMNS = ["task", "status", "priority"] as const;

function Example() {
  const { threads } = useThreads();
  const threadByCell = useMemo(() => {
    const map = new Map<string, (typeof threads)[0]>();
    for (const thread of threads) {
      const cellId = thread.metadata.cellId;
      if (cellId && !map.has(cellId)) {
        map.set(cellId, thread);
      }
    }
    return map;
  }, [threads]);

  return (
    <main>
      <h1>Task Tracker</h1>
      <p className="hint">Click any cell to add or view a comment</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_DATA.map((row) => (
            <tr key={row.id}>
              {COLUMNS.map((col) => {
                const cellId = `${row.id}-${col}`;
                const thread = threadByCell.get(cellId);

                return (
                  <td key={cellId} className="table-cell">
                    <span className="cell-content">{row[col]}</span>

                    <FloatingThread
                      thread={thread}
                      metadata={{ cellId }}
                      autoFocus
                    >
                      <button className="thread-indicator">
                        {thread ? "💬" : "➕"}
                      </button>
                    </FloatingThread>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-playground-table"
  );

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
