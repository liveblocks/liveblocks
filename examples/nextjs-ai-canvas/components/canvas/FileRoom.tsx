"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { CanvasShell } from "./CanvasShell";
import { getRoomId } from "@/lib/room";

export function FileRoom({
  fileId,
  readonly,
  children,
}: {
  fileId: string;
  readonly: boolean;
  children?: ReactNode;
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
        story: new LiveObject({
          title: "Untitled Story",
        }),
      }}
    >
      <ClientSideSuspense
        fallback={
          <div className="h-screen w-screen grid place-items-center text-sm text-neutral-500">
            Loading canvas…
          </div>
        }
      >
        {children ?? <CanvasShell fileId={fileId} roomId={roomId} readonly={readonly} />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
