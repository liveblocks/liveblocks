import React from "react";

import type {
  CommentBodyMentionComponentArgs,
  CommentBodyParagraphComponentArgs,
  CommentBodySlotComponentsArgs,
} from "../comment-body";
import { convertCommentBodyAsReact } from "../comment-body";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody4,
  commentBody5,
  commentBody6,
  commentBody7,
  renderToStaticMarkup,
  resolveUsers,
} from "./_helpers";

describe("convert comment body as React", () => {
  describe("w/o users resolver", () => {
    it("should converts simple text elements", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody1);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>What do you think of this team? 🤔</p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should converts with italic and bold", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody5);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <strong>Bold text</strong> and <em>italic text</em>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should converts with code and strikethrough", async () => {
      const reactBody = await convertCommentBodyAsReact(commentBody6);

      const markupBody = renderToStaticMarkup(<>{reactBody}</>);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            <s>Strikethrough text</s> and <code>code text</code>
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });

    it("should converts with link", async () => {
      const [reactBody1, reactBody2] = await Promise.all([
        convertCommentBodyAsReact(commentBody4),
        convertCommentBodyAsReact(commentBody7),
      ]);

      const markupBody1 = renderToStaticMarkup(<>{reactBody1}</>);
      const markupBody2 = renderToStaticMarkup(<>{reactBody2}</>);

      const expected1 = renderToStaticMarkup(
        <div>
          <p>
            I agree 😍 it completes well this guide:{" "}
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
            Check out this{" "}
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

    it("should converts with user mention", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-dracula" })
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            Hello <span data-mention>@user-dracula</span> !
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });
  });

  describe("w/ users resolver", () => {
    it("should converts with a resolved user mention", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-2" }),
        { resolveUsers }
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <div>
          <p>
            Hello <span data-mention>@Tatum Paolo</span> !
          </p>
        </div>
      );

      expect(markupBody).toEqual(expected);
    });
  });

  describe("w/ custom components", () => {
    const Slot = ({ children }: CommentBodySlotComponentsArgs) => (
      <main>{children}</main>
    );

    const Paragraph = (
      { children }: CommentBodyParagraphComponentArgs,
      index: number
    ) => {
      console.log(`rs-paragraph-${index}`);
      return (
        <p style={{ display: "flex" }} key={`rs-paragraph-${index}`}>
          {children}
        </p>
      );
    };

    const Mention = (
      { element, user }: CommentBodyMentionComponentArgs,
      index: number
    ) => (
      <span key={`rs-mention-${index}`}>user#{user?.name ?? element.id}</span>
    );

    it("should converts with custom components", async () => {
      const reactBody = await convertCommentBodyAsReact(
        buildCommentBodyWithMention({ mentionedUserId: "user-0" }),
        {
          resolveUsers,
          components: { Slot, Paragraph, Mention },
        }
      );

      const markupBody = renderToStaticMarkup(reactBody);
      const expected = renderToStaticMarkup(
        <main>
          <p style={{ display: "flex" }} key="rs-paragraph-0">
            Hello <span>user#Charlie Layne</span> !
          </p>
        </main>
      );

      expect(markupBody).toEqual(expected);
    });
  });
});
