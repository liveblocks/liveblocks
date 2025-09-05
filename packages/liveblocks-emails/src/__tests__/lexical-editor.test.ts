import { describe, expect, test } from "vitest";

import type { SerializedLexicalRootNode } from "../lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  flattenLexicalTree,
  getSerializedLexicalState,
} from "../lexical-editor";
import { generateInboxNotificationId } from "./_helpers";
import {
  docStateRoot,
  docStateRoot2,
  docUpdateBuffer,
  GROUP_MENTION_ID,
  MENTION_ID,
  MENTIONED_USER_ID,
} from "./_lexical-helpers";

describe("Lexical editor", () => {
  describe("get serialized state", () => {
    test("should parse correctly a real document", () => {
      const state = getSerializedLexicalState({
        buffer: docUpdateBuffer,
        key: "root",
      });

      expect(state).toEqual(docStateRoot);
    });
  });

  describe("find mention nodes with context", () => {
    test("should flatten Lexical tree", () => {
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

    test("should find no mention with context", () => {
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
        textMentionId: generateInboxNotificationId(),
      });

      expect(context).toBeNull();
    });

    test("should find a user mention with context", () => {
      const context = findLexicalMentionNodeWithContext({
        root: docStateRoot2,
        textMentionId: MENTION_ID,
      });

      expect(context).toEqual({
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
            __id: MENTION_ID,
            __userId: MENTIONED_USER_ID,
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
      });
    });

    test("should find a group mention with context", () => {
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
                type: "lb-group-mention",
                group: "decorator",
                attributes: {
                  __type: "lb-group-mention",
                  __id: GROUP_MENTION_ID,
                  __groupId: GROUP_MENTION_ID,
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
            ],
          },
        ],
        attributes: {
          __dir: "ltr",
        },
      };

      const context = findLexicalMentionNodeWithContext({
        root,
        textMentionId: GROUP_MENTION_ID,
      });

      expect(context).toEqual({
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
          type: "lb-group-mention",
          group: "decorator",
          attributes: {
            __type: "lb-group-mention",
            __id: GROUP_MENTION_ID,
            __groupId: GROUP_MENTION_ID,
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
      });
    });
  });
});
