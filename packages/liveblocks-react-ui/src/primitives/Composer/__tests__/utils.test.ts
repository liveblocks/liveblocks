import type { CommentBody } from "@liveblocks/client";
import { describe, expect, test } from "vitest";

import type { ComposerBody } from "../../../types";
import { commentBodyToComposerBody, composerBodyToCommentBody } from "../utils";

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
              { text: ", " },
              { type: "mention", kind: "user", id: "chris" },
              { text: " and " },
              {
                type: "mention",
                kind: "group",
                id: "here",
                userIds: ["nimesh", "vincent"],
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
              bold: true,
            },
            {
              text: ", ",
            },
            {
              type: "mention",
              kind: "user",
              id: "chris",
              children: [
                {
                  text: "",
                },
              ],
            },
            {
              text: " and ",
            },
            {
              type: "mention",
              kind: "group",
              id: "here",
              userIds: ["nimesh", "vincent"],
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
              { type: "mention", kind: "user", id: "vincent" },
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
              kind: "user",
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

const composerBodyToCommentBodyFixtures: [string, ComposerBody, CommentBody][] =
  [
    // ===========================================================
    [
      "a composer body",
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
              kind: "user",
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
              { type: "mention", kind: "user", id: "chris" },
            ],
          },
        ],
      },
    ],
    // ===========================================================
    [
      "a composer body with multiple paragraphs",
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
              kind: "user",
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
              { type: "mention", kind: "user", id: "vincent" },
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
    ],
    // ===========================================================
    [
      "an empty composer body",
      // ---------------------------------------------------------
      [],
      // ---------------------------------------------------------
      {
        version: 1,
        content: [],
      },
    ],
    // ===========================================================
    [
      "a composer body with an empty paragraph",
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [],
        },
      ],
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
    ],
    // ===========================================================
    [
      "a composer body with empty inline elements",
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
    ],
    // ===========================================================
    [
      "a composer body with an unknown block element",
      // ---------------------------------------------------------
      [
        {
          // @ts-expect-error - Deliberately using an unknown block element
          type: "unknown",
          children: [{ text: "Hello " }, { text: "world", bold: true }],
        },
      ],
      // ---------------------------------------------------------
      {
        version: 1,
        content: [],
      },
    ],
    // ===========================================================
    [
      "a composer body with an unknown inline element",
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          // @ts-expect-error - Deliberately using an unknown inline element
          children: [{ type: "unknown", code: "code" }],
        },
      ],
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
    ],
    // ===========================================================
    [
      "a composer body with rich inlines inside a link element",
      // ---------------------------------------------------------
      [
        {
          type: "paragraph",
          children: [
            {
              type: "custom-link",
              url: "https://liveblocks.io",
              children: [
                {
                  text: "Live",
                },
                {
                  text: "blocks",
                  bold: true,
                  italic: true,
                },
              ],
            },
          ],
        },
      ],
      // ---------------------------------------------------------
      {
        version: 1,
        content: [
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
    ],
  ];

describe("composerBodyToCommentBody", () => {
  test.each(composerBodyToCommentBodyFixtures)(
    "converts %s to a composer body",
    (_, composerBody, commentBody) => {
      expect(composerBodyToCommentBody(composerBody)).toEqual(commentBody);
    }
  );
});
