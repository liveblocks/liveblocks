"use client";

import { useSearchParams } from "next/navigation";
import type { PlanId } from "@/lib/templates";

// The version suffix starts a fresh set of rooms whenever the stored shapes
// or the templates change (templates only apply when a room is first opened).
const BASE_ROOM_ID = "liveblocks:examples:nextjs-interior-design-v1";

/**
 * Room id for a plan: every plan is its own Liveblocks room. On
 * liveblocks.io, multiple isolated sets of rooms are created from a single
 * example using an `exampleId` search param; you can ignore that part if you
 * run the example locally.
 */
export function useExampleRoomId(planId: PlanId) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  const base = exampleId ? `${BASE_ROOM_ID}-${exampleId}` : BASE_ROOM_ID;
  return `${base}:${planId}`;
}
