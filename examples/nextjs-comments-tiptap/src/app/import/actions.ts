"use server";

import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

const exampleDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Example Text",
        },
      ],
    },
  ],
};

export async function createRoomWithMarkdown() {
  const roomId = nanoid();
  const room = await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  await withProsemirrorDocument(
    { roomId: roomId, client: liveblocks },
    async (api) => {
      await api.setContent(exampleDoc);
    }
  );

  console.log(room);

  return roomId;
}
