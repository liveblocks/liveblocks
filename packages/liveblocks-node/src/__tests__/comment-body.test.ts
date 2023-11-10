import type { CommentBody } from "@liveblocks/core";

import {
  getMentionIdsFromCommentBody,
  stringifyCommentBody,
} from "../comment-body";

const commentBody: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Hello " },
        { text: "world", bold: true },
        { text: " and " },
        { type: "mention", id: "1234" },
      ],
    },
  ],
};

const commentBodyMultipleParagraphs: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Hello " },
        { text: "world", italic: true, bold: true },
        { text: " and " },
        { type: "mention", id: "1234" },
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
  ],
};

const commentBodyEmpty: CommentBody = {
  version: 1,
  content: [],
};

const commentBodyEmptyParagraph: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [],
    },
  ],
};

const commentBodyEmptyInlineElements: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "" },
        { text: "", bold: true },
        { text: "", bold: true, italic: true, code: true, strikethrough: true },
      ],
    },
  ],
};

const commentBodyUnknownBlockElement: CommentBody = {
  version: 1,
  content: [
    {
      // @ts-expect-error - Deliberately using an unknown block element
      type: "unknown",
      children: [{ text: "Hello " }, { text: "world", bold: true }],
    },
  ],
};

const commentBodyUnknownInlineElement: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      // @ts-expect-error - Deliberately using an unknown inline element
      children: [{ type: "unknown", code: "code" }],
    },
  ],
};

const commentBodyFixtures: [string, CommentBody][] = [
  ["a comment body", commentBody],
  ["a comment body with multiple paragraphs", commentBodyMultipleParagraphs],
  ["an empty comment body", commentBodyEmpty],
  ["a comment body with an empty paragraph", commentBodyEmptyParagraph],
  ["a comment body with empty inline elements", commentBodyEmptyInlineElements],
  [
    "a comment body with an unknown block element",
    commentBodyUnknownBlockElement,
  ],
  [
    "a comment body with an unknown inline element",
    commentBodyUnknownInlineElement,
  ],
];

describe("getMentionIdsFromCommentBody", () => {
  const commentBodyWithMentions: CommentBody = {
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          { text: "Hello " },
          { type: "mention", id: "0" },
          { text: " and " },
          { type: "mention", id: "1" },
        ],
      },
      {
        type: "paragraph",
        children: [{ type: "mention", id: "2" }],
      },
    ],
  };

  const commentBodyWithoutMentions: CommentBody = {
    version: 1,
    content: [
      {
        type: "paragraph",
        children: [
          { text: "Hello " },
          { text: "world", bold: true },
          { text: " and " },
          {
            type: "link",
            url: "https://liveblocks.io",
          },
        ],
      },
    ],
  };

  test("returns an array of all mentions' IDs", () => {
    expect(getMentionIdsFromCommentBody(commentBodyWithMentions)).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  test("returns an empty array if there are no mentions", () => {
    expect(getMentionIdsFromCommentBody(commentBodyWithoutMentions)).toEqual(
      []
    );
  });
});

describe("stringifyCommentBody", () => {
  const commentBodyFixturesStringifiedPlain = [
    "Hello world and @1234",
    "Hello world and @1234\nhttps://liveblocks.io",
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index]!, stringified] as const
  );
  const commentBodyFixturesStringifiedHtml = [
    "<p>Hello <strong>world</strong> and <span data-mention>@1234</span></p>",
    '<p>Hello <em><strong>world</strong></em> and <span data-mention>@1234</span></p>\n<p><a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">https://liveblocks.io</a></p>',
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index]!, stringified] as const
  );
  const commentBodyFixturesStringifiedMarkdown = [
    "Hello **world** and @1234",
    "Hello _**world**_ and @1234\n\n[https://liveblocks.io](https://liveblocks.io)",
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index]!, stringified] as const
  );

  test.each(commentBodyFixturesStringifiedPlain)(
    "stringifies %s as plain text",
    async (_, commentBody, stringified) => {
      await expect(stringifyCommentBody(commentBody)).resolves.toBe(
        stringified
      );
    }
  );

  test.each(commentBodyFixturesStringifiedHtml)(
    "stringifies %s as HTML",
    async (_, commentBody, stringified) => {
      await expect(
        stringifyCommentBody(commentBody, { format: "html" })
      ).resolves.toBe(stringified);
    }
  );

  test.each(commentBodyFixturesStringifiedMarkdown)(
    "stringifies %s as Markdown",
    async (_, commentBody, stringified) => {
      await expect(
        stringifyCommentBody(commentBody, { format: "markdown" })
      ).resolves.toBe(stringified);
    }
  );
});
