"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
const useExampleRoomId = (roomId: string) => {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${roomId}-${exampleId}` : roomId;
};

export function Room({ children }: { children: React.ReactNode }) {
  const roomId = useExampleRoomId(
    "liveblocks:notifications-settings-examples:nextjs"
  );

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      {children}
    </RoomProvider>
  );
}
