import { anything } from "decoders";
import { assertEq } from "tosti";
import { describe, test, vi } from "vitest";

import type { ResolveGroupsInfoArgs, ResolveUsersArgs } from "../../client";
import type { CommentBody } from "../../protocol/Comments";
import {
  getMentionsFromCommentBody,
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
        { type: "mention", kind: "user", id: "chris" },
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
        { text: ", " },
        { type: "mention", kind: "user", id: "vincent" },
        { text: " and " },
        { type: "mention", kind: "group", id: "engineering" },
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
        { type: "mention", kind: "user", id: "chris" },
        { text: ", " },
        { type: "mention", kind: "user", id: "vincent" },
        { text: ", " },
        { type: "mention", kind: "user", id: "$unknownUser" },
        { text: " and " },
        { type: "mention", kind: "group", id: "engineering" },
      ],
    },
    {
      type: "paragraph",
      children: [
        { type: "mention", kind: "user", id: "nimesh" },
        {
          type: "mention",
          kind: "group",
          id: "here",
          userIds: ["nimesh", "florent"],
        },
        { type: "mention", kind: "group", id: "$unknownGroup" },
      ],
    },
  ],
};

const commentBodyWihValidUrls: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "This is a " },
        { type: "link", url: "https://liveblocks.io", text: "link" },
        { text: " and " },
        {
          type: "link",
          url: "www.liveblocks.io/docs?query=123#hash",
        },
      ],
    },
  ],
};

const commentBodyWihInvalidUrls: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "This is a " },
        { type: "link", url: "javascript:alert('xss')", text: "link" },
        { text: " and " },
        {
          type: "link",
          url: "data:text/html,<script>alert('xss')</script>",
          text: "another one",
        },
      ],
    },
  ],
};

function resolveUsers({ userIds }: ResolveUsersArgs) {
  return userIds.map((userId) => {
    if (userId.startsWith("$")) {
      return undefined;
    }

    return {
      name: capitalize(userId),
    };
  });
}

function resolveGroupsInfo({ groupIds }: ResolveGroupsInfoArgs) {
  return groupIds.map((groupId) => {
    if (groupId.startsWith("$")) {
      return undefined;
    }

    return {
      name: capitalize(groupId),
    };
  });
}

