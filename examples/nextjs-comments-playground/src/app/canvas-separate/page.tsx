"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { FloatingThread, FloatingComposer } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

function Canvas() {
  const { threads } = useThreads();
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);

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
        }}
      >
        {/* Existing threads */}
        {threads.map((thread) => (
          <FloatingThread key={thread.id} thread={thread}>
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
    "liveblocks:examples:nextjs-comments-playground-canvas-separate"
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
