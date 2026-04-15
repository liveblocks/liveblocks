import type { CommentBody } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

describe("CommentBody", () => {
  test("should reject invalid required properties", () => {
    // @ts-expect-error - `version` and `content` are required
    ({}) satisfies CommentBody;
    // @ts-expect-error - `content` is required
    ({ version: 1 }) satisfies CommentBody;
    // @ts-expect-error - `version` is required
    ({ content: [] }) satisfies CommentBody;
    // @ts-expect-error - `version` must be 1
    ({ version: 2, content: [] }) satisfies CommentBody;
    // @ts-expect-error - `version` must be a number
    ({ version: "1", content: [] }) satisfies CommentBody;
    // @ts-expect-error - `content` must be an array
    ({ version: 1, content: "text" }) satisfies CommentBody;
    // @ts-expect-error - `content` must be an array
    ({ version: 1, content: {} }) satisfies CommentBody;
    // @ts-expect-error - `content` must be an array of valid block elements
    ({ version: 1, content: [{ type: "invalid" }] }) satisfies CommentBody;
  });

  test("should reject invalid block elements", () => {
    /**
     * Invalid paragraph element
     */

    // @ts-expect-error - `children` is required
    ({ version: 1, content: [{ type: "paragraph" }] }) satisfies CommentBody;
    ({
      version: 1,
      // @ts-expect-error - `children` must be an array
      content: [{ type: "paragraph", children: "text" }],
    }) satisfies CommentBody;
    ({
      version: 1,
      // @ts-expect-error - `children` must be an array of valid inline elements
      content: [{ type: "paragraph", children: [{}] }],
    }) satisfies CommentBody;
  });

  test("should reject invalid inline elements", () => {
    /**
     * Invalid text element
     */

    ({
      version: 1,
      // @ts-expect-error - `text` must be a string
      content: [{ type: "paragraph", children: [{ text: 123 }] }],
    }) satisfies CommentBody;
    ({
      version: 1,
      // @ts-expect-error - text elements must include `text`
      content: [{ type: "paragraph", children: [{ bold: true }] }],
    }) satisfies CommentBody;

    /**
     * Invalid mention element
     */

    ({
      version: 1,
      // @ts-expect-error - `kind` and `id` are required
      content: [{ type: "paragraph", children: [{ type: "mention" }] }],
    }) satisfies CommentBody;
    ({
      version: 1,
      content: [
        // @ts-expect-error - mention nodes require `kind`, and `id` must be a string
        { type: "paragraph", children: [{ type: "mention", id: 123 }] },
      ],
    }) satisfies CommentBody;
    ({
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - `kind` must be either "user" or "group"
          children: [{ type: "mention", kind: "invalid", id: "user1" }],
        },
      ],
    }) satisfies CommentBody;
    ({
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
    }) satisfies CommentBody;
    ({
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - Typo of `text: "mention"` instead of `type: "mention"` so it's a text element (which can't have `kind` and `id`)
          children: [{ text: "mention", kind: "user", id: "user123" }],
        },
      ],
    }) satisfies CommentBody;

    /**
     * Invalid link element
     */

    ({
      version: 1,
      // @ts-expect-error - `url` is required
      content: [{ type: "paragraph", children: [{ type: "link" }] }],
    }) satisfies CommentBody;
    ({
      version: 1,
      // @ts-expect-error - `url` must be a string
      content: [{ type: "paragraph", children: [{ type: "link", url: 123 }] }],
    }) satisfies CommentBody;
    ({
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - `text` must be a string
          children: [{ type: "link", url: "https://liveblocks.io", text: 123 }],
        },
      ],
    }) satisfies CommentBody;
    ({
      version: 1,
      content: [
        {
          type: "paragraph",
          // @ts-expect-error - Typo of `text: "link"` instead of `type: "link"` so it's a text element (which can't have `url`)
          children: [{ text: "link", url: "https://liveblocks.io" }],
        },
      ],
    }) satisfies CommentBody;
  });

  test("should accept valid comment bodies", () => {
    expectTypeOf({
      version: 1,
      content: [],
    } satisfies CommentBody).toExtend<CommentBody>();

    expectTypeOf({
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "Hello world" }],
        },
      ],
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ type: "mention", kind: "user", id: "user123" }],
        },
      ],
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();

    expectTypeOf({
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ type: "link", url: "https://liveblocks.io" }],
        },
      ],
    } satisfies CommentBody).toExtend<CommentBody>();

    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();

    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();
    expectTypeOf({
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
    } satisfies CommentBody).toExtend<CommentBody>();
  });
});
