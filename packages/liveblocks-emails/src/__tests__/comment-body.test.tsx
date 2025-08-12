import { html, htmlSafe } from "@liveblocks/core";
import { describe, expect } from "vitest";

import type { ConvertCommentBodyElements } from "../comment-body";
import { convertCommentBody } from "../comment-body";
import { MENTION_CHARACTER } from "../lib/constants";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody4,
  commentBody5,
  commentBody6,
  commentBody7,
  commentBodyWithHtml,
  commentBodyWithHtml2,
  commentBodyWithInvalidUrls,
  commentBodyWithValidUrls,
  resolveUsers,
} from "./_helpers";

describe("convert comment body", () => {
  // As html
  const elements: ConvertCommentBodyElements<string> = {
    container: ({ children }) => children.join("\n"),
    paragraph: ({ children }) => {
      const unsafe = children.join("");
      // prettier-ignore
      return unsafe ? html`<p>${htmlSafe(unsafe)}</p>` : unsafe;
    },
    text: ({ element }) => {
      // Note: construction following the schema 👇
      // <code><s><em><strong>{element.text}</strong></s></em></code>
      let children = element.text;

      if (!children) {
        return html`${children}`;
      }

      if (element.bold) {
        // prettier-ignore
        children = html`<strong>${children}</strong>`;
      }

      if (element.italic) {
        // prettier-ignore
        children = html`<em>${children}</em>`;
      }

      if (element.strikethrough) {
        // prettier-ignore
        children = html`<s>${children}</s>`;
      }

      if (element.code) {
        // prettier-ignore
        children = html`<code>${children}</code>`;
      }

      return html`${children}`;
    },
    link: ({ element, href }) => {
      // prettier-ignore
      return html`<a href="${href}" target="_blank" rel="noopener noreferrer">${element.text ? html`${element.text}` : element.url}</a>`;
    },
    mention: ({ element, user }) => {
      // prettier-ignore
      return html`<span data-mention>${MENTION_CHARACTER}${user?.name ? html`${user?.name}` : element.id}</span>`;
    },
  };

  it("should convert simple text elements", async () => {
    const body = await convertCommentBody(commentBody1, { elements });
    const expected = "<p>What do you think of this team? 🤔</p>";

    expect(body).toEqual(expected);
  });

  it("should convert with italic and bold", async () => {
    const body = await convertCommentBody(commentBody5, { elements });
    const expected =
      "<p><strong>Bold text</strong> and <em>italic text</em></p>";

    expect(body).toEqual(expected);
  });

  it("should convert with code and strikethrough", async () => {
    const body = await convertCommentBody(commentBody6, { elements });
    const expected =
      "<p><s>Strikethrough text</s> and <code>code text</code></p>";

    expect(body).toEqual(expected);
  });

  it("should convert with link", async () => {
    const [body1, body2] = await Promise.all([
      convertCommentBody(commentBody4, { elements }),
      convertCommentBody(commentBody7, { elements }),
    ]);

    const expected1 =
      '<p>I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer">https://www.liveblocks.io</a></p>';
    const expected2 =
      '<p>Check out this <a href="https://www.liveblocks.io/" target="_blank" rel="noopener noreferrer">example</a></p>';

    expect(body1).toEqual(expected1);
    expect(body2).toEqual(expected2);
  });

  it("should preserve valid URLs", async () => {
    const body = await convertCommentBody(commentBodyWithValidUrls, {
      elements,
    });
    const expected =
      '<p>Trying with <a href="https://liveblocks.io" target="_blank" rel="noopener noreferrer">this link</a> and <a href="https://www.liveblocks.io/docs?query=123#hash" target="_blank" rel="noopener noreferrer">www.liveblocks.io/docs?query=123#hash</a></p>';

    expect(body).toEqual(expected);
  });

  it("should replace invalid URLs with plain text", async () => {
    const body = await convertCommentBody(commentBodyWithInvalidUrls, {
      elements,
    });

    const expected = "<p>Trying with this link and this other link</p>";

    expect(body).toEqual(expected);
  });

  it("should convert with user mention", async () => {
    const body = await convertCommentBody(
      buildCommentBodyWithMention({ mentionedUserId: "user-dracula" }),
      { elements }
    );
    const expected = "<p>Hello <span data-mention>@user-dracula</span> !</p>";

    expect(body).toEqual(expected);
  });

  it("should convert with a resolved user mention", async () => {
    const body = await convertCommentBody(
      buildCommentBodyWithMention({ mentionedUserId: "user-2" }),
      {
        elements,
        resolveUsers,
      }
    );
    const expected = "<p>Hello <span data-mention>@Tatum Paolo</span> !</p>";

    expect(body).toEqual(expected);
  });

  describe("use-case/escaping html entities", () => {
    it("should escape html entities in text", async () => {
      const body = await convertCommentBody(commentBodyWithHtml, { elements });
      const expected = "<p>Trying with &lt;b&gt;inject html&lt;/b&gt; !</p>";

      expect(body).toEqual(expected);
    });

    it("should escape html entities in link w/ text", async () => {
      const body = await convertCommentBody(commentBodyWithHtml2, { elements });
      const expected =
        '<p>Trying with <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer">&lt;script&gt;injected script&lt;/script&gt;</a> !</p>';

      expect(body).toEqual(expected);
    });

    it("should escape html entities in mention w/ username", async () => {
      const body = await convertCommentBody(
        buildCommentBodyWithMention({ mentionedUserId: "user-0" }),
        {
          elements,
          resolveUsers: ({ userIds }) => {
            return userIds.map((userId) => {
              return {
                id: userId,
                name: "<style>injected style</style>",
              };
            });
          },
        }
      );
      const expected =
        "<p>Hello <span data-mention>@&lt;style&gt;injected style&lt;/style&gt;</span> !</p>";

      expect(body).toEqual(expected);
    });
  });
});
