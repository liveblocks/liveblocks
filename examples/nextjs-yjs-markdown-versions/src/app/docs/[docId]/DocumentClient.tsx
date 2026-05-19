"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";

import { DocumentEditor } from "./DocumentEditor";

export function DocumentClient({
  roomId,
  docId,
  initialTitle,
}: {
  roomId: string;
  docId: string;
  initialTitle: string;
}) {
  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ClientSideSuspense
        fallback={
          <div className="text-text-muted flex flex-1 items-center justify-center text-sm">
            Connecting to {initialTitle}…
          </div>
        }
      >
        <DocumentEditor docId={docId} initialTitle={initialTitle} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
