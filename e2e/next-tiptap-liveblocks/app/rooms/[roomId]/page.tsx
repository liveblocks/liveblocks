"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import { use } from "react";

import { TiptapLiveblocksEditor } from "./tiptap-liveblocks-editor";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{}}
    >
      <ClientSideSuspense fallback={<div>Loading room...</div>}>
        <TiptapLiveblocksEditor roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
