"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { ClientSideSuspense } from "@liveblocks/react";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("nextjs-connection-status");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <main>
        <ClientSideSuspense fallback={<Loading />}>
          {children}
        </ClientSideSuspense>
      </main>
    </RoomProvider>
  );
}

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
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
