import { flattenTiptapTree, getSerializedTiptapState } from "../tiptap-editor";
import { docStateRoot, docUpdateBuffer } from "./_tiptap-helpers";

describe("tiptap editor", () => {
  describe("get serialized state", () => {
    it("should parse correctly a real document", () => {
      const state = getSerializedTiptapState({
        buffer: docUpdateBuffer,
        key: "default",
      });

      expect(state).toEqual(docStateRoot);
    });
  });

  describe("find mention node with context", () => {
    it("should flatten tiptap tree", () => {
      const flattenNodes = flattenTiptapTree(docStateRoot.content);
      expect(flattenNodes).toEqual([
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
      ]);
    });
  });
});
