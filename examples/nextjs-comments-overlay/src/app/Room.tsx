"use client";

import { PropsWithChildren, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";

export function Room({ children }: PropsWithChildren) {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-overlay"
  );

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, editingText: null }}
    >
      {children}
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
