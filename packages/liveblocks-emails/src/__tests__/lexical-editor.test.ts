import { describe, expect } from "vitest";

import type { SerializedLexicalRootNode } from "../lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  flattenLexicalTree,
  getSerializedLexicalState,
} from "../lexical-editor";
import { generateInboxNotificationId } from "./_helpers";
import {
  createLexicalMentionNodeWithContext,
  docStateRoot,
  docStateRoot2,
  docUpdateBuffer,
  MENTION_ID,
  MENTIONED_USER_ID,
} from "./_lexical-helpers";

describe("Lexical editor", () => {
  describe("get serialized state", () => {
    it("should parse correctly a real document", () => {
      const state = getSerializedLexicalState({
        buffer: docUpdateBuffer,
        key: "root",
      });

      expect(state).toEqual(docStateRoot);
    });
  });

  describe("find mention node with context", () => {
    it("should flatten Lexical tree", () => {
      const flattenNodes = flattenLexicalTree(docStateRoot2.children);
      expect(flattenNodes).toEqual([
        {
          type: "linebreak",
          group: "linebreak",
          attributes: {
            __type: "linebreak",
            __format: 0,
            __indent: 0,
            __dir: null,
            __textFormat: 0,
          },
        },
        {
          group: "element-marker",
          marker: "start",
        },
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
        {
          type: "lb-mention",
          group: "decorator",
          attributes: {
            __type: "lb-mention",
            __id: MENTION_ID,
            __userId: MENTIONED_USER_ID,
          },
        },
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
        {
          group: "element-marker",
          marker: "end",
        },
        {
          type: "linebreak",
          group: "linebreak",
          attributes: {
            __type: "linebreak",
            __format: 0,
            __indent: 0,
            __dir: null,
            __textFormat: 0,
          },
        },
      ]);
    });

    it("should find no mention with context", () => {
      const root: SerializedLexicalRootNode = {
        type: "root",
        children: [
          {
            type: "paragraph",
            group: "element",
            attributes: {
              __type: "paragraph",
              __format: 0,
              __indent: 0,
              __dir: "ltr",
              __textFormat: 0,
            },
            children: [
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
        ],
        attributes: {
          __dir: "ltr",
        },
      };

      const context = findLexicalMentionNodeWithContext({
        root,
        mentionedUserId: "user-mina",
        mentionId: generateInboxNotificationId(),
      });

      expect(context).toBeNull();
    });

    it("should find a mention with context", () => {
      const context = findLexicalMentionNodeWithContext({
        root: docStateRoot2,
        mentionedUserId: MENTIONED_USER_ID,
        mentionId: MENTION_ID,
      });
      const expected = createLexicalMentionNodeWithContext({
        mentionedUserId: MENTIONED_USER_ID,
        mentionId: MENTION_ID,
      });

      expect(context).toEqual(expected);
    });
  });
});
