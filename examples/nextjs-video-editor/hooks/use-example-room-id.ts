"use client";

import { useSearchParams } from "next/navigation";
import { getExampleRoomId } from "@/lib/example";

/**
 * Returns the project's room id. When deploying on liveblocks.io, the
 * `exampleId` query param isolates each gallery session in its own room. You
 * can ignore it locally.
 */
export function useExampleRoomId() {
  const params = useSearchParams();
  return getExampleRoomId(params?.get("exampleId") ?? null);
}
