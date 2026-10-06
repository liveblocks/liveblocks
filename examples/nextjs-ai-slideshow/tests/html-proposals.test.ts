import { describe, expect, it } from "vitest";
import {
  extractHtmlProposal,
  extractStreamingHtml,
  stripHtmlFencesForChat,
} from "@/app/api/ai-reply/html-proposals";

const CURRENT = "viewed-slide";

describe("extractHtmlProposal", () => {
  it("targets currentSlideId for a plain html fence and strips fences from content", () => {
    const text = "Before\n```html\n<p>one</p>\n```\nAfter";
    const result = extractHtmlProposal(text, CURRENT);

    expect(result.proposals).toEqual([
      { slideId: CURRENT, html: "<p>one</p>" },
    ]);
    expect(result.content).toBe("Before\n\nAfter");
  });

  it("uses id=abc from the fence info string as slideId", () => {
    const text = "```html id=abc\n<h1>A</h1>\n```";
    const result = extractHtmlProposal(text, CURRENT);

    expect(result.proposals).toEqual([{ slideId: "abc", html: "<h1>A</h1>" }]);
  });

  it("uses slideId new when the fence info string is new", () => {
    const text = "```html new\n<h1>N</h1>\n```";
    const result = extractHtmlProposal(text, CURRENT);

    expect(result.proposals).toEqual([{ slideId: "new", html: "<h1>N</h1>" }]);
  });

  it("keeps only the last proposal for the same id while keeping every new block", () => {
    const text = [
      "```html id=same\n<p>first</p>\n```",
      "```html id=same\n<p>second</p>\n```",
      "```html new\n<p>n1</p>\n```",
      "```html new\n<p>n2</p>\n```",
    ].join("\n");
    const result = extractHtmlProposal(text, CURRENT);

    expect(result.proposals).toEqual([
      { slideId: "same", html: "<p>second</p>" },
      { slideId: "new", html: "<p>n1</p>" },
      { slideId: "new", html: "<p>n2</p>" },
    ]);
  });

  it("drops proposals whose fenced body is empty after trim", () => {
    const text = "```html\n   \n```\n```html\n<p>x</p>\n```";
    const result = extractHtmlProposal(text, CURRENT);

    expect(result.proposals).toEqual([{ slideId: CURRENT, html: "<p>x</p>" }]);
  });
});

describe("extractStreamingHtml", () => {
  it("returns partial HTML for an unterminated fence", () => {
    const text = "```html\n<p>partial";
    const result = extractStreamingHtml(text, CURRENT);

    expect(result).toEqual([{ slideId: CURRENT, html: "<p>partial" }]);
  });

  it("returns undefined when there are no html fences", () => {
    expect(extractStreamingHtml("plain chat", CURRENT)).toBeUndefined();
  });
});

describe("stripHtmlFencesForChat", () => {
  it("removes closed fences truncates at an unclosed fence and trims whitespace", () => {
    const closed = "Hi ```html\n<p>x</p>\n``` there";
    expect(stripHtmlFencesForChat(closed)).toBe("Hi  there");

    const unclosed = "Start ```html\n<p>open";
    expect(stripHtmlFencesForChat(unclosed)).toBe("Start");

    expect(stripHtmlFencesForChat("  \n padded \n ")).toBe("padded");
  });
});
