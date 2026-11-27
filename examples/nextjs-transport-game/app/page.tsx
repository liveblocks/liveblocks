"use client";

import { LiveMap } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Loader2 } from "lucide-react";
import { hashString } from "@/game/rng";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Game } from "./game";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, tool: "select", company: null }}
      initialStorage={{
        // Derived from the room id rather than random, so players joining an
        // empty room at the same time all start on the same map
        seed: hashString(roomId),
        startedAt: Date.now(),
        roads: new LiveMap(),
        rails: new LiveMap(),
        stations: new LiveMap(),
        vehicles: new LiveMap(),
        companies: new LiveMap(),
        demolished: new LiveMap(),
      }}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-[#4b90d2] text-white">
            <Loader2 className="size-5 animate-spin" />
          </div>
        }
      >
        <Game />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
