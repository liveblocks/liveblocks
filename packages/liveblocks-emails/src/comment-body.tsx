import type {
  BaseUserMeta,
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
  DU,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  html,
  htmlSafe,
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  stringifyCommentBody,
  toAbsoluteUrl,
} from "@liveblocks/core";
import React from "react";

import { sanitizeInlineCSS } from "./lib/sanitize-inline-css";

export type CommentBodySlotComponentsArgs = {
  /**
   * The blocks of the comment body
   */
  children: React.ReactNode;
};

export type CommentBodyParagraphComponentArgs = {
  /**
   * The paragraph element.
   */
  element: CommentBodyParagraph;

  /**
   * The text content of the paragraph.
   */
  children: React.ReactNode;
};

export type CommentBodyTextComponentArgs = {
  /**
   * The text element.
   */
  element: CommentBodyText;
};

export type CommentBodyLinkComponentArgs = {
  /**
   * The link element.
   */
  element: CommentBodyLink;

  /**
   * The absolute URL of the link.
   */
  href: string;
};

export type CommentBodyMentionComponentArgs<U extends BaseUserMeta = DU> = {
  /**
   * The mention element.
   */
  element: CommentBodyMention;

  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
};

export type ConvertCommentBodyAsReactComponents<U extends BaseUserMeta = DU> = {
  /**
   *
   * The component used to act as a `Slot` to wrap comment body blocks
   */
  Slot: (args: CommentBodySlotComponentsArgs) => React.ReactNode;
  /**
   * The component used to display paragraphs.
   */
  Paragraph: (
    args: CommentBodyParagraphComponentArgs,
    index: number
  ) => React.ReactNode;

  /**
   * The component used to display text elements.
   */
  Text: (args: CommentBodyTextComponentArgs, index: number) => React.ReactNode;

  /**
   * The component used to display links.
   */
  Link: (args: CommentBodyLinkComponentArgs, index: number) => React.ReactNode;

  /**
   * The component used to display mentions.
   */
  Mention: (
    args: CommentBodyMentionComponentArgs<U>,
    index: number
  ) => React.ReactNode;
};

const baseComponents: ConvertCommentBodyAsReactComponents<BaseUserMeta> = {
  Slot: ({ children }) => <div key={"lb-comment-body-slot"}>{children}</div>,
  Paragraph: ({ children }, index) => (
    <p key={`lb-comment-body-paragraph-${index}`}>{children}</p>
  ),
  Text: ({ element }, index) => {
    // Note: construction following the schema 👇
    // <code><s><em><strong>{element.text}</strong></s></em></code>
    let children: React.ReactNode = element.text;
    if (!children) {
      return children;
    }

    if (element.bold) {
      children = (
        <strong key={`lb-comment-body-text-strong-${index}`}>{children}</strong>
      );
    }

    if (element.italic) {
      children = <em key={`lb-comment-body-text-em-${index}`}>{children}</em>;
    }

    if (element.strikethrough) {
      children = <s key={`lb-comment-body-text-s-${index}`}>{children}</s>;
    }

    if (element.code) {
      children = (
        <code key={`lb-comment-body-text-code-${index}`}>{children}</code>
      );
    }

    return children;
  },
  Link: ({ element, href }, index) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      key={`lb-comment-body-link-${index}`}
    >
      {element.text ?? element.url}
    </a>
  ),
  Mention: ({ element, user }, index) => (
    <span data-mention key={`lb-comment-body-mention-${index}`}>
      @{user?.name ?? element.id}
    </span>
  ),
};

export type ConvertCommentBodyAsReactOptions<U extends BaseUserMeta = DU> = {
  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  components?: Partial<ConvertCommentBodyAsReactComponents<U>>;
  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
};

/**
 * Convert a `CommentBody` into React elements
 */
export async function convertCommentBodyAsReact(
  body: CommentBody,
  options?: ConvertCommentBodyAsReactOptions<BaseUserMeta>
): Promise<React.ReactNode> {
  const components = {
    ...baseComponents,
    ...options?.components,
  };
  const resolvedUsers = await resolveUsersInCommentBody(
    body,
    options?.resolveUsers
  );

  const blocks = body.content.map((block, index) => {
    switch (block.type) {
      case "paragraph": {
        const children = block.children.map((inline, inlineIndex) => {
          if (isCommentBodyMention(inline)) {
            return inline.id
              ? components.Mention(
                  { element: inline, user: resolvedUsers.get(inline.id) },
                  inlineIndex
                )
              : null;
          }

          if (isCommentBodyLink(inline)) {
            return components.Link(
              {
                element: inline,
                href: toAbsoluteUrl(inline.url) ?? inline.url,
              },
              inlineIndex
            );
          }

          if (isCommentBodyText(inline)) {
            return components.Text({ element: inline }, inlineIndex);
          }

          return null;
        });

        return components.Paragraph({ element: block, children }, index);
      }
      default:
        console.warn(
          `Unsupported comment body block type: "${JSON.stringify(block.type)}"`
        );
        return null;
    }
  });
  const reactBody = components.Slot({ children: blocks });

  return reactBody;
}

/**
 * Type alias for DX purposes.
 * It indicates the string should represents an inline CSS instruction
 * in an HTML code.
 */
type InlineCSSString = string;

// → TEMP: to be completed
export type ConvertCommentBodyAsHTMLStyles = {
  paragraph: InlineCSSString;
};

// → TEMP: to be completed
const baseStyles: ConvertCommentBodyAsHTMLStyles = {
  paragraph: "font-size:14px;",
};

/** @internal */
const getCommentBodyAsHTMLStyle = (
  styles: Partial<ConvertCommentBodyAsHTMLStyles> = {}
): ConvertCommentBodyAsHTMLStyles => ({
  paragraph: styles.paragraph
    ? sanitizeInlineCSS(styles.paragraph)
    : baseStyles.paragraph,
});

export type ConvertCommentBodyAsHTMLOptions<U extends BaseUserMeta = DU> = {
  /**
   * The styles used to customize the html elements in the resulting HTML safe string.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertCommentBodyAsHTMLStyles>;
  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
};

/**
 * Convert a `CommentBody` into an HTML safe string
 * with inline css styles
 */
export async function convertCommentBodyAsHTML(
  body: CommentBody,
  options?: ConvertCommentBodyAsHTMLOptions<BaseUserMeta>
): Promise<string> {
  const styles = getCommentBodyAsHTMLStyle(options?.styles);

  const htmlBody = await stringifyCommentBody(body, {
    format: "html",
    resolveUsers: options?.resolveUsers,
    elements: {
      // NOTE: using prettier-ignore to preserve template strings
      paragraph: ({ children }) =>
        // prettier-ignore
        children ? html`<p style="${styles.paragraph}">${htmlSafe(children)}</p>` : children,
      text: ({ element }) => {
        // Note: construction following the schema 👇
        // <code><s><em><strong>{element.text}</strong></s></em></code>
        let children = element.text;

        if (!children) {
          return children;
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

        return children;
      },
      link: ({ element, href }) => {
        // prettier-ignore
        return html`<a href="${href}" target="_blank" rel="noopener noreferrer">${element.text ?? element.url}</a>`;
      },
      mention: ({ element, user }) => {
        // prettier-ignore
        return html`<span data-mention>@${user?.name ?? element.id}</span>`;
      },
    },
  });

  return htmlBody;
}
