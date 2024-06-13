"use client";

import { ReactNode, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments-video");

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
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
