"use client";

import { CommentBody, isCommentBodyMention } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentType, ReactNode } from "react";
import React, { forwardRef } from "react";

import { MENTION_CHARACTER } from "../slate/mentions";
import type { ComponentPropsWithSlot } from "../types";

const COMMENT_MENTION_NAME = "CommentMention";
const COMMENT_BODY_NAME = "CommentBody";

export type CommentMentionProps = ComponentPropsWithSlot<"span">;

export type CommentRenderMentionProps = {
  /**
   * The mention's user ID.
   */
  userId: string;
};

export interface CommentBodyProps
  extends Omit<ComponentPropsWithSlot<"div">, "children"> {
  /**
   * The comment body to be displayed.
   * If not defined, the component will render `null`.
   */
  body?: CommentBody;

  /**
   * The component used to render mentions.
   */
  renderMention?: ComponentType<CommentRenderMentionProps>;
}

function CommentDefaultRenderMention({ userId }: CommentRenderMentionProps) {
  return (
    <CommentMention>
      {MENTION_CHARACTER}
      {userId}
    </CommentMention>
  );
}

const CommentMention = forwardRef<HTMLSpanElement, CommentMentionProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "span";

    return (
      <Component {...props} ref={forwardedRef}>
        {children}
      </Component>
    );
  }
);

const CommentBody = forwardRef<HTMLDivElement, CommentBodyProps>(
  (
    {
      body,
      renderMention: Mention = CommentDefaultRenderMention,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "div";

    if (!body) {
      return null;
    }

    return (
      <Component {...props} ref={forwardedRef}>
        {body.content.map((block, index) => {
          switch (block.type) {
            case "paragraph":
              return (
                <p key={index}>
                  {block.children.map((inline, index) => {
                    if (isCommentBodyMention(inline)) {
                      return <Mention userId={inline.userId} key={index} />;
                    }

                    // <code><s><em><strong>text</strong></s></em></code>
                    let children: ReactNode = inline.text;

                    if (inline.bold) {
                      children = <strong key={index}>{children}</strong>;
                    }

                    if (inline.italic) {
                      children = <em key={index}>{children}</em>;
                    }

                    if (inline.strikethrough) {
                      children = <s key={index}>{children}</s>;
                    }

                    if (inline.code) {
                      children = <code key={index}>{children}</code>;
                    }

                    return <span key={index}>{children}</span>;
                  })}
                </p>
              );
          }
        })}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  CommentBody.displayName = COMMENT_BODY_NAME;
  CommentMention.displayName = COMMENT_MENTION_NAME;
}

// TODO: Use `export *` to export all components in a tree-shakeable way
export const Comment = {
  /**
   * Displays a comment body.
   *
   * @example
   * <Comment.Body body={comment.body} />
   */
  Body: CommentBody,

  /**
   * Displays mentions within `Comment.Body`.
   *
   * @example
   * <Comment.Body
   *   body={comment.body}
   *   renderMention={({ userId }) => <Comment.Mention>@{userId}</Comment.Mention>}
   * />
   */
  Mention: CommentMention,
};
