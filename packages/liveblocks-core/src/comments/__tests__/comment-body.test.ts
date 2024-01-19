import type { CommentBodyResolveUsersArgs } from "../comment-body";
import {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "../comment-body";
import type { CommentBody } from "../types/CommentBody";

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
        { type: "mention", id: "chris" },
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

function resolveUsers({ userIds }: CommentBodyResolveUsersArgs) {
  return userIds.map((userId) => {
    return {
      name: capitalize(userId),
    };
  });
}

describe("getMentionedIdsFromCommentBody", () => {
  test("returns an array of all mentions' IDs", () => {
    expect(getMentionedIdsFromCommentBody(commentBodyWithMentions)).toEqual([
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

    expect(getMentionedIdsFromCommentBody(commentBodyWithoutMentions)).toEqual(
      []
    );
  });
});

describe("stringifyCommentBody", () => {
  const commentBodyFixturesStringifiedPlain = [
    "Hello world and @chris",
    "Hello world and @vincent\nhttps://liveblocks.io",
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
    "<p>Hello <strong>world</strong> and <span data-mention>@chris</span></p>",
    '<p>Hello <em><strong>world</strong></em> and <span data-mention>@vincent</span></p>\n<p><a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">https://liveblocks.io</a></p>',
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
    "Hello **world** and @chris",
    "Hello _**world**_ and @vincent\n\n[https://liveblocks.io](https://liveblocks.io)",
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

  const resolveUsersExpected = [
    ["plain text", "plain", "Hello @Chris and @Vincent\n@Nimesh"],
    [
      "HTML",
      "html",
      "<p>Hello <span data-mention>@Chris</span> and <span data-mention>@Vincent</span></p>\n<p><span data-mention>@Nimesh</span></p>",
    ],
    ["Markdown", "markdown", "Hello @Chris and @Vincent\n\n@Nimesh"],
  ] as const;

  test.each(resolveUsersExpected)(
    "resolves user IDs as %s",
    async (_, format, stringified) => {
      await expect(
        stringifyCommentBody(commentBodyWithMentions, {
          format,
          resolveUsers,
        })
      ).resolves.toBe(stringified);
    }
  );

  test("accepts a custom separator between blocks", async () => {
    await expect(
      stringifyCommentBody(commentBodyWithMultipleParagraphs, {
        separator: "\n\n\n",
      })
    ).resolves.toBe("Hello world and @vincent\n\n\nhttps://liveblocks.io");
  });

  test("accepts custom elements", async () => {
    await expect(
      stringifyCommentBody(commentBodyWithMultipleParagraphs, {
        elements: {
          paragraph: ({ children }) => {
            // prettier-ignore
            return `<Paragraph>${children}</Paragraph>`;
          },
          text: ({ element }) => {
            return element.text;
          },
          link: ({ element, href }) => {
            // prettier-ignore
            return `<Link to="${href}">${element.url}</Link>`;
          },
          mention: ({ element }) => {
            // prettier-ignore
            return `<Mention>@${element.id}</Mention>`;
          },
        },
      })
    ).resolves.toBe(
      '<Paragraph>Hello world and <Mention>@vincent</Mention></Paragraph>\n<Paragraph><Link to="https://liveblocks.io">https://liveblocks.io</Link></Paragraph>'
    );
  });

  test("provides arguments to custom elements", async () => {
    const paragraph = jest.fn();
    const text = jest.fn();
    const link = jest.fn();
    const mention = jest.fn();

    await stringifyCommentBody(commentBodyWithMultipleParagraphs, {
      elements: {
        paragraph,
        text,
        link,
        mention,
      },
      resolveUsers,
    });

    const firstParagraph = commentBodyWithMultipleParagraphs.content[0]!;
    const secondParagraph = commentBodyWithMultipleParagraphs.content[1]!;

    expect(paragraph).toHaveBeenNthCalledWith(
      1,
      {
        children: "",
        element: firstParagraph,
      },
      0
    );
    expect(paragraph).toHaveBeenNthCalledWith(
      2,
      {
        children: "",
        element: secondParagraph,
      },
      1
    );

    expect(text).toHaveBeenNthCalledWith(
      1,
      {
        element: firstParagraph.children[0],
      },
      0
    );
    expect(text).toHaveBeenNthCalledWith(
      2,
      {
        element: firstParagraph.children[1],
      },
      1
    );
    expect(text).toHaveBeenNthCalledWith(
      3,
      {
        element: firstParagraph.children[2],
      },
      2
    );

    expect(link).toHaveBeenNthCalledWith(
      1,
      {
        element: secondParagraph.children[0],
        href: "https://liveblocks.io",
      },
      0
    );

    expect(mention).toHaveBeenNthCalledWith(
      1,
      {
        element: firstParagraph.children[3],
        user: {
          name: "Vincent",
        },
      },
      3
    );
  });
});
