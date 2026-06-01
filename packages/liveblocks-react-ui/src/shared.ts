import { canUseRoomPermission, kInternal, Permission } from "@liveblocks/core";
import { useClient, useRoom } from "@liveblocks/react";
import { useRoomPermissions, useSignal } from "@liveblocks/react/_private";
import { useCallback, useSyncExternalStore } from "react";

export function useCurrentUserId(): string | null {
  const client = useClient();
  return useSignal(client[kInternal].currentUserId) ?? null;
}

export function useSelfCanComment(): boolean {
  const room = useRoom({ allowOutsideRoom: true });

  return useSyncExternalStore(
    useCallback(
      (callback) => {
        if (room === null) return () => {};
        return room.events.self.subscribe(callback);
      },
      [room]
    ),
    useCallback(() => {
      return room?.getSelf()?.canComment ?? true;
    }, [room]),
    useCallback(() => true, [])
  );
}

export function useCanComment(roomId: string): boolean {
  const selfCanComment = useSelfCanComment();
  const permissions = useRoomPermissions(roomId);

  return permissions !== undefined
    ? canUseRoomPermission(permissions, Permission.RoomCommentsWrite)
    : selfCanComment;
}
