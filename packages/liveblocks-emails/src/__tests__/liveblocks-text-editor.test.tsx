import { describe, expect } from "vitest";

import type { LiveblocksTextEditorNode } from "../liveblocks-text-editor";
import { transformAsLiveblocksTextEditorNodes } from "../liveblocks-text-editor";
import { generateInboxNotificationId } from "./_helpers";
import { createLexicalMentionNodeWithContext } from "./_lexical-helpers";
import { createTipTapMentionNodeWithContext } from "./_tiptap-helpers";

describe("liveblocks text editor", () => {
  describe("transform serialized nodes into Liveblocks Text Editor nodes", () => {
    it("should transform lexical nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-mina";

      const mentionNodeWithContext = createLexicalMentionNodeWithContext({
        mentionedUserId: userId,
        mentionId,
      });

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "lexical",
        mention: mentionNodeWithContext,
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

    it("should transform tiptap nodes", () => {
      const mentionId = generateInboxNotificationId();
      const userId = "user-dracula";

      const mentionNodeWithContext = createTipTapMentionNodeWithContext({
        mentionedUserId: userId,
        mentionId,
      });

      const nodes = transformAsLiveblocksTextEditorNodes({
        editor: "tiptap",
        mention: mentionNodeWithContext,
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
