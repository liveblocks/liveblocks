"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { FloatingThread, FloatingComposer } from "@liveblocks/react-ui";
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

  return (
    <main className="flex flex-col gap-4 py-10 px-4 mx-auto max-w-[800px]">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        ← Back to home
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Task Tracker
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Click any cell to add or view a comment
      </p>
      <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <thead>
          <tr>
            <th className="p-3.5 px-4 bg-gray-50 dark:bg-gray-800 font-semibold text-[11px] uppercase tracking-wider text-gray-500 text-left border-b border-gray-200 dark:border-gray-700">
              Task
            </th>
            <th className="p-3.5 px-4 bg-gray-50 dark:bg-gray-800 font-semibold text-[11px] uppercase tracking-wider text-gray-500 text-left border-b border-gray-200 dark:border-gray-700">
              Status
            </th>
            <th className="p-3.5 px-4 bg-gray-50 dark:bg-gray-800 font-semibold text-[11px] uppercase tracking-wider text-gray-500 text-left border-b border-gray-200 dark:border-gray-700">
              Priority
            </th>
          </tr>
        </thead>
        <tbody>
          {TABLE_DATA.map((row) => (
            <tr
              key={row.id}
              className="dark:hover:bg-gray-700 last:[&>td]:border-b-0"
            >
              {COLUMNS.map((col) => {
                const cellId = `${row.id}-${col}`;
                const thread = threads.find(
                  (thread) => thread.metadata.cellId === cellId
                );

                return (
                  <td
                    key={cellId}
                    className="relative p-0 text-left border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-2 py-3 px-4">
                      <span className="flex-1 min-w-0">{row[col]}</span>

                      {thread ? (
                        <FloatingThread thread={thread}>
                          <button
                            className="flex items-center justify-center flex-shrink-0 w-7 h-7 border-0 rounded-md cursor-pointer text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-150"
                            data-has-thread=""
                          >
                            💬
                          </button>
                        </FloatingThread>
                      ) : (
                        <FloatingComposer metadata={{ cellId }}>
                          <button className="flex items-center justify-center flex-shrink-0 w-7 h-7 border-0 rounded-md cursor-pointer text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-150">
                            ＋
                          </button>
                        </FloatingComposer>
                      )}
                    </div>
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
          <div className="absolute inset-0 w-screen h-screen flex place-content-center place-items-center text-gray-900 dark:text-white">
            There was an error while getting threads.
          </div>
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
