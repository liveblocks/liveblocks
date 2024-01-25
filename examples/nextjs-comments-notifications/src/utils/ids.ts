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

export function useOverrideRoomId(roomId: string) {
  const params = useSearchParams();
  const roomIdParam = params?.get("roomId");

  const overrideRoomId = useMemo(() => {
    return roomIdParam ? `${roomId}-${roomIdParam}` : roomId;
  }, [roomId, roomIdParam]);

  return overrideRoomId;
}
