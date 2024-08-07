"use server";

import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function getRoomTitle(roomId: string) {
  const room = await liveblocks.getRoom(roomId);
  return (room.metadata?.title as string) || "";
}

export async function setRoomTitle(roomId: string, title: string) {
  const room = await liveblocks.updateRoom(roomId, { metadata: { title } });
  return room.metadata?.title || null;
}
