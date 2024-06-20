"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { CustomNotifications } from "../components/CustomNotifications";
import { authWithExampleId } from "../example";

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-notifications-custom"
  );

  return (
    <LiveblocksProvider
      authEndpoint={authWithExampleId("/api/liveblocks-auth")}
      resolveUsers={async ({ userIds }) => {
        // Get users' info from their ID
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving user");
        }

        const users = await response.json();
        return users;
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        // Get rooms' info from their ID
        const searchParams = new URLSearchParams(
          roomIds.map((roomId) => ["roomIds", roomId])
        );
        const response = await fetch(`/api/rooms?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving room");
        }

        const rooms = await response.json();
        return rooms;
      }}
    >
      <RoomProvider id={roomId}>
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
