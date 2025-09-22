import { describe, expect, test } from "vitest";

import type { LiveblocksTextEditorNode } from "../liveblocks-text-editor";
import { transformAsLiveblocksTextEditorNodes } from "../liveblocks-text-editor";
import { generateInboxNotificationId } from "./_helpers";

describe("liveblocks text editor", () => {
  describe("transform serialized nodes into Liveblocks Text Editor nodes", () => {
    test("should transform lexical nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-mina";

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "lexical",
        mention: {
          before: [
            {
              type: "text",
              group: "text",
              attributes: {
                __type: "text",
                __format: 1,
                __style: "",
                __mode: 0,
                __detail: 0,
              },
              text: "Some things to add ",
            },
          ],
          mention: {
            type: "lb-mention",
            group: "decorator",
            attributes: {
              __type: "lb-mention",
              __id: mentionId,
              __userId: userId,
            },
          },
          after: [
            {
              type: "text",
              group: "text",
              attributes: {
                __type: "text",
                __format: 0,
                __style: "",
                __mode: 0,
                __detail: 0,
              },
              text: "?",
            },
          ],
        },
      });

      const expected: LiveblocksTextEditorNode[] = [
        {
          type: "text",
          text: "Some things to add ",
          bold: true,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "mention",
          kind: "user",
          id: userId,
        },
        {
          type: "text",
          text: "?",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
      ];

      expect(nodes).toEqual(expected);
    });

    test("should transform tiptap nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-dracula";

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "tiptap",
        mention: {
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
              id: userId,
              notificationId: mentionId,
            },
          },
          after: [
            {
              type: "text",
              text: " fun right?",
            },
          ],
        },
      });

      const expected: LiveblocksTextEditorNode[] = [
        {
          type: "text",
          text: "Hey this a tip tap ",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "text",
          text: "example",
          bold: true,
          italic: true,
          strikethrough: false,
          code: false,
        },
        {
          type: "text",
          text: " hiha! ",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
        {
          type: "mention",
          kind: "user",
          id: userId,
        },
        {
          type: "text",
          text: " fun right?",
          bold: false,
          italic: false,
          strikethrough: false,
          code: false,
        },
      ];

      expect(nodes).toEqual(expected);
    });
  });
});
