import type { SerializedTiptapRootNode } from "../tiptap-editor";
import {
  findTiptapMentionNodeWithContext,
  flattenTiptapTree,
  getSerializedTiptapState,
} from "../tiptap-editor";
import { generateInboxNotificationId } from "./_helpers";
import {
  createTipTapMentionNodeWithContext,
  docStateRoot,
  docStateRoot2,
  docUpdateBuffer,
  MENTION_ID,
  MENTIONED_USER_ID,
} from "./_tiptap-helpers";

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
      const flattenNodes = flattenTiptapTree(docStateRoot2.content);
      expect(flattenNodes).toEqual([
        { type: "paragraph" },
        {
          type: "paragraph-marker",
          marker: "start",
        },
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
            id: MENTIONED_USER_ID,
            notificationId: MENTION_ID,
          },
        },
        {
          type: "text",
          text: " fun right?",
        },
        {
          type: "paragraph-marker",
          marker: "end",
        },
        { type: "paragraph" },
      ]);
    });

    it("should find no mention with context", () => {
      const root: SerializedTiptapRootNode = {
        type: "doc",
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
            text: " hiha!",
          },
        ],
      };

      const context = findTiptapMentionNodeWithContext({
        root,
        mentionedId: "user-dracula",
        textMentionId: generateInboxNotificationId(),
      });

      expect(context).toBeNull();
    });

    it("should find a mention with context", () => {
      const context = findTiptapMentionNodeWithContext({
        root: docStateRoot2,
        mentionedId: MENTIONED_USER_ID,
        textMentionId: MENTION_ID,
      });
      const expected = createTipTapMentionNodeWithContext({
        mentionedId: MENTIONED_USER_ID,
        textMentionId: MENTION_ID,
      });

      expect(context).toEqual(expected);
    });
  });
});
