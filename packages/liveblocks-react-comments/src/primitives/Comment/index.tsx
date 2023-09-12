import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import React, { forwardRef } from "react";

import { MENTION_CHARACTER } from "../../slate/plugins/mentions";
import type {
  CommentBodyProps,
  CommentMentionProps,
  CommentRenderMentionProps,
} from "./types";
import { isCommentBodyMention } from "./utils";
import { isComposerBodyAutoLink } from "../../slate/plugins/auto-links";
import type { ComponentPropsWithSlot } from "../../types";

const COMMENT_MENTION_NAME = "CommentMention";
const COMMENT_BODY_NAME = "CommentBody";

/**
 * Displays mentions within `Comment.Body`.
 *
 * @example
 * <Comment.Body
 *   body={comment.body}
 *   renderMention={({ userId }) => <Comment.Mention>@{userId}</Comment.Mention>}
 * />
 */

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

const AutoLink = forwardRef<HTMLAnchorElement, ComponentPropsWithSlot<"a">>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "a";

    return (
      <Component {...props} ref={forwardedRef}>
        {children}
      </Component>
    );
  }
);

/**
 * Displays a comment body.
 *
 * @example
 * <Comment.Body body={comment.body} />
 */
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
                      return inline.id ? (
                        <Mention userId={inline.id} key={index} />
                      ) : null;
                    }

                    if (isComposerBodyAutoLink(inline)) {
                      return (
                        <AutoLink
                          href={toAbsoluteURL(inline.href)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          key={index}
                        >
                          {inline.href}
                        </AutoLink>
                      );
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
            default:
              return null;
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

function toAbsoluteURL(url: string): string | undefined {
  // Check if the URL already contains a scheme
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  } else if (url.startsWith("www.")) {
    // If the URL starts with "www.", prepend "https://"
    return "https://" + url;
  }
  return;
}

// NOTE: Every export from this file will be available publicly as Comment.*
export { CommentBody as Body, CommentMention as Mention };
