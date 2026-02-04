"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { FloatingThread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { ThreadData } from "@liveblocks/client";

interface CommentPin {
  x: number;
  y: number;
  thread?: ThreadData;
  isActive?: boolean;
}

function Canvas() {
  const { threads } = useThreads();
  const [activePin, setActivePin] = useState<CommentPin | null>(null);

  const activeThread = activePin
    ? threads.find(
        (thread) =>
          thread.metadata.x === activePin.x && thread.metadata.y === activePin.y
      )
    : undefined;
  const pins = [
    ...threads
      .filter((thread) => thread.id !== activeThread?.id)
      .map((thread) => ({
        x: thread.metadata.x!,
        y: thread.metadata.y!,
        thread,
        active: false,
      })),
    ...(activePin
      ? [
          {
            x: activePin.x,
            y: activePin.y,
            thread: activeThread,
            active: true,
          },
        ]
      : []),
  ];

  return (
    <main className="canvas-page">
      <h1>Design Review</h1>
      <p className="hint">Click anywhere to leave a comment</p>

      <div
        className="canvas"
        onClick={(e) => {
          if ((e.target as Element).closest(".pin")) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setActivePin({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
      >
        {pins.map((pin) => (
          <FloatingThread
            key={`${pin.x}-${pin.y}`}
            thread={pin.thread}
            metadata={{ x: pin.x, y: pin.y }}
            open={pin.active ? true : undefined}
            onOpenChange={(open) => !open && pin.active && setActivePin(null)}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              className="pin"
              data-pending={pin.active && !pin.thread ? "" : undefined}
              style={{
                position: "absolute",
                left: pin.x - 10,
                top: pin.y - 20,
              }}
            />
          </FloatingThread>
        ))}
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
