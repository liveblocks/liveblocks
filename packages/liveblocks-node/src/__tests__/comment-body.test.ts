import { describe, expect, test } from "vitest";

import { markdownToCommentBody } from "../comment-body";

describe("markdownToCommentBody", () => {
  describe("paragraphs", () => {
    test("converts paragraphs separated by a blank line", () => {
      expect(markdownToCommentBody("Hello world\n\nSecond paragraph")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Hello world" }],
          },
          {
            type: "paragraph",
            children: [{ text: "Second paragraph" }],
          },
        ],
      });
    });

    test("returns empty content for empty markdown", () => {
      expect(markdownToCommentBody("")).toEqual({
        version: 1,
        content: [],
      });
    });

    test("preserves soft line breaks inside a paragraph", () => {
      expect(markdownToCommentBody("line1  \nline2")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "line1" }, { text: "\n" }, { text: "line2" }],
          },
        ],
      });
    });

    test("drops horizontal rules between paragraphs", () => {
      expect(markdownToCommentBody("a\n\n---\n\nb")).toEqual({
        version: 1,
        content: [
          { type: "paragraph", children: [{ text: "a" }] },
          { type: "paragraph", children: [{ text: "b" }] },
        ],
      });
    });
  });

  describe("headings and blockquotes", () => {
    test("converts headings and blockquotes to paragraphs", () => {
      expect(markdownToCommentBody("# Heading\n\n> Quote")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "# " }, { text: "Heading" }],
          },
          {
            type: "paragraph",
            children: [{ text: "> " }, { text: "Quote" }],
          },
        ],
      });
    });

    test("flattens nested blockquotes into stacked paragraphs", () => {
      expect(markdownToCommentBody("> outer\n> > inner")).toEqual({
        version: 1,
        content: [
          { type: "paragraph", children: [{ text: "> " }, { text: "outer" }] },
          {
            type: "paragraph",
            children: [{ text: "> > " }, { text: "inner" }],
          },
        ],
      });
    });

    test("flattens blockquote that wraps a list", () => {
      expect(markdownToCommentBody("> - item")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "> - " }, { text: "item" }],
          },
        ],
      });
    });
  });

  describe("inline emphasis", () => {
    test("converts bold, italic, strikethrough, and code spans", () => {
      expect(
        markdownToCommentBody("**bold** _italic_ ~~deleted~~ `code`")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "bold", bold: true },
              { text: " " },
              { text: "italic", italic: true },
              { text: " " },
              { text: "deleted", strikethrough: true },
              { text: " " },
              { text: "code", code: true },
            ],
          },
        ],
      });
    });

    test("merges nested emphasis into bold and italic on one text node", () => {
      expect(markdownToCommentBody("***both***")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "both", bold: true, italic: true }],
          },
        ],
      });
    });
  });

  describe("links", () => {
    test("converts links without parsing mentions in link labels", () => {
      expect(
        markdownToCommentBody("[Hello @chris](https://liveblocks.io)")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://liveblocks.io",
                text: "Hello @chris",
              },
            ],
          },
        ],
      });
    });

    test("maps angle-bracket autolinks to link elements", () => {
      expect(markdownToCommentBody("<https://example.com>")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://example.com",
                text: "https://example.com",
              },
            ],
          },
        ],
      });
    });

    test("resolves reference-style links", () => {
      expect(
        markdownToCommentBody("[label][ref]\n\n[ref]: https://y.com")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://y.com",
                text: "label",
              },
            ],
          },
        ],
      });
    });

    test("parses inline links with titles like normal links", () => {
      expect(markdownToCommentBody('[text](https://b.com "title")')).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://b.com",
                text: "text",
              },
            ],
          },
        ],
      });
    });

    test("uses plain link text when label had strikethrough", () => {
      expect(markdownToCommentBody("[~~x~~](https://a.com)")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://a.com",
                text: "x",
              },
            ],
          },
        ],
      });
    });

    test("drops formatting on link labels when emitting link elements", () => {
      expect(markdownToCommentBody("[**bold label**](https://a.com)")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://a.com",
                text: "bold label",
              },
            ],
          },
        ],
      });
    });

    test("drops outer emphasis when it only wraps a link", () => {
      expect(markdownToCommentBody("**[bold link](https://a.com)**")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://a.com",
                text: "bold link",
              },
            ],
          },
        ],
      });
    });

    test("allows a link followed by a mention in the same paragraph", () => {
      expect(markdownToCommentBody("see [doc](https://y.com) @pierre")).toEqual(
        {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                { text: "see " },
                {
                  type: "link",
                  url: "https://y.com",
                  text: "doc",
                },
                { text: " " },
                { type: "mention", kind: "user", id: "pierre" },
              ],
            },
          ],
        }
      );
    });

    test("falls back to plain text for unsafe links", () => {
      expect(markdownToCommentBody("[Click](javascript:alert(1))")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Click" }],
          },
        ],
      });
    });

    test("does not parse mentions in unsafe link labels", () => {
      expect(markdownToCommentBody("[Hi @chris](javascript:alert(1))")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Hi @chris" }],
          },
        ],
      });
    });
  });

  describe("mentions", () => {
    test("converts mentions in normal text", () => {
      expect(markdownToCommentBody("Hello @chris and @pierre.dev-1")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "Hello " },
              { type: "mention", kind: "user", id: "chris" },
              { text: " and " },
              { type: "mention", kind: "user", id: "pierre.dev-1" },
            ],
          },
        ],
      });
    });

    test("does not convert email addresses to mentions", () => {
      expect(
        markdownToCommentBody("Email alicia@example.com or @alicia")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "Email " },
              { text: "alicia@example.com" },
              { text: " or " },
              { type: "mention", kind: "user", id: "alicia" },
            ],
          },
        ],
      });
    });

    test("does not treat escaped @ as a mention", () => {
      expect(markdownToCommentBody("email \\@chris")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "email " }, { text: "@" }, { text: "chris" }],
          },
        ],
      });
    });

    test("preserves formatting around mentions", () => {
      expect(
        markdownToCommentBody("**Hello @stacy** and `@not-a-mention`")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "Hello ", bold: true },
              { type: "mention", kind: "user", id: "stacy" },
              { text: " and " },
              { text: "@not-a-mention", code: true },
            ],
          },
        ],
      });
    });

    test("supports a paragraph that is only a mention", () => {
      expect(markdownToCommentBody("@alicia")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ type: "mention", kind: "user", id: "alicia" }],
          },
        ],
      });
    });
  });

  describe("lists", () => {
    test("converts flat lists with text prefixes", () => {
      expect(markdownToCommentBody("- First\n- Second\n\n3. Third")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "First" }],
          },
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "Second" }],
          },
          {
            type: "paragraph",
            children: [{ text: "3. " }, { text: "Third" }],
          },
        ],
      });
    });

    test("indents nested unordered lists", () => {
      expect(markdownToCommentBody("- a\n  - nested")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "a" }],
          },
          {
            type: "paragraph",
            children: [{ text: "  - " }, { text: "nested" }],
          },
        ],
      });
    });

    test("indents each further nesting level by two spaces", () => {
      expect(markdownToCommentBody("- a\n  - b\n    - c")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "a" }],
          },
          {
            type: "paragraph",
            children: [{ text: "  - " }, { text: "b" }],
          },
          {
            type: "paragraph",
            children: [{ text: "    - " }, { text: "c" }],
          },
        ],
      });
    });

    test("indents ordered list nested under unordered list", () => {
      expect(markdownToCommentBody("- a\n  1. nested")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "a" }],
          },
          {
            type: "paragraph",
            children: [{ text: "  1. " }, { text: "nested" }],
          },
        ],
      });
    });

    test("keeps task list checkbox markers in list prefixes", () => {
      expect(markdownToCommentBody("- [ ] todo\n- [x] done")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- [ ] " }, { text: "todo" }],
          },
          {
            type: "paragraph",
            children: [{ text: "- [x] " }, { text: "done" }],
          },
        ],
      });
    });

    test("flattens lazy list continuation into a separate paragraph", () => {
      expect(markdownToCommentBody("- item\n\n  more")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "- " }, { text: "item" }],
          },
          {
            type: "paragraph",
            children: [{ text: "more" }],
          },
        ],
      });
    });

    test("indents unordered sublist under ordered list", () => {
      expect(markdownToCommentBody("1. one\n   - sub")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "1. " }, { text: "one" }],
          },
          {
            type: "paragraph",
            children: [{ text: "  - " }, { text: "sub" }],
          },
        ],
      });
    });

    test("preserves explicit ordered list markers", () => {
      expect(markdownToCommentBody("2. second\n3. third")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "2. " }, { text: "second" }],
          },
          {
            type: "paragraph",
            children: [{ text: "3. " }, { text: "third" }],
          },
        ],
      });
    });
  });

  describe("tables and images", () => {
    test("converts tables to pipe-separated text rows", () => {
      expect(
        markdownToCommentBody("| Name | Age |\n| --- | --- |\n| Ada | 36 |")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "| Name | Age |" }],
          },
          {
            type: "paragraph",
            children: [{ text: "| --- | --- |" }],
          },
          {
            type: "paragraph",
            children: [{ text: "| Ada | 36 |" }],
          },
        ],
      });
    });

    test("keeps images as raw markdown", () => {
      expect(
        markdownToCommentBody(
          "![Diagram](https://example.com/diagram.png)\n\n![](https://example.com/image.png)"
        )
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "![Diagram](https://example.com/diagram.png)" }],
          },
          {
            type: "paragraph",
            children: [{ text: "![](https://example.com/image.png)" }],
          },
        ],
      });
    });

    test("keeps raw markdown for images with unsafe URLs", () => {
      expect(markdownToCommentBody("![Preview](javascript:alert(1))")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "![Preview](javascript:alert(1))" }],
          },
        ],
      });
    });

    test("does not parse mentions inside raw image markdown", () => {
      expect(markdownToCommentBody("![Hi @chris](javascript:alert(1))")).toEqual(
        {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [{ text: "![Hi @chris](javascript:alert(1))" }],
            },
          ],
        }
      );
    });

    test("keeps raw markdown when image alt is empty", () => {
      expect(markdownToCommentBody("![](javascript:alert(1))")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "![](javascript:alert(1))" }],
          },
        ],
      });
    });
  });

  describe("code blocks", () => {
    test("converts fenced code blocks without parsing mentions", () => {
      expect(markdownToCommentBody("```\nHello @chris\n```")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Hello @chris" }],
          },
        ],
      });
    });

    test("converts fenced code blocks with a language tag", () => {
      expect(markdownToCommentBody("```ts\nconst x = 1\n```")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "const x = 1" }],
          },
        ],
      });
    });
  });

  describe("HTML", () => {
    test("renders inline HTML tags as text", () => {
      expect(markdownToCommentBody("x <br> y")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "x " }, { text: "<br>" }, { text: " y" }],
          },
        ],
      });
    });

    test("renders block HTML as literal text", () => {
      expect(markdownToCommentBody("<div>x</div>")).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "<div>x</div>" }],
          },
        ],
      });
    });
  });

  describe("combinations", () => {
    test("combines blockquote, bold, mention, and link in one paragraph", () => {
      expect(
        markdownToCommentBody("> **Note** @pierre: [link](https://a.com)")
      ).toEqual({
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [
              { text: "> " },
              { text: "Note", bold: true },
              { text: " " },
              { type: "mention", kind: "user", id: "pierre" },
              { text: ": " },
              {
                type: "link",
                url: "https://a.com",
                text: "link",
              },
            ],
          },
        ],
      });
    });
  });
});
