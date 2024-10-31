import { Liveblocks as LiveblocksNode, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { getRoomId } from "../config";

export const liveblocks = new LiveblocksNode({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type RoomInfo = { name: string; url: string };
export type TypedRoomData = RoomData & { metadata: { pageId: string } };
export type TypedRoomDataWithInfo = TypedRoomData & { info: RoomInfo };

export async function getLatestRoom() {
  const { data: rooms } = await liveblocks.getRooms({ limit: 1 });

  return rooms.length ? (rooms[0] as TypedRoomData) : null;
}

export async function createRoom(title: string = "Untitled document") {
  const pageId = nanoid();

  const room = (await liveblocks.createRoom(getRoomId(pageId), {
    defaultAccesses: ["room:write"],
    metadata: { pageId },
  })) as TypedRoomData;

  await liveblocks.initializeStorageDocument(room.id, {
    liveblocksType: "LiveObject",
    data: { title },
  });

  return room;
}

export async function getRooms({
  cursor,
  limit,
}: {
  cursor?: string;
  limit?: number;
}) {
  const { data: rooms = [], nextCursor } = await liveblocks.getRooms({
    startingAfter: cursor,
    limit,
  });

  return { rooms: rooms as TypedRoomData[], nextCursor };
}

export async function getRoomTitle(roomId: string) {
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    return storage.title;
  } catch (err) {
    console.log(err);
    return "";
  }
}
