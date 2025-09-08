"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { createExampleRoomId, createExampleUserId } from "./example";

export function useExampleUserId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  const examplePreview = params?.get("examplePreview");
  const userId = useMemo(() => {
    return createExampleUserId(Number(examplePreview), exampleId);
  }, [exampleId, examplePreview]);

  return userId;
}

export function useExampleRoomId(room: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  const roomId = useMemo(() => createExampleRoomId(room), [room]);
  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
