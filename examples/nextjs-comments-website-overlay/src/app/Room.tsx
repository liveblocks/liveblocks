"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { useSearchParams } from "next/navigation";

type Props = { children: ReactNode };

export function Room({ children }: Props) {
  const roomId = useOverrideRoomId("nextjs-comments-website-overlay");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, editingText: null }}
    >
      {children}
    </RoomProvider>
  );

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function useOverrideRoomId(roomId: string) {
    const params = useSearchParams();
    const roomIdParam = params.get("roomId");

    const overrideRoomId = useMemo(() => {
      return roomIdParam ? `${roomId}-${roomIdParam}` : roomId;
    }, [roomId, roomIdParam]);

    return overrideRoomId;
  }
}
