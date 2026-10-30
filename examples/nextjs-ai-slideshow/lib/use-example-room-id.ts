"use client";

import { useSearchParams } from "next/navigation";

const BASE_ROOM_ID = "liveblocks:examples:nextjs-ai-slideshow";

export function useExampleRoomId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${BASE_ROOM_ID}-${exampleId}` : BASE_ROOM_ID;
}
