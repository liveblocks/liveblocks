"use client";

import { ReactNode } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { DocumentSpinner } from "@/components/Spinner";

interface RoomProps {
  children: ReactNode;
  roomId: string;
}

export function Room({ children, roomId }: RoomProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<DocumentSpinner />}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
