"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { getRoomId } from "../config";

export function Room({
  pageId,
  children,
}: {
  pageId: string;
  children: ReactNode;
}) {
  const roomId = useExampleRoomId(getRoomId(pageId));

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
      initialStorage={{
        title: "Untitled document",
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
