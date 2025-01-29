"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "@/hooks/use-example-room-id";

export function Room({ children }: { children: React.ReactNode }) {
  const roomId = useExampleRoomId();
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
