"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { useSearchParams } from "next/navigation";
import { ClientSideSuspense } from "@liveblocks/react";
import { Loading } from "@/components/Loading";
import { TextCollaborationProvider } from "@liveblocks/react-lexical";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-lexical");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <TextCollaborationProvider>{children}</TextCollaborationProvider>}
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
