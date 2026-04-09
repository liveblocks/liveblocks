import type { CommentBody } from "@liveblocks/core";
import { describe, test } from "vitest";

// TODO: toExtend doesn't work with Relax<...> union types so we use plain assignment checks instead

describe("CommentBody", () => {
  test("should reject invalid required properties", () => {
    // @ts-expect-error - `version` and `content` are required
    const _1: CommentBody = {};
    // @ts-expect-error - `content` is required
    const _2: CommentBody = { version: 1 };
    // @ts-expect-error - `version` is required
    const _3: CommentBody = { content: [] };
    // @ts-expect-error - `version` must be 1
    const _4: CommentBody = { version: 2, content: [] };
    // @ts-expect-error - `version` must be a number
    const _5: CommentBody = { version: "1", content: [] };
    // @ts-expect-error - `content` must be an array
    const _6: CommentBody = { version: 1, content: "text" };
    // @ts-expect-error - `content` must be an array
    const _7: CommentBody = { version: 1, content: {} };
    // @ts-expect-error - `content` must be an array of valid block elements
    const _8: CommentBody = { version: 1, content: [{ type: "invalid" }] };
  });

  test("should reject invalid block elements", () => {
    /**
     * Invalid paragraph element
     */

    // @ts-expect-error - `children` is required
    const _1: CommentBody = { version: 1, content: [{ type: "paragraph" }] };
    const _2: CommentBody = {
      version: 1,
      // @ts-expect-error - `children` must be an array
      content: [{ type: "paragraph", children: "text" }],
    };
    const _3: CommentBody = {
      version: 1,
      // @ts-expect-error - `children` must be an array of valid inline elements
      content: [{ type: "paragraph", children: [{}] }],
    };
  });

  test("should reject invalid inline elements", () => {
    /**
     * Invalid text element
     */

    const _1: CommentBody = {
      version: 1,
      // @ts-expect-error - `text` must be a string
      content: [{ type: "paragraph", children: [{ text: 123 }] }],
    };
    const _2: CommentBody = {
      version: 1,
      // @ts-expect-error - text elements must include `text`
      content: [{ type: "paragraph", children: [{ bold: true }] }],
    };

    /**
     * Invalid mention element
     */

    const _3: CommentBody = {
      version: 1,
      // @ts-expect-error - `kind` and `id` are required
      content: [{ type: "paragraph", children: [{ type: "mention" }] }],
    };
    const _4: CommentBody = {
      version: 1,
      content: [
        // @ts-expect-error - mention nodes require `kind`, and `id` must be a string
        { type: "paragraph", children: [{ type: "mention", id: 123 }] },
      ],
    };
    const _5: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - `kind` must be either "user" or "group"
          children: [{ type: "mention", kind: "invalid", id: "user1" }],
        },
      ],
    };
    const _6: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            // @ts-expect-error - `userIds` can only be set if `kind` is "group"
            { type: "mention", kind: "user", id: "user1", userIds: [] },
          ],
        },
      ],
    };
    const _7: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - Typo of `text: "mention"` instead of `type: "mention"` so it's a text element (which can't have `kind` and `id`)
          children: [{ text: "mention", kind: "user", id: "user123" }],
        },
      ],
    };

    /**
     * Invalid link element
     */

    const _8: CommentBody = {
      version: 1,
      // @ts-expect-error - `url` is required
      content: [{ type: "paragraph", children: [{ type: "link" }] }],
    };
    const _9: CommentBody = {
      version: 1,
      // @ts-expect-error - `url` must be a string
      content: [{ type: "paragraph", children: [{ type: "link", url: 123 }] }],
    };
    const _10: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - `text` must be a string
          children: [{ type: "link", url: "https://liveblocks.io", text: 123 }],
        },
      ],
    };
    const _11: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - Typo of `text: "link"` instead of `type: "link"` so it's a text element (which can't have `url`)
          children: [{ text: "link", url: "https://liveblocks.io" }],
        },
      ],
    };
  });

  test("should accept valid comment bodies", () => {
    const _1: CommentBody = {
      version: 1,
      content: [],
    };
    const _2: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "Hello world" }],
        },
      ],
    };
    const _3: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            {
              text: "Hello",
              bold: true,
              italic: true,
              strikethrough: false,
              code: false,
            },
          ],
        },
      ],
    };
    const _4: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ type: "mention", kind: "user", id: "user123" }],
        },
      ],
    };
    const _5: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            {
              type: "mention",
              kind: "group",
              id: "group123",
            },
          ],
        },
      ],
    };
    const _6: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            {
              type: "mention",
              kind: "group",
              id: "group123",
              userIds: ["user1", "user2"],
            },
          ],
        },
      ],
    };
    const _7: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ type: "link", url: "https://liveblocks.io" }],
        },
      ],
    };
    const _8: CommentBody = {
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
    };
    const _9: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "First paragraph" }],
        },
        {
          type: "paragraph",
          children: [{ text: "Second paragraph" }],
        },
      ],
    };
    const _10: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Hey " },
            { type: "mention", kind: "user", id: "user123" },
            { text: ", can you look at " },
            {
              type: "link",
              url: "https://liveblocks.io",
              text: "this link",
            },
            { text: "?" },
          ],
        },
      ],
    };
    const _11: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Bold text", bold: true },
            { text: " and " },
            { text: "italic text", italic: true },
          ],
        },
        {
          type: "paragraph",
          children: [
            { text: "Code: ", code: true },
            { text: "const x = 1;", code: true },
          ],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "mention",
              kind: "group",
              id: "team1",
              userIds: ["user1", "user2", "user3"],
            },
          ],
        },
      ],
    };
  });
});
