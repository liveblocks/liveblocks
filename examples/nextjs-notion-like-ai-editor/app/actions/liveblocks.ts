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
import { withLexicalDocument } from "@liveblocks/node-lexical";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

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
  const room = await createRoom(title);

  await withLexicalDocument(
    {
      roomId: room.id,
      client: liveblocks,
      nodes: [
        CodeNode,
        LinkNode,
        ListNode,
        ListItemNode,
        HeadingNode,
        QuoteNode,
      ],
    },
    async (doc) => {
      await doc.update(() => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      });
    }
  );

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
