import type {
  LexicalMentionNodeWithContext,
  SerializedLexicalRootNode,
} from "../lexical-editor";

/**
 * A simple `Uint8Array` representing a Lexical document
 *
 * e.g
 *    Some things to add @user-4?
 */
export const docUpdate = new Uint8Array([
  4, 28, 128, 205, 182, 218, 14, 0, 129, 251, 243, 254, 190, 13, 41, 1, 129,
  130, 146, 255, 129, 1, 0, 1, 0, 5, 161, 251, 243, 254, 190, 13, 2, 1, 161,
  251, 243, 254, 190, 13, 3, 1, 168, 128, 205, 182, 218, 14, 7, 1, 119, 3, 108,
  116, 114, 168, 128, 205, 182, 218, 14, 8, 1, 119, 3, 108, 116, 114, 135, 128,
  205, 182, 218, 14, 0, 1, 40, 0, 128, 205, 182, 218, 14, 11, 6, 95, 95, 116,
  121, 112, 101, 1, 119, 4, 116, 101, 120, 116, 40, 0, 128, 205, 182, 218, 14,
  11, 8, 95, 95, 102, 111, 114, 109, 97, 116, 1, 125, 0, 40, 0, 128, 205, 182,
  218, 14, 11, 7, 95, 95, 115, 116, 121, 108, 101, 1, 119, 0, 40, 0, 128, 205,
  182, 218, 14, 11, 6, 95, 95, 109, 111, 100, 101, 1, 125, 0, 40, 0, 128, 205,
  182, 218, 14, 11, 8, 95, 95, 100, 101, 116, 97, 105, 108, 1, 125, 0, 132, 128,
  205, 182, 218, 14, 11, 9, 83, 111, 109, 101, 32, 116, 104, 105, 110, 129, 128,
  205, 182, 218, 14, 25, 1, 132, 128, 205, 182, 218, 14, 26, 10, 103, 115, 32,
  116, 111, 32, 97, 100, 100, 32, 129, 128, 205, 182, 218, 14, 36, 1, 135, 128,
  205, 182, 218, 14, 37, 3, 9, 85, 78, 68, 69, 70, 73, 78, 69, 68, 40, 0, 128,
  205, 182, 218, 14, 38, 6, 95, 95, 116, 121, 112, 101, 1, 119, 10, 108, 98, 45,
  109, 101, 110, 116, 105, 111, 110, 40, 0, 128, 205, 182, 218, 14, 38, 4, 95,
  95, 105, 100, 1, 119, 24, 105, 110, 95, 81, 81, 54, 69, 79, 105, 55, 106, 115,
  72, 45, 76, 78, 119, 48, 67, 56, 76, 112, 97, 102, 40, 0, 128, 205, 182, 218,
  14, 38, 8, 95, 95, 117, 115, 101, 114, 73, 100, 1, 119, 6, 117, 115, 101, 114,
  45, 52, 135, 128, 205, 182, 218, 14, 38, 1, 40, 0, 128, 205, 182, 218, 14, 42,
  6, 95, 95, 116, 121, 112, 101, 1, 119, 4, 116, 101, 120, 116, 40, 0, 128, 205,
  182, 218, 14, 42, 8, 95, 95, 102, 111, 114, 109, 97, 116, 1, 125, 0, 40, 0,
  128, 205, 182, 218, 14, 42, 7, 95, 95, 115, 116, 121, 108, 101, 1, 119, 0, 40,
  0, 128, 205, 182, 218, 14, 42, 6, 95, 95, 109, 111, 100, 101, 1, 125, 0, 40,
  0, 128, 205, 182, 218, 14, 42, 8, 95, 95, 100, 101, 116, 97, 105, 108, 1, 125,
  0, 132, 128, 205, 182, 218, 14, 42, 1, 63, 11, 251, 243, 254, 190, 13, 0, 161,
  130, 146, 255, 129, 1, 6, 1, 161, 130, 146, 255, 129, 1, 7, 1, 161, 251, 243,
  254, 190, 13, 0, 1, 161, 251, 243, 254, 190, 13, 1, 1, 129, 130, 146, 255,
  129, 1, 39, 1, 0, 5, 129, 251, 243, 254, 190, 13, 4, 6, 0, 3, 129, 251, 243,
  254, 190, 13, 15, 1, 0, 5, 129, 251, 243, 254, 190, 13, 19, 17, 1, 167, 186,
  229, 132, 1, 0, 193, 251, 243, 254, 190, 13, 19, 251, 243, 254, 190, 13, 25,
  1, 15, 130, 146, 255, 129, 1, 0, 7, 1, 4, 114, 111, 111, 116, 6, 40, 0, 130,
  146, 255, 129, 1, 0, 6, 95, 95, 116, 121, 112, 101, 1, 119, 9, 112, 97, 114,
  97, 103, 114, 97, 112, 104, 40, 0, 130, 146, 255, 129, 1, 0, 8, 95, 95, 102,
  111, 114, 109, 97, 116, 1, 125, 0, 40, 0, 130, 146, 255, 129, 1, 0, 8, 95, 95,
  105, 110, 100, 101, 110, 116, 1, 125, 0, 33, 0, 130, 146, 255, 129, 1, 0, 5,
  95, 95, 100, 105, 114, 1, 40, 0, 130, 146, 255, 129, 1, 0, 12, 95, 95, 116,
  101, 120, 116, 70, 111, 114, 109, 97, 116, 1, 125, 0, 33, 1, 4, 114, 111, 111,
  116, 5, 95, 95, 100, 105, 114, 1, 161, 130, 146, 255, 129, 1, 4, 1, 1, 0, 130,
  146, 255, 129, 1, 0, 1, 0, 5, 129, 130, 146, 255, 129, 1, 8, 6, 0, 3, 129,
  130, 146, 255, 129, 1, 19, 1, 0, 5, 129, 130, 146, 255, 129, 1, 23, 11, 4,
  128, 205, 182, 218, 14, 3, 0, 9, 26, 1, 37, 1, 251, 243, 254, 190, 13, 1, 0,
  42, 167, 186, 229, 132, 1, 1, 0, 1, 130, 146, 255, 129, 1, 2, 4, 1, 6, 34,
]);

export const docUpdateBuffer = docUpdate.buffer;

export const MENTIONED_USER_ID = "user-4";
export const MENTION_ID = "in_QQ6EOi7jsH-LNw0C8Lpaf";

// Without line breaks
export const docStateRoot: SerializedLexicalRootNode = {
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
            __format: 0,
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
            __id: "in_QQ6EOi7jsH-LNw0C8Lpaf",
            __userId: "user-4",
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

// With line breaks
export const docStateRoot2: SerializedLexicalRootNode = {
  type: "root",
  children: [
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
          type: "lb-mention",
          group: "decorator",
          attributes: {
            __type: "lb-mention",
            __id: "in_QQ6EOi7jsH-LNw0C8Lpaf",
            __userId: "user-4",
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
  ],
  attributes: {
    __dir: "ltr",
  },
};

export const createLexicalMentionNodeWithContext = ({
  mentionedId,
  textMentionId,
}: {
  mentionedId: string;
  textMentionId: string;
}): LexicalMentionNodeWithContext => {
  return {
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
        __id: textMentionId,
        __userId: mentionedId,
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
  };
};
