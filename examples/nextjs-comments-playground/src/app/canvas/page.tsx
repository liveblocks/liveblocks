"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { FloatingThread, FloatingComposer } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

function Canvas() {
  const { threads } = useThreads();
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const prevThreadIdsRef = useRef<Set<string>>(new Set());

  // When a new thread appears matching pending coordinates, open it
  useEffect(() => {
    if (!pendingPin) return;

    const currentIds = new Set(threads.map((t) => t.id));
    const newThreads = threads.filter(
      (t) => !prevThreadIdsRef.current.has(t.id)
    );

    // Find a new thread that matches our pending pin coordinates
    const matchingThread = newThreads.find(
      (t) => t.metadata.x === pendingPin.x && t.metadata.y === pendingPin.y
    );

    if (matchingThread) {
      setOpenThreadId(matchingThread.id);
      setPendingPin(null);
    }

    prevThreadIdsRef.current = currentIds;
  }, [threads, pendingPin]);

  // Keep track of thread IDs even when not waiting for a pending pin
  useEffect(() => {
    prevThreadIdsRef.current = new Set(threads.map((t) => t.id));
  }, [threads]);

  return (
    <main className="canvas-page">
      <h1>Design Review</h1>
      <p className="hint">Click anywhere to leave a comment</p>

      <div
        className="canvas"
        onClick={(e) => {
          if ((e.target as Element).closest(".pin")) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setNewPin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setOpenThreadId(null);
        }}
      >
        {/* Existing threads */}
        {threads.map((thread) => (
          <FloatingThread
            key={thread.id}
            thread={thread}
            open={openThreadId === thread.id}
            onOpenChange={(open: boolean) =>
              setOpenThreadId(open ? thread.id : null)
            }
          >
            <div
              className="pin"
              style={{
                position: "absolute",
                left: thread.metadata.x! - 10,
                top: thread.metadata.y! - 20,
              }}
            />
          </FloatingThread>
        ))}

        {/* New composer */}
        {newPin && (
          <FloatingComposer
            metadata={{ x: newPin.x, y: newPin.y }}
            open
            onOpenChange={(open: boolean) => !open && setNewPin(null)}
            onComposerSubmit={() => {
              // Store coordinates to match the new thread when it appears
              setPendingPin({ x: newPin.x, y: newPin.y });
              setNewPin(null);
            }}
            autoFocus
          >
            <div
              className="pin"
              data-pending=""
              style={{
                position: "absolute",
                left: newPin.x - 10,
                top: newPin.y - 20,
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
          <div className="error">There was an error while getting threads.</div>
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
