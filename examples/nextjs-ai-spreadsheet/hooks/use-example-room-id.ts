"use client";

import { useSearchParams } from "next/navigation";

const BASE_ROOM_ID = "liveblocks:examples:nextjs-ai-spreadsheet";

/**
 * This hook is used when deploying an example on liveblocks.io, where multiple
 * isolated rooms are created from a single example using an `exampleId`.
 * You can ignore it completely if you run the example locally.
 */
export function useExampleRoomId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${BASE_ROOM_ID}-${exampleId}` : BASE_ROOM_ID;
}
