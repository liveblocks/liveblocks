import { describe, expect, test } from "vitest";

import {
  createLiveblocksTiptapNode,
  liveblocksTiptapNodeToJson,
} from "../collaboration-liveblocks/schema";

describe("collaboration-liveblocks schema", () => {
  test("round-trips a ProseMirror document through Liveblocks storage nodes", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "left" },
          content: [
            {
              type: "text",
              text: "Hello",
              marks: [{ type: "bold" }],
            },
            {
              type: "text",
              text: " world",
            },
          ],
        },
      ],
    };

    const storageNode = createLiveblocksTiptapNode(document);

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(document);
  });
});
