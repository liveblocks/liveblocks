"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ROOM_ID } from "./example";

/**
 * These hooks are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

/**
 * `exampleId` scopes rooms to a single example gallery session, so
 * isolated rooms are created for every visitor on liveblocks.io.
 */
export function useExampleRoomId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return useMemo(
    () => (exampleId ? `${ROOM_ID}-${exampleId}` : ROOM_ID),
    [exampleId]
  );
}

/**
 * `examplePreview` identifies each preview pane in the example gallery,
 * so side-by-side panes are logged in as different demo users.
 * Returns `null` outside the gallery.
 */
export function useExamplePreviewIndex() {
  const params = useSearchParams();
  const examplePreview = params?.get("examplePreview");
  return useMemo(() => {
    const index = Number(examplePreview);
    return examplePreview !== null && Number.isInteger(index) ? index : null;
  }, [examplePreview]);
}
