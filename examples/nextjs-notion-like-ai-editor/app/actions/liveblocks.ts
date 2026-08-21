"use server";

import {
  createRoom,
  getRooms,
  getRoomTitle,
  liveblocks,
  RoomInfo,
  TypedRoomDataWithInfo,
} from "../utils/liveblocks";
import { getPageUrl } from "../config";
import { markdownToLiveDocument } from "../utils/lexical-live-storage";
import { LEXICAL_NODES } from "../utils/lexical-nodes";

export async function getRoomInfo(roomIds: string[]): Promise<RoomInfo[]> {
  const promises = [];

  for (const roomId of roomIds) {
    promises.push(getRoomTitle(roomId));
  }

  const titles = await Promise.all(promises);

  return titles.map((title, index) => ({
    name: title,
    url: getPageUrl(roomIds[index]),
  }));
}

export async function createRoomWithLexicalDocument(
  markdown: string,
  title?: string
) {
  const roomTitle = title || "Untitled document";
  const room = await createRoom(roomTitle, markdown, LEXICAL_NODES);

  return room;
}

export async function getRoomsAndInfo({
  cursor,
  limit,
}: {
  cursor?: string;
  limit?: number;
}) {
  const { rooms, nextCursor } = await getRooms({ cursor, limit });
  const roomIds = rooms.map((room) => room.id);
  const roomsInfo = await getRoomInfo(roomIds);

  const finalRooms: TypedRoomDataWithInfo[] = rooms.map((room, index) => ({
    ...room,
    info: roomsInfo[index],
  }));

  return { rooms: finalRooms, nextCursor };
}
