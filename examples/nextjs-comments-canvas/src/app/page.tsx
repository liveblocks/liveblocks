"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { CommentsCanvas } from "../components/CommentsCanvas";
import { ThreadList } from "../components/ThreadList";

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments-canvas");

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <div style={{ width: "100vw", height: "100vh" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 260,
                top: 0,
                bottom: 0,
              }}
            >
              <CommentsCanvas />
            </div>
            <div
              style={{
                width: 260,
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                background: "white",
              }}
            >
              <ThreadList />
            </div>
          </div>
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
