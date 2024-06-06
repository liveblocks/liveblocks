"use client";

import { ReactNode, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "@/components/Loading";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("liveblocks:lexical-examples:nextjs");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <>{children}</>}
      </ClientSideSuspense>
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
