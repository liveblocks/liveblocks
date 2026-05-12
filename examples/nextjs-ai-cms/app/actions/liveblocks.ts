"use server";

import { getRooms, getPostTitle, TypedRoomDataWithInfo } from "../utils/liveblocks";
import { getPostIdFromRoomId, getPostUrl } from "../config";

export async function getRoomsAndInfo({
  cursor,
  limit,
}: {
  cursor?: string;
  limit?: number;
}) {
  const { rooms, nextCursor } = await getRooms({ cursor, limit });
  const titles = await Promise.all(rooms.map((r) => getPostTitle(r.id)));

  const finalRooms: TypedRoomDataWithInfo[] = rooms.map((room, index) => ({
    ...room,
    info: {
      name: titles[index] ?? "",
      url: getPostUrl(room.metadata.postId),
    },
  }));

  return { rooms: finalRooms, nextCursor };
}

export async function getRoomsInfoForProvider(roomIds: string[]) {
  const titles = await Promise.all(roomIds.map((id) => getPostTitle(id)));
  return roomIds.map((roomId, index) => ({
    name: titles[index] ?? "",
    url: getPostUrl(getPostIdFromRoomId(roomId)),
  }));
}
