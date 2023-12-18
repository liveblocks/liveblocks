"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { useSearchParams } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useOverrideRoomId("nextjs-comments-video");

  return (
    <Tooltip.Provider delayDuration={0}>
      <RoomProvider
        id={roomId}
        initialPresence={{
          state: "paused",
          time: 0,
        }}
      >
        {children}
      </RoomProvider>
    </Tooltip.Provider>
  );
}

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
