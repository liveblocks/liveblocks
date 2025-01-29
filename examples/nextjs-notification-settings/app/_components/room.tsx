"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "@/hooks/use-example-id";

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
