"use client";

import { LiveMap } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { CanvasShell } from "./CanvasShell";
import { getRoomId } from "@/lib/room";

export function FileRoom({
  fileId,
  readonly,
}: {
  fileId: string;
  readonly: boolean;
}) {
  const roomId = getRoomId(fileId);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: [],
        isAgent: false,
        agentStatus: "idle",
      }}
      initialStorage={{
        records: new LiveMap(),
      }}
    >
      <ClientSideSuspense
        fallback={
          <div className="h-screen w-screen grid place-items-center text-sm text-neutral-500">
            Loading canvas…
          </div>
        }
      >
        <CanvasShell fileId={fileId} roomId={roomId} readonly={readonly} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
