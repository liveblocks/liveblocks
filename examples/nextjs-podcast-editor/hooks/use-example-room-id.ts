"use client";

import { useSearchParams } from "next/navigation";
import { getExampleRoomId } from "@/lib/example";

/**
 * Returns the episode's room id. When deploying on liveblocks.io, the
 * `exampleId` query param isolates each gallery session in its own room. You
 * can ignore it locally.
 */
export function useExampleRoomId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId") ?? null;
  return getExampleRoomId(exampleId);
}
