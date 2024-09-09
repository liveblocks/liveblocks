import { Liveblocks, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { getRoomId } from "../config";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type TypedRoomData = RoomData & { metadata: { pageId: string } };

export async function getLatestRoom() {
  const { data: rooms } = await liveblocks.getRooms({ limit: 1 });

  return rooms.length ? (rooms[0] as TypedRoomData) : null;
}

export async function createRoom() {
  const pageId = nanoid();

  return (await liveblocks.createRoom(getRoomId(pageId), {
    defaultAccesses: ["room:write"],
    metadata: { pageId },
  })) as TypedRoomData;
}

export async function getRooms() {
  const { data: rooms = [] } = await liveblocks.getRooms();

  return rooms as TypedRoomData[];
}

export async function getRoomTitle(roomId: string) {
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    return storage.title;
  } catch (err) {
    console.log(err);
    return null;
  }
}
