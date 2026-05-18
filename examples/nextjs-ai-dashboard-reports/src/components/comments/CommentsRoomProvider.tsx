"use client";

import { COMMENTS_ROOM_ID_BASE } from "@/lib/comments/constants";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import React from "react";

export function CommentsRoomProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const roomId = useExampleRoomId(COMMENTS_ROOM_ID_BASE);
  return <RoomProvider id={roomId}>{children}</RoomProvider>;
}

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  return React.useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);
}
