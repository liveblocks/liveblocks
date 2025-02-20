import type {
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
} from "../comment-body";
import {
  convertCommentBodyAsHtml,
  convertCommentBodyAsReact,
} from "../comment-body";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody4,
  commentBody5,
  commentBody6,
  commentBody7,
  commentBodyWithHtml,
  commentBodyWithHtml2,
  renderToStaticMarkup,
  resolveUsers,
} from "./_helpers";

describe("convert comment body as html", () => {
  describe("w/o users resolver", () => {
    it("should convert simple text elements", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBody1);
      const expected =
        '<p style="font-size:14px;">What do you think of this team? 🤔</p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should convert with italic and bold", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBody5);
      const expected =
        '<p style="font-size:14px;"><strong style="font-weight:500;">Bold text</strong> and <em>italic text</em></p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should convert with code and strikethrough", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBody6);
      const expected =
        '<p style="font-size:14px;"><s>Strikethrough text</s> and <code style="font-family:ui-monospace, Menlo, Monaco, &quot;Cascadia Mono&quot;, &quot;Segoe UI Mono&quot;, &quot;Roboto Mono&quot;, &quot;Oxygen Mono&quot;, &quot;Ubuntu Mono&quot;, &quot;Source Code Pro&quot;, &quot;Fira Mono&quot;, &quot;Droid Sans Mono&quot;, &quot;Consolas&quot;, &quot;Courier New&quot;, monospace;background-color:rgba(0,0,0,0.05);border:solid 1px rgba(0,0,0,0.1);border-radius:4px;">code text</code></p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should convert with link", async () => {
      const [htmlBody1, htmlBody2] = await Promise.all([
        convertCommentBodyAsHtml(commentBody4),
        convertCommentBodyAsHtml(commentBody7),
      ]);

      const expected1 =
        '<p style="font-size:14px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">https://www.liveblocks.io</a></p>';
      const expected2 =
        '<p style="font-size:14px;">Check out this <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">example</a></p>';

      expect(htmlBody1).toEqual(expected1);
      expect(htmlBody2).toEqual(expected2);
    });

    it("should convert with user mention", async () => {
      const htmlBody = await convertCommentBodyAsHtml(
        buildCommentBodyWithMention({ mentionedUserId: "user-dracula" })
      );
      const expected =
        '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@user-dracula</span> !</p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should escape html entities - text", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBodyWithHtml);
      const expected =
        '<p style="font-size:14px;">Trying with &lt;b&gt;inject html&lt;/b&gt; !</p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should escape html entities - link w/ text", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBodyWithHtml2);
      const expected =
        '<p style="font-size:14px;">Trying with <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">&lt;script&gt;injected script&lt;/script&gt;</a> !</p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should escape html entities - mention w/ username", async () => {
      const htmlBody = await convertCommentBodyAsHtml(
        buildCommentBodyWithMention({ mentionedUserId: "user-0" }),
        {
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
        '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@&lt;style&gt;injected style&lt;/style&gt;</span> !</p>';

      expect(htmlBody).toEqual(expected);
    });
  });

  describe("w/ users resolved", () => {
    it("should convert with a resolved user mention", async () => {
      const htmlBody = await convertCommentBodyAsHtml(
        buildCommentBodyWithMention({ mentionedUserId: "user-2" }),
        { resolveUsers }
      );
      const expected =
        '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@Tatum Paolo</span> !</p>';

      expect(htmlBody).toEqual(expected);
    });
  });

  describe("w/ custom styles", () => {
    const styles: Partial<ConvertCommentBodyAsHtmlStyles> = {
      paragraph: {
        fontSize: "16px",
      },
      mention: {
        color: "purple",
      },
      link: {
        textUnderlineOffset: "4px",
      },
    };

    it("should convert mentions", async () => {
      const htmlBody = await convertCommentBodyAsHtml(
        buildCommentBodyWithMention({ mentionedUserId: "user-dracula" }),
        { styles, resolveUsers }
      );
      const expected =
        '<p style="font-size:16px;">Hello <span data-mention style="color:purple;">@user-dracula</span> !</p>';

      expect(htmlBody).toEqual(expected);
    });

    it("should convert links", async () => {
      const htmlBody = await convertCommentBodyAsHtml(commentBody4, { styles });
      const expected =
        '<p style="font-size:16px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-underline-offset:4px;">https://www.liveblocks.io</a></p>';

      expect(htmlBody).toEqual(expected);
    });
  });
});

describe("convert comment body as React", () => {
  describe("w/o users resolver", () => {
    it("should convert simple text elements", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody1);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <span>What do you think of this team? 🤔</span>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should convert with italic and bold", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody5);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <span>
              <strong>Bold text</strong>
            </span>
            <span> and </span>
            <span>
              <em>italic text</em>
            </span>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should convert with code and strikethrough", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody6);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <span>
              <s>Strikethrough text</s>
            </span>
            <span> and </span>
            <span>
              <code>code text</code>
            </span>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should convert with link", async () => {
      const [reactBody1, reactBody2] = await Promise.all([
        convertCommentBodyAsReact(commentBody4),
        convertCommentBodyAsReact(commentBody7),
      ]);

      const markupBody1 = renderToStaticMarkup(<>{reactBody1}</>);
      const markupBody2 = renderToStaticMarkup(<>{reactBody2}</>);

      const expected1 = renderToStaticMarkup(
        <div>
          <p>
            <span>I agree 😍 it completes well this guide: </span>
            <a
              href="https://www.liveblocks.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.liveblocks.io
            </a>
          </p>
        </div>
      );

      const expected2 = renderToStaticMarkup(
        <div>
          <p>
            <span>Check out this </span>
            <a
              href="https://www.liveblocks.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              example
            </a>
          </p>
        </div>
      );

      expect(markupBody1).toEqual(expected1);
      expect(markupBody2).toEqual(expected2);
    });

    it("should convert with user mention", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-dracula" })
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <span>Hello</span>
            <span> </span>
            <span data-mention>@user-dracula</span>
            <span> </span>
            <span>!</span>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });
  });

  describe("w/ users resolver", () => {
    it("should convert with a resolved user mention", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-2" }),
        { resolveUsers }
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <span>Hello</span>
            <span> </span>
            <span data-mention>@Tatum Paolo</span>
            <span> </span>
            <span>!</span>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });
  });

  describe("w/ custom components", () => {
    const components: Partial<ConvertCommentBodyAsReactComponents> = {
      Container: ({ children }) => <main>{children}</main>,
      Paragraph: ({ children }) => (
        <p style={{ display: "flex" }}>{children}</p>
      ),
      Mention: ({ element, user }) => (
        <span>user#{user?.name ?? element.id}</span>
      ),
      Link: ({ element, href }) => (
        <a href={href} data-link>
          {element.text ?? element.url}
        </a>
      ),
    };

    it("should convert mentions", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-0" }),
        {
          resolveUsers,
          components,
        }
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <main>
          <p style={{ display: "flex" }}>
            <span>Hello</span>
            <span> </span>
            <span>user#Charlie Layne</span>
            <span> </span>
            <span>!</span>
          </p>
        </main>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should convert links", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody4, {
        components,
      });

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <main>
          <p style={{ display: "flex" }}>
            <span>I agree 😍 it completes well this guide: </span>
            <a href="https://www.liveblocks.io" data-link>
              https://www.liveblocks.io
            </a>
          </p>
        </main>
      );

      expect(markupBody).toEqual(expected);
    });
  });
});
