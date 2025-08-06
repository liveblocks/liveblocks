"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { ClientSideSuspense } from "@liveblocks/react";
import { DocumentSpinner } from "@/components/Spinner";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments-tiptap");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<DocumentSpinner />}>
        {children}
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
  const customRoomId = params?.get("roomId");

  const exampleRoomId = useMemo(() => {
    if (customRoomId) {
      return `liveblocks:examples:${customRoomId}`;
    }
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId, customRoomId]);

  return exampleRoomId;
}
