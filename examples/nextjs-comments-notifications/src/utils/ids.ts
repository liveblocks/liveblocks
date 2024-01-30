// This file contains helpers used when deploying an example on liveblocks.io.
// You can ignore it completely if you run the example locally.

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function getUserId(
  userIndex: number,
  roomId: string | null | undefined
) {
  const userId = `user-${userIndex}`;

  return roomId ? `${userId}-${roomId}` : userId;
}

export function getUserIndexFromUserId(userId: string) {
  const [, userIndex] = userId.match(/^user-(\d+)/) ?? [];

  return userIndex === undefined ? undefined : Number(userIndex);
}

export function getRoomIdFromUserId(userId?: string): string | undefined {
  const [, , roomId] = userId?.match(/^user-(\d+)-(.+)$/) ?? [];

  return roomId;
}

export function getDocumentFromRoomId(roomId?: string): string | undefined {
  if (!roomId) {
    return;
  }

  const [, document] =
    roomId.match(/^nextjs-comments-notifications-([^-]*)/) ?? [];

  return document;
}

export function useRoomIdWithDocument(document: string) {
  const params = useSearchParams();
  const roomIdParam = params?.get("roomId");

  const overrideRoomId = useMemo(() => {
    const roomId = `nextjs-comments-notifications-${document}`;

    return roomIdParam ? `${roomId}-${roomIdParam}` : roomId;
  }, [roomIdParam, document]);

  return overrideRoomId;
}
