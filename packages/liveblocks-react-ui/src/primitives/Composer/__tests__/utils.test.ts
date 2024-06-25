import type { CommentBody } from "@liveblocks/client";

import type { ComposerBody } from "../../../types";
import { commentBodyToComposerBody } from "../utils";

const commentBodyToComposerBodyFixtures: [string, CommentBody, ComposerBody][] =
  [
    // ===========================================================
    [
      "a comment body",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "Hello " },
              { text: "world", bold: true },
              { text: " and " },
              { type: "mention", id: "chris" },
            ],
          },
        ],
      },
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [
            {
              text: "Hello ",
            },
            {
              text: "world",
              bold: true,
            },
            {
              text: " and ",
            },
            {
              type: "mention",
              id: "chris",
              children: [
                {
                  text: "",
                },
              ],
            },
          ],
        },
      ],
    ],
    // ===========================================================
    [
      "a comment body with multiple paragraphs",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "Hello " },
              { text: "world", italic: true, bold: true },
              { text: " and " },
              { type: "mention", id: "vincent" },
            ],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://liveblocks.io",
              },
            ],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://liveblocks.io",
                text: "Liveblocks",
              },
            ],
          },
        ],
      },
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [
            {
              text: "Hello ",
            },
            {
              text: "world",
              italic: true,
              bold: true,
            },
            {
              text: " and ",
            },
            {
              type: "mention",
              id: "vincent",
              children: [
                {
                  text: "",
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "auto-link",
              url: "https://liveblocks.io",
              children: [
                {
                  text: "https://liveblocks.io",
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "custom-link",
              url: "https://liveblocks.io",
              children: [
                {
                  text: "Liveblocks",
                },
              ],
            },
          ],
        },
      ],
    ],
    // ===========================================================
    [
      "an empty comment body",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [],
      },
      // ---------------------------------------------------------
      [],
    ],
    // ===========================================================
    [
      "a comment body with an empty paragraph",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [],
          },
        ],
      },
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [],
        },
      ],
    ],
    // ===========================================================
    [
      "a comment body with empty inline elements",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "" },
              { text: "", bold: true },
              {
                text: "",
                bold: true,
                italic: true,
                code: true,
                strikethrough: true,
              },
            ],
          },
        ],
      },
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [
            {
              text: "",
            },
            {
              text: "",
              bold: true,
            },
            {
              text: "",
              bold: true,
              italic: true,
              code: true,
              strikethrough: true,
            },
          ],
        },
      ],
    ],
    // ===========================================================
    [
      "a comment body with an unknown block element",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            // @ts-expect-error - Deliberately using an unknown block element
            type: "unknown",
            children: [{ text: "Hello " }, { text: "world", bold: true }],
          },
        ],
      },
      // ---------------------------------------------------------
      [],
    ],
    // ===========================================================
    [
      "a comment body with an unknown inline element",
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
          {
            type: "paragraph",
            // @ts-expect-error - Deliberately using an unknown inline element
            children: [{ type: "unknown", code: "code" }],
          },
        ],
      },
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [],
        },
      ],
    ],
  ];

describe("commentBodyToComposerBody", () => {
  test.each(commentBodyToComposerBodyFixtures)(
    "converts %s to a composer body",
    (_, commentBody, composerBody) => {
      expect(commentBodyToComposerBody(commentBody)).toEqual(composerBody);
    }
  );
});
