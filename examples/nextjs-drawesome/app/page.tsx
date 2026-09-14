"use client";

import { LiveList } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { CollaborativeDraw } from "@/components/collaborative-draw";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import Loading from "./loading";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint="/api/liveblocks-auth"
      // Optional: used when running against the local Liveblocks dev server.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        return await response.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, draft: null }}
        initialStorage={{ strokes: new LiveList([]) }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <CollaborativeDraw />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
