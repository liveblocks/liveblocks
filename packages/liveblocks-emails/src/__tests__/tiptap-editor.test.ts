import type { SerializedTiptapRootNode } from "../tiptap-editor";
import { getSerializedTiptapState } from "../tiptap-editor";
import { docUpdateBuffer } from "./_tiptap-helpers";

describe("tiptap editor", () => {
  describe("get serialized state", () => {
    it("should parse correctly a real document", () => {
      const state = getSerializedTiptapState({
        buffer: docUpdateBuffer,
        key: "default",
      });

      const expected: SerializedTiptapRootNode = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hey this a tip tap ",
              },
              {
                type: "text",
                text: "example",
                marks: [
                  {
                    type: "bold",
                    attrs: {},
                  },
                  {
                    type: "italic",
                    attrs: {},
                  },
                ],
              },
              {
                type: "text",
                text: " hiha! ",
              },
              {
                type: "liveblocksMention",
                attrs: {
                  id: "user-0",
                  notificationId: "in_8QpppsmEJhJzWQ8Q3B7BP",
                },
              },
              {
                type: "text",
                text: " fun right?",
              },
            ],
          },
        ],
      };

      expect(state).toEqual(expected);
    });
  });
});
