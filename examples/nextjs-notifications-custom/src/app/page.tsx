"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LiveblocksProvider, RoomProvider } from "../liveblocks.config";
import { Loading } from "../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { CustomNotifications } from "../components/CustomNotifications";

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-notifications-custom"
  );

  return (
    <LiveblocksProvider>
      <RoomProvider id={roomId} initialPresence={{}}>
        <CustomNotifications />
      </RoomProvider>
    </LiveblocksProvider>
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
