import { LiveObject, toPlainLson } from "@liveblocks/client";
import { Liveblocks as LiveblocksNode, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import type { Klass, LexicalNode } from "lexical";
import { getRoomId } from "../config";
import { markdownToLiveDocument } from "./lexical-live-storage";

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

export async function createRoom(
  title: string = "Untitled document",
  markdown?: string,
  nodes: ReadonlyArray<Klass<LexicalNode>> = []
) {
  const pageId = nanoid();

  const room = (await liveblocks.createRoom(getRoomId(pageId), {
    defaultAccesses: ["room:write"],
    metadata: { pageId },
  })) as TypedRoomData;

  const document = markdownToLiveDocument(markdown ?? "", nodes);

  await liveblocks.initializeStorageDocument(
    room.id,
    toPlainLson(
      new LiveObject({
        title,
        document,
      })
    ) as Parameters<typeof liveblocks.initializeStorageDocument>[1]
  );

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
