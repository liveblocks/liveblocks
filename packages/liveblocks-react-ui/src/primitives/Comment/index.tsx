import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { MENTION_CHARACTER } from "../../slate/plugins/mentions";
import type {
  CommentBodyComponents,
  CommentBodyProps,
  CommentLinkProps,
  CommentMentionProps,
} from "./types";
import {
  isCommentBodyLink,
  isCommentBodyMention,
  toAbsoluteUrl,
} from "./utils";

const COMMENT_MENTION_NAME = "CommentMention";
const COMMENT_BODY_NAME = "CommentBody";
const COMMENT_LINK_NAME = "CommentLink";

/**
 * Displays mentions within `Comment.Body`.
 *
 * @example
 * <Comment.Mention>@{userId}</Comment.Mention>
 */
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

/**
 * Displays links within `Comment.Body`.
 *
 * @example
 * <Comment.Link href={href}>{children}</Comment.Link>
 */
const CommentLink = forwardRef<HTMLAnchorElement, CommentLinkProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "a";

    return (
      <Component
        target="_blank"
        rel="noopener noreferrer nofollow"
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Component>
    );
  }
);

const defaultBodyComponents: CommentBodyComponents = {
  Mention: ({ userId }) => {
    return (
      <CommentMention>
        {MENTION_CHARACTER}
        {userId}
      </CommentMention>
    );
  },
  Link: ({ href, children }) => {
    return <CommentLink href={href}>{children}</CommentLink>;
  },
};

/**
 * Displays a comment body.
 *
 * @example
 * <Comment.Body body={comment.body} />
 */
const CommentBody = forwardRef<HTMLDivElement, CommentBodyProps>(
  ({ body, components, style, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { Mention, Link } = useMemo(
      () => ({ ...defaultBodyComponents, ...components }),
      [components]
    );

    if (!body || !body?.content) {
      return null;
    }

    return (
      <Component
        {...props}
        style={{ whiteSpace: "break-spaces", ...style }}
        ref={forwardedRef}
      >
        {body.content.map((block, index) => {
          switch (block.type) {
            case "paragraph":
              return (
                <p key={index} style={{ minHeight: "1lh" }}>
                  {block.children.map((inline, index) => {
                    if (isCommentBodyMention(inline)) {
                      return inline.id ? (
                        <Mention userId={inline.id} key={index} />
                      ) : null;
                    }

                    if (isCommentBodyLink(inline)) {
                      const href = toAbsoluteUrl(inline.url) ?? inline.url;

                      return (
                        <Link href={href} key={index}>
                          {inline.text ?? inline.url}
                        </Link>
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
  CommentLink.displayName = COMMENT_LINK_NAME;
}

// NOTE: Every export from this file will be available publicly as Comment.*
export { CommentBody as Body, CommentLink as Link, CommentMention as Mention };
