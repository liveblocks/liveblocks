import { Liveblocks, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { getRoomId } from "../config";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type TypedRoomData = RoomData & { metadata: { pageId: string } };

export async function getLatestPage() {
  const { data: rooms } = await liveblocks.getRooms({ limit: 1 });

  return rooms.length ? (rooms[0] as TypedRoomData) : null;
}

export async function createPage() {
  const pageId = nanoid();

  return (await liveblocks.createRoom(getRoomId(pageId), {
    defaultAccesses: ["room:write"],
    metadata: { pageId },
  })) as TypedRoomData;
}

export async function getPages() {
  const { data: rooms = [] } = await liveblocks.getRooms();

  return rooms as TypedRoomData[];
}

export async function getPageTitle(pageId: string) {
  const storage = await liveblocks.getStorageDocument(
    getRoomId(pageId),
    "json"
  );
  return storage.title;
}

export async function getRoomTitle(roomId: string) {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  return storage.title;
}
