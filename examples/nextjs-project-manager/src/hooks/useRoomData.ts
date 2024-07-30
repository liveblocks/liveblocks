import {
  useBroadcastEvent,
  useEventListener,
  useRoom,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useState } from "react";
import { getRoom, updateRoom } from "@/actions/liveblocks";
import { Metadata, RoomWithMetadata } from "@/config";

export function useRoomData() {
  const room = useRoom();
  const broadcast = useBroadcastEvent();

  const [roomData, internalSetRoomData] = useState<RoomWithMetadata | null>(
    null
  );

  const updateRoomMetadata = useCallback(
    async (metadata: Partial<Metadata>) => {
      const newRoomData = (await updateRoom(room.id, {
        metadata,
      })) as RoomWithMetadata;
      internalSetRoomData(newRoomData);
      broadcast({ type: "ROOM_UPDATED", roomId: room.id });
    },
    [room]
  );

  useEffect(() => {
    run();

    async function run() {
      internalSetRoomData((await getRoom(room.id)) as RoomWithMetadata);
    }
  }, []);

  useEventListener(async ({ event }) => {
    if (event.type === "ROOM_UPDATED" && event.roomId === room.id) {
      internalSetRoomData((await getRoom(room.id)) as RoomWithMetadata);
    }
  });

  return { roomData, updateRoomMetadata } as const;
}
