"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import {
  FloatingThread,
  FloatingComposer,
  CommentPin,
} from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

function Canvas() {
  const { threads } = useThreads();
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  return (
    <main className="flex flex-col gap-4 py-10 px-4 mx-auto max-w-[1200px]">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        ← Back to home
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Design Review
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Click anywhere to leave a comment
      </p>

      <div
        className="relative h-[500px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-crosshair shadow-sm"
        onClick={(e) => {
          if ((e.target as Element).closest("[data-pin]")) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setNewPin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setOpenThreadId(null);
        }}
      >
        {threads.map((thread) => (
          <FloatingThread
            key={thread.id}
            thread={thread}
            open={openThreadId === thread.id}
            onOpenChange={(open: boolean) =>
              setOpenThreadId(open ? thread.id : null)
            }
          >
            <CommentPin
              data-pin
              userId={thread.comments[0]?.userId}
              style={{
                position: "absolute",
                left: thread.metadata.x!,
                top: thread.metadata.y!,
              }}
            />
          </FloatingThread>
        ))}

        {newPin && (
          <FloatingComposer
            metadata={{ x: newPin.x, y: newPin.y }}
            open
            onOpenChange={(open: boolean) => !open && setNewPin(null)}
            onComposerSubmit={() => setNewPin(null)}
            autoFocus
          >
            <CommentPin
              data-pin
              style={{
                position: "absolute",
                left: newPin.x,
                top: newPin.y,
              }}
            />
          </FloatingComposer>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-playground-canvas"
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
          <Canvas />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
