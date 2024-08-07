"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-lexical-ai");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
      initialStorage={{
        title: "Untitled document",
        lastModified: new Date().getTime(),
      }}
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
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}
