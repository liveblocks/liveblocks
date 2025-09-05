import type { SerializedTiptapRootNode } from "../tiptap-editor";

/**
 * A simple `Uint8Array` representing a tiptap document
 *
 * e.g
 *    Hey this a tip tap <italic><bold>example</bold></italic> hiha! <mention>user-0</mention>fun right?
 */
export const docUpdate = new Uint8Array([
  1, 20, 197, 164, 177, 247, 3, 0, 7, 1, 7, 100, 101, 102, 97, 117, 108, 116, 3,
  9, 112, 97, 114, 97, 103, 114, 97, 112, 104, 7, 0, 197, 164, 177, 247, 3, 0,
  6, 4, 0, 197, 164, 177, 247, 3, 1, 19, 72, 101, 121, 32, 116, 104, 105, 115,
  32, 97, 32, 116, 105, 112, 32, 116, 97, 112, 32, 134, 197, 164, 177, 247, 3,
  20, 4, 98, 111, 108, 100, 2, 123, 125, 134, 197, 164, 177, 247, 3, 21, 6, 105,
  116, 97, 108, 105, 99, 2, 123, 125, 132, 197, 164, 177, 247, 3, 22, 7, 101,
  120, 97, 109, 112, 108, 101, 134, 197, 164, 177, 247, 3, 29, 4, 98, 111, 108,
  100, 4, 110, 117, 108, 108, 134, 197, 164, 177, 247, 3, 30, 6, 105, 116, 97,
  108, 105, 99, 4, 110, 117, 108, 108, 132, 197, 164, 177, 247, 3, 31, 7, 32,
  104, 105, 104, 97, 33, 32, 129, 197, 164, 177, 247, 3, 1, 1, 0, 2, 129, 197,
  164, 177, 247, 3, 39, 1, 0, 11, 129, 197, 164, 177, 247, 3, 38, 11, 193, 197,
  164, 177, 247, 3, 38, 197, 164, 177, 247, 3, 54, 4, 199, 197, 164, 177, 247,
  3, 1, 197, 164, 177, 247, 3, 39, 3, 17, 108, 105, 118, 101, 98, 108, 111, 99,
  107, 115, 77, 101, 110, 116, 105, 111, 110, 40, 0, 197, 164, 177, 247, 3, 69,
  2, 105, 100, 1, 119, 6, 117, 115, 101, 114, 45, 48, 40, 0, 197, 164, 177, 247,
  3, 69, 14, 110, 111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 73, 100,
  1, 119, 24, 105, 110, 95, 56, 81, 112, 112, 112, 115, 109, 69, 74, 104, 74,
  122, 87, 81, 56, 81, 51, 66, 55, 66, 80, 199, 197, 164, 177, 247, 3, 69, 197,
  164, 177, 247, 3, 39, 6, 4, 0, 197, 164, 177, 247, 3, 72, 11, 32, 102, 117,
  110, 32, 114, 105, 103, 104, 116, 63, 1, 197, 164, 177, 247, 3, 1, 39, 30,
]);

export const docUpdateBuffer = docUpdate.buffer;

export const MENTIONED_USER_ID = "user-0";
export const MENTIONED_GROUP_ID = "group-0";
export const MENTION_ID = "in_8QpppsmEJhJzWQ8Q3B7BP";
export const GROUP_MENTION_ID = "in_QQ6EOi7jsH-LNw0C8Lpaf";

// Without line breaks
export const docStateRoot: SerializedTiptapRootNode = {
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
            id: MENTIONED_USER_ID,
            notificationId: MENTION_ID,
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

// With line breaks
export const docStateRoot2: SerializedTiptapRootNode = {
  type: "doc",
  content: [
    { type: "paragraph" },
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
            id: MENTIONED_USER_ID,
            notificationId: MENTION_ID,
          },
        },
        {
          type: "text",
          text: " fun right?",
        },
      ],
    },
    { type: "paragraph" },
  ],
};
