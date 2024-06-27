"use server";

import { Liveblocks } from "@liveblocks/node";
import { withLexicalDocument } from "@liveblocks/node-lexical";
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function askAi(roomId: string, query: string) {
  await withLexicalDocument({ roomId, client: liveblocks }, async (doc) => {
    await doc.update(() => {
      // Adding a paragraph node with contained text node
      const root = $getRoot();
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode("Hello world");
      paragraphNode.append(textNode);
      root.append(paragraphNode);
    });
  });
}
