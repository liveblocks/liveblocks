"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { useSearchParams } from "next/navigation";
import { ReactNode, useMemo } from "react";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-project-manager-3554"
  );

  return (
    <RoomProvider
      id={roomId}
      initialStorage={{
        meta: new LiveObject({ title: "Untitled issue" }),
        properties: new LiveObject({
          progress: null,
          priority: null,
          assignedTo: null,
        }),
        labels: new LiveList([]),
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

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
