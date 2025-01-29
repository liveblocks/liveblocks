"use client";

import { useSearchParams } from "next/navigation";

const BASE_ROOM_ID = "liveblocks:notifications-settings-examples:nextjs";

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
export const useExampleRoomId = () => {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${BASE_ROOM_ID}-${exampleId}` : BASE_ROOM_ID;
};