describe("getMentionsFromCommentBody", () => {
  test("returns an array of all mentions", () => {
    assertEq(getMentionsFromCommentBody(commentBodyWithMentions), [
      { type: "mention", kind: "user", id: "chris" },
      { type: "mention", kind: "user", id: "vincent" },
      { type: "mention", kind: "user", id: "$unknownUser" },
      { type: "mention", kind: "group", id: "engineering" },
      { type: "mention", kind: "user", id: "nimesh" },
      {
        type: "mention",
        kind: "group",
        id: "here",
        userIds: ["nimesh", "florent"],
      },
      { type: "mention", kind: "group", id: "$unknownGroup" },
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

    assertEq(getMentionsFromCommentBody(commentBodyWithoutMentions), []);
  });
});

describe("stringifyCommentBody", () => {
  const commentBodyFixturesStringifiedPlain = [
    "Hello world and @chris",
    "Hello world, @vincent and @engineering\nhttps://liveblocks.io\nLiveblocks",
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index], stringified] as const
  );
  const commentBodyFixturesStringifiedHtml = [
    "<p>Hello <strong>world</strong> and <span data-mention>@chris</span></p>",
    '<p>Hello <em><strong>world</strong></em>, <span data-mention>@vincent</span> and <span data-mention>@engineering</span></p>\n<p><a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">https://liveblocks.io</a></p>\n<p><a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">Liveblocks</a></p>',
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index], stringified] as const
  );
  const commentBodyFixturesStringifiedMarkdown = [
    "Hello **world** and @chris",
    "Hello _**world**_, @vincent and @engineering\n\n[https://liveblocks.io](https://liveblocks.io)\n\n[Liveblocks](https://liveblocks.io)",
    "",
    "",
    "",
    "",
    "",
  ].map(
    (stringified, index) =>
      [...commentBodyFixtures[index], stringified] as const
  );

  test.each(commentBodyFixturesStringifiedPlain)(
    "stringifies %s as plain text",
    async (_, commentBody, stringified) => {
      await assertEq(stringifyCommentBody(commentBody), stringified);
    }
  );

  test.each(commentBodyFixturesStringifiedHtml)(
    "stringifies %s as HTML",
    async (_, commentBody, stringified) => {
      await assertEq(
        stringifyCommentBody(commentBody, { format: "html" }),
        stringified
      );
    }
  );

  test.each(commentBodyFixturesStringifiedMarkdown)(
    "stringifies %s as Markdown",
    async (_, commentBody, stringified) => {
      await assertEq(
        stringifyCommentBody(commentBody, { format: "markdown" }),
        stringified
      );
    }
  );

  test("should escape html entities - text", async () => {
    const commentBodyHtml: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "Trying with <b>inject html</b> !" }],
        },
      ],
    };

    await assertEq(
      stringifyCommentBody(commentBodyHtml, { format: "html" }),
      "<p>Trying with &lt;b&gt;inject html&lt;/b&gt; !</p>"
    );
  });

  test("should escape html entities - link w/ text", async () => {
    const commentBodyHtml: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Trying with " },
            {
              type: "link",
              url: "https://www.liveblocks.io",
              text: "<script>injected script</script>",
            },
            { text: " !" },
          ],
        },
      ],
    };
    await assertEq(
      stringifyCommentBody(commentBodyHtml, { format: "html" }),
      '<p>Trying with <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer">&lt;script&gt;injected script&lt;/script&gt;</a> !</p>'
    );
  });

  test("should escape html entities - mention w/ name", async () => {
    const commentBodyHtml: CommentBody = {
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [
            { text: "Hello" },
            { text: " " },
            { type: "mention", kind: "user", id: "user-0" },
            { text: " " },
            { text: "!" },
          ],
        },
      ],
    };

    await assertEq(
      stringifyCommentBody(commentBodyHtml, {
        format: "html",
        resolveUsers: ({ userIds }) => {
          return userIds.map((userId) => {
            return {
              id: userId,
              name: "<style>injected style</style>",
            };
          });
        },
      }),
      "<p>Hello <span data-mention>@&lt;style&gt;injected style&lt;/style&gt;</span> !</p>"
    );
  });

  test("escapes html - in elements", async () => {
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

    await assertEq(
      stringifyCommentBody(commentBodyHtml, { format: "html" }),
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

    await assertEq(
      stringifyCommentBody(commentBodyMarkdown, { format: "markdown" }),
      "Hello _**\\*\\*world\\*\\***_ and [https://liveblocks.io](https://liveblocks.io)"
    );
  });

  test("should preserve valid URLs", async () => {
    await assertEq(
      stringifyCommentBody(commentBodyWihValidUrls, { format: "html" }),
      '<p>This is a <a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">link</a> and <a href="https://www.liveblocks.io/docs?query=123#hash" target="_blank" rel="noopener noreferrer">www.liveblocks.io/docs?query=123#hash</a></p>'
    );
    await assertEq(
      stringifyCommentBody(commentBodyWihValidUrls, { format: "markdown" }),
      "This is a [link](https://liveblocks.io) and [www.liveblocks.io/docs?query=123\\#hash](https://www.liveblocks.io/docs?query=123\\#hash)"
    );
    await assertEq(
      stringifyCommentBody(commentBodyWihValidUrls, { format: "plain" }),
      "This is a link and www.liveblocks.io/docs?query=123#hash"
    );
  });

  test("should replace invalid URLs with plain text", async () => {
    await assertEq(
      stringifyCommentBody(commentBodyWihInvalidUrls, { format: "html" }),
      "<p>This is a link and another one</p>"
    );
    await assertEq(
      stringifyCommentBody(commentBodyWihInvalidUrls, { format: "markdown" }),
      "This is a link and another one"
    );
    await assertEq(
      stringifyCommentBody(commentBodyWihInvalidUrls, { format: "plain" }),
      "This is a link and another one"
    );
  });

  const resolveInfoExpected = [
    [
      "plain text",
      "plain",
      "Hello @Chris, @Vincent, @$unknownUser and @Engineering\n@Nimesh@Here@$unknownGroup",
    ],
    [
      "HTML",
      "html",
      "<p>Hello <span data-mention>@Chris</span>, <span data-mention>@Vincent</span>, <span data-mention>@$unknownUser</span> and <span data-mention>@Engineering</span></p>\n<p><span data-mention>@Nimesh</span><span data-mention>@Here</span><span data-mention>@$unknownGroup</span></p>",
    ],
    [
      "Markdown",
      "markdown",
      "Hello @Chris, @Vincent, @$unknownUser and @Engineering\n\n@Nimesh@Here@$unknownGroup",
    ],
  ] as const;

  test.each(resolveInfoExpected)(
    "resolves users and groups as %s",
    async (_, format, stringified) => {
      await assertEq(
        stringifyCommentBody(commentBodyWithMentions, {
          format,
          resolveUsers,
          resolveGroupsInfo,
        }),
        stringified
      );
    }
  );

  test("accepts a custom separator between blocks", async () => {
    await assertEq(
      stringifyCommentBody(commentBodyWithMultipleParagraphs, {
        separator: "\n\n\n",
      }),
      "Hello world, @vincent and @engineering\n\n\nhttps://liveblocks.io\n\n\nLiveblocks"
    );
  });

  test("accepts custom elements", async () => {
    await assertEq(
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
            return `<Link to="${href}">${element.text ?? element.url}</Link>`;
          },
          mention: ({ element }) => {
            // prettier-ignore
            return `<Mention>@${element.id}</Mention>`;
          },
        },
      }),
      '<Paragraph>Hello world, <Mention>@vincent</Mention> and <Mention>@engineering</Mention></Paragraph>\n<Paragraph><Link to="https://liveblocks.io">https://liveblocks.io</Link></Paragraph>\n<Paragraph><Link to="https://liveblocks.io">Liveblocks</Link></Paragraph>'
    );
  });

  test("provides arguments to custom elements", async () => {
    const paragraph = vi.fn();
    const text = vi.fn();
    const link = vi.fn();
    const mention = vi.fn();

    await stringifyCommentBody(commentBodyWithMultipleParagraphs, {
      elements: {
        paragraph,
        text,
        link,
        mention,
      },
      resolveUsers,
      resolveGroupsInfo,
    });

    const firstParagraph = commentBodyWithMultipleParagraphs.content[0];
    const secondParagraph = commentBodyWithMultipleParagraphs.content[1];

    assertEq(paragraph.mock.calls, [
      [{ children: "", element: firstParagraph }, 0],
      [{ children: "", element: secondParagraph }, 1],
      anything, // XXX This 3rd call wasn't asserted before, should we?
    ]);

    assertEq(text.mock.calls, [
      [{ element: firstParagraph.children[0] }, 0],
      [{ element: firstParagraph.children[1] }, 1],
      [{ element: firstParagraph.children[2] }, 2],
      anything, // XXX This 4th call wasn't asserted before, should we?
    ]);

    assertEq(link.mock.calls, [
      [
        { element: secondParagraph.children[0], href: "https://liveblocks.io" },
        0,
      ],
      anything, // XXX This 2nd call wasn't asserted before, should we?
    ]);

    assertEq(mention.mock.calls, [
      [
        {
          element: firstParagraph.children[3],
          user: { name: "Vincent" },
          group: undefined,
        },
        3,
      ],
      [
        {
          element: firstParagraph.children[5],
          user: undefined,
          group: { name: "Engineering" },
        },
        5,
      ],
    ]);
  });
});
