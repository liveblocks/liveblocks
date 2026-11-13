"use client";

import { useSearchParams } from "next/navigation";
import { getExampleRoomId } from "@/lib/example";

/**
 * Returns the project room id, or a post room id when `postId` is passed.
 * When deploying on liveblocks.io, the `exampleId` query param isolates each
 * gallery session in its own set of rooms. You can ignore it locally.
 */
export function useExampleRoomId(postId?: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId") ?? null;
  return getExampleRoomId(exampleId, postId);
}

/**
 * Builds an in-app link that keeps the gallery query params (`exampleId`,
 * `examplePreview`) so navigating between the calendar and a post stays in
 * the same isolated session.
 */
export function useExampleHref(pathname: string) {
  const params = useSearchParams();
  const search = params?.toString();
  return search ? `${pathname}?${search}` : pathname;
}
