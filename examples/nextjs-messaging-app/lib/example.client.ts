"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { createExampleRoomId } from "./example";

export function useExampleRoomId(workspaceId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return useMemo(() => {
    const roomId = createExampleRoomId(workspaceId);
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [workspaceId, exampleId]);
}

export function useExamplePreviewIndex() {
  const params = useSearchParams();
  const examplePreview = params?.get("examplePreview");
  return useMemo(() => {
    const index = Number(examplePreview);
    return examplePreview !== null && Number.isInteger(index) ? index : null;
  }, [examplePreview]);
}
