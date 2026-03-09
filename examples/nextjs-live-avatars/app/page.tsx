"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react";
import { AvatarStack } from "@liveblocks/react-ui";

function Example() {
  return (
    <main
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <AvatarStack max={5} size="48px" />
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-live-avatars");

  return (
    <RoomProvider id={roomId}>
      <Example />
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const searchParams = useSearchParams();
  const exampleId = searchParams?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
