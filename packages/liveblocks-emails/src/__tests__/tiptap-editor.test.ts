import { describe, expect, test } from "vitest";

import type { SerializedTiptapRootNode } from "../tiptap-editor";
import {
  findTiptapMentionNodeWithContext,
  flattenTiptapTree,
  getSerializedTiptapState,
} from "../tiptap-editor";
import { generateInboxNotificationId } from "./_helpers";
import {
  docStateRoot,
  docStateRoot2,
  docUpdateBuffer,
  GROUP_MENTION_ID,
  MENTION_ID,
  MENTIONED_GROUP_ID,
  MENTIONED_USER_ID,
} from "./_tiptap-helpers";

describe("tiptap editor", () => {
  describe("get serialized state", () => {
    test("should parse correctly a real document", () => {
      const state = getSerializedTiptapState({
        buffer: docUpdateBuffer,
        key: "default",
      });

      expect(state).toEqual(docStateRoot);
    });
  });

  describe("find mention node with context", () => {
    test("should flatten tiptap tree", () => {
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

    test("should find no mention with context", () => {
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
        textMentionId: generateInboxNotificationId(),
      });

      expect(context).toBeNull();
    });

    test("should find a user mention with context", () => {
      const context = findTiptapMentionNodeWithContext({
        root: docStateRoot2,
        textMentionId: MENTION_ID,
      });

      expect(context).toEqual({
        before: [
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
        ],
        mention: {
          type: "liveblocksMention",
          attrs: {
            id: MENTIONED_USER_ID,
            notificationId: MENTION_ID,
          },
        },
        after: [
          {
            type: "text",
            text: " fun right?",
          },
        ],
      });
    });

    test("should find a group mention with context", () => {
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
            text: " hiha! ",
          },
          {
            type: "liveblocksGroupMention",
            attrs: {
              id: MENTIONED_GROUP_ID,
              notificationId: GROUP_MENTION_ID,
              userIds: undefined,
            },
          },
          {
            type: "text",
            text: " fun right?",
          },
        ],
      };

      const context = findTiptapMentionNodeWithContext({
        root,
        textMentionId: GROUP_MENTION_ID,
      });

      expect(context).toEqual({
        before: [
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
        ],
        mention: {
          type: "liveblocksGroupMention",
          attrs: {
            id: MENTIONED_GROUP_ID,
            notificationId: GROUP_MENTION_ID,
          },
        },
        after: [
          {
            type: "text",
            text: " fun right?",
          },
        ],
      });
    });
  });
});
