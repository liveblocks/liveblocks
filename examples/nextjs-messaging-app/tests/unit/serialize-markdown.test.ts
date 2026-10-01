import { describe, expect, it } from "vitest";
import { isMessageEmpty, serializeMarkdown } from "@/lib/serialize-markdown";
import type { JSONContent } from "@tiptap/core";

function doc(content: JSONContent[]): JSONContent {
  return { type: "doc", content };
}

describe("serializeMarkdown", () => {
  it("serializes plain and multiple paragraphs", () => {
    expect(
      serializeMarkdown(
        doc([{ type: "paragraph", content: [{ type: "text", text: "hello" }] }])
      )
    ).toBe("hello");

    expect(
      serializeMarkdown(
        doc([
          { type: "paragraph", content: [{ type: "text", text: "one" }] },
          { type: "paragraph", content: [{ type: "text", text: "two" }] },
        ])
      )
    ).toBe("one\n\ntwo");
  });

  it("applies marks in order", () => {
    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ])
      )
    ).toBe("**x**");

    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "italic" }],
              },
            ],
          },
        ])
      )
    ).toBe("*x*");

    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "strike" }],
              },
            ],
          },
        ])
      )
    ).toBe("~~x~~");

    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "code" }],
              },
            ],
          },
        ])
      )
    ).toBe("`x`");

    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [{ type: "bold" }, { type: "italic" }],
              },
            ],
          },
        ])
      )
    ).toBe("***x***");
  });

  it("serializes mentions and hard breaks", () => {
    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: { id: "user@x.com" },
              },
            ],
          },
        ])
      )
    ).toBe("<@user@x.com>");

    expect(
      serializeMarkdown(
        doc([
          {
            type: "paragraph",
            content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }],
          },
        ])
      )
    ).toBe("a\nb");
  });

  it("serializes fenced code blocks", () => {
    expect(
      serializeMarkdown(
        doc([
          {
            type: "codeBlock",
            content: [{ type: "text", text: "code" }],
          },
        ])
      )
    ).toBe("```\ncode\n```");
  });

  it("returns empty string for non-doc roots", () => {
    expect(serializeMarkdown({ type: "paragraph" })).toBe("");
  });
});

describe("isMessageEmpty", () => {
  it("is true for empty or whitespace-only content", () => {
    expect(isMessageEmpty(doc([]))).toBe(true);
    expect(
      isMessageEmpty(
        doc([{ type: "paragraph", content: [{ type: "text", text: "   " }] }])
      )
    ).toBe(true);
  });

  it("is false when text is present", () => {
    expect(
      isMessageEmpty(
        doc([{ type: "paragraph", content: [{ type: "text", text: "hi" }] }])
      )
    ).toBe(false);
  });
});
