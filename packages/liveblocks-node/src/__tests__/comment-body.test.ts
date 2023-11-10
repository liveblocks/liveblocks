import type { CommentBody } from "@liveblocks/core";

import {
  getMentionIdsFromCommentBody,
  stringifyCommentBody,
} from "../comment-body";

function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

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

const commentBodyWithMultipleParagraphs: CommentBody = {
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

const commentBodyWithEmptyParagraph: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [],
    },
  ],
};

const commentBodyWithEmptyInlineElements: CommentBody = {
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

const commentBodyWithUnknownBlockElement: CommentBody = {
  version: 1,
  content: [
    {
      // @ts-expect-error - Deliberately using an unknown block element
      type: "unknown",
      children: [{ text: "Hello " }, { text: "world", bold: true }],
    },
  ],
};

const commentBodyWithUnknownInlineElement: CommentBody = {
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
  [
    "a comment body with multiple paragraphs",
    commentBodyWithMultipleParagraphs,
  ],
  ["an empty comment body", commentBodyEmpty],
  ["a comment body with an empty paragraph", commentBodyWithEmptyParagraph],
  [
    "a comment body with empty inline elements",
    commentBodyWithEmptyInlineElements,
  ],
  [
    "a comment body with an unknown block element",
    commentBodyWithUnknownBlockElement,
  ],
  [
    "a comment body with an unknown inline element",
    commentBodyWithUnknownInlineElement,
  ],
];

const commentBodyWithMentions: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Hello " },
        { type: "mention", id: "chris" },
        { text: " and " },
        { type: "mention", id: "vincent" },
      ],
    },
    {
      type: "paragraph",
      children: [{ type: "mention", id: "nimesh" }],
    },
  ],
};

describe("getMentionIdsFromCommentBody", () => {
  test("returns an array of all mentions' IDs", () => {
    expect(getMentionIdsFromCommentBody(commentBodyWithMentions)).toEqual([
      "chris",
      "vincent",
      "nimesh",
    ]);
  });

  test("returns an empty array if there are no mentions", () => {
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

  test("escapes HTML", async () => {
    const commentBodyHtml: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Hello " },
            { text: "<strong>world</strong>", bold: true, italic: true },
            { text: " and " },
            {
              type: "link",
              url: "https://liveblocks.io",
            },
          ],
        },
      ],
    };

    await expect(
      stringifyCommentBody(commentBodyHtml, { format: "html" })
    ).resolves.toBe(
      '<p>Hello <em><strong>&lt;strong&gt;world&lt;/strong&gt;</strong></em> and <a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">https://liveblocks.io</a></p>'
    );
  });

  test("escapes Markdown", async () => {
    const commentBodyMarkdown: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Hello " },
            { text: "**world**", bold: true, italic: true },
            { text: " and " },
            {
              type: "link",
              url: "https://liveblocks.io",
            },
          ],
        },
      ],
    };

    await expect(
      stringifyCommentBody(commentBodyMarkdown, { format: "markdown" })
    ).resolves.toBe(
      "Hello _**\\*\\*world\\*\\***_ and [https://liveblocks.io](https://liveblocks.io)"
    );
  });

  test("accepts a custom separator between blocks", async () => {
    await expect(
      stringifyCommentBody(commentBodyWithMultipleParagraphs, {
        separator: "\n\n\n",
      })
    ).resolves.toBe("Hello world and @1234\n\n\nhttps://liveblocks.io");
  });

  test("resolves user IDs", async () => {
    await expect(
      stringifyCommentBody(commentBodyWithMentions, {
        resolveUsers: ({ userIds }) => {
          return userIds.map((userId) => {
            return {
              name: capitalize(userId),
            };
          });
        },
      })
    ).resolves.toBe("Hello @Chris and @Vincent\n@Nimesh");
  });
});
