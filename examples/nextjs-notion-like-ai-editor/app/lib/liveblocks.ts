import { Liveblocks as LiveblocksNode, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { getRoomId } from "../config";
import { LiveObject, toPlainLson } from "@liveblocks/core";

export const liveblocks = new LiveblocksNode({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type TypedRoomData = RoomData & { metadata: { pageId: string } };

export async function getLatestRoom() {
  const { data: rooms } = await liveblocks.getRooms({ limit: 1 });

  return rooms.length ? (rooms[0] as TypedRoomData) : null;
}

export async function createRoom(title?: string) {
  const pageId = nanoid();

  const room = (await liveblocks.createRoom(getRoomId(pageId), {
    defaultAccesses: ["room:write"],
    metadata: { pageId },
  })) as TypedRoomData;

  if (title) {
    await liveblocks.initializeStorageDocument(room.id, {
      liveblocksType: "LiveObject",
      data: { title },
    });
  }

  return room;
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
    return "";
  }
}

export function setRoomTitle(roomId: string, title: string) {}
