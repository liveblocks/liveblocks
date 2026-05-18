"use client";

import { COMMENTS_ROOM_ID_BASE } from "@/lib/comments/constants";
import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function CommentsRoomProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const roomId = useExampleRoomId(COMMENTS_ROOM_ID_BASE);
  return <RoomProvider id={roomId}>{children}</RoomProvider>;
}

// Everything below is just used to deploy the example on liveblocks.io
function useExampleRoomId(baseRoomId: string) {
  const params = useSearchParams();
  const exampleIdFromUrl = params?.get("exampleId");

  const [exampleId, setExampleId] = useState<string | null>(() =>
    getStoredExampleRoomId()
  );

  useEffect(() => {
    if (exampleIdFromUrl) {
      setStoredExampleRoomId(exampleIdFromUrl);
      setExampleId(exampleIdFromUrl);
      return;
    }

    setExampleId(getStoredExampleRoomId());
  }, [exampleIdFromUrl]);

  return useMemo(
    () => resolveCommentsRoomId(baseRoomId, exampleId),
    [baseRoomId, exampleId]
  );
}

const STORAGE_KEY = "liveblocks-dashboard-example-room-id";

export function getStoredExampleRoomId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredExampleRoomId(exampleId: string) {
  localStorage.setItem(STORAGE_KEY, exampleId);
}

export function resolveCommentsRoomId(
  baseRoomId: string,
  exampleId: string | null
): string {
  return exampleId ? `${baseRoomId}-${exampleId}` : baseRoomId;
}
