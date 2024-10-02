import type {
  BaseUserMeta,
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
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

import type { InlineCSSString } from "./lib/sanitize-inline-css";
import { sanitizeInlineCSS } from "./lib/sanitize-inline-css";

export type CommentBodySlotComponentProps = {
  /**
   * The blocks of the comment body
   */
  children: React.ReactNode;
};

export type CommentBodyParagraphComponentProps = {
  /**
   * The text content of the paragraph.
   */
  children: React.ReactNode;
};

export type CommentBodyTextComponentProps = {
  /**
   * The text element.
   */
  element: CommentBodyText;
};

export type CommentBodyLinkComponentProps = {
  /**
   * The link element.
   */
  element: CommentBodyLink;

  /**
   * The absolute URL of the link.
   */
  href: string;
};

export type CommentBodyMentionComponentProps<U extends BaseUserMeta = DU> = {
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
   * The component used to act as a `Slot` to wrap comment body blocks,
   */
  Slot: React.ComponentType<CommentBodySlotComponentProps>;
  /**
   * The component used to display paragraphs.
   */
  Paragraph: React.ComponentType<CommentBodyParagraphComponentProps>;

  /**
   * The component used to display text elements.
   */
  Text: React.ComponentType<CommentBodyTextComponentProps>;

  /**
   * The component used to display links.
   */
  Link: React.ComponentType<CommentBodyLinkComponentProps>;

  /**
   * The component used to display mentions.
   */
  Mention: React.ComponentType<CommentBodyMentionComponentProps<U>>;
};

const baseComponents: ConvertCommentBodyAsReactComponents<BaseUserMeta> = {
  Slot: ({ children }) => <div>{children}</div>,
  Paragraph: ({ children }) => <p>{children}</p>,
  Text: ({ element }) => {
    // Note: construction following the schema 👇
    // <code><s><em><strong>{element.text}</strong></s></em></code>
    let children: React.ReactNode = element.text;

    if (element.bold) {
      children = <strong>{children}</strong>;
    }

    if (element.italic) {
      children = <em>{children}</em>;
    }

    if (element.strikethrough) {
      children = <s>{children}</s>;
    }

    if (element.code) {
      children = <code>{children}</code>;
    }

    return <span>{children}</span>;
  },
  Link: ({ element, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {element.text ?? element.url}
    </a>
  ),
  Mention: ({ element, user }) => (
    <span data-mention>@{user?.name ?? element.id}</span>
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
  const Components = {
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
            return inline.id ? (
              <Components.Mention
                key={`lb-comment-body-mention-${inlineIndex}`}
                element={inline}
                user={resolvedUsers.get(inline.id)}
              />
            ) : null;
          }

          if (isCommentBodyLink(inline)) {
            const href = toAbsoluteUrl(inline.url) ?? inline.url;
            return (
              <Components.Link
                key={`lb-comment-body-link-${inlineIndex}`}
                element={inline}
                href={href}
              />
            );
          }

          if (isCommentBodyText(inline)) {
            return (
              <Components.Text
                key={`lb-comment-body-text-${inlineIndex}`}
                element={inline}
              />
            );
          }

          return null;
        });

        return (
          <Components.Paragraph key={`lb-comment-body-paragraph-${index}`}>
            {children}
          </Components.Paragraph>
        );
      }
      default:
        console.warn(
          `Unsupported comment body block type: "${JSON.stringify(block.type)}"`
        );
        return null;
    }
  });

  return (
    <Components.Slot key={"lb-comment-body-slot"}>{blocks}</Components.Slot>
  );
}

export type ConvertCommentBodyAsHTMLStyles = {
  /**
   * The default inline CSS styles used to display paragraphs.
   */
  paragraph: InlineCSSString;
  /**
   * The default inline CSS styles used to display text elements.
   */
  text: {
    strong: InlineCSSString;
    code: InlineCSSString;
  };
  /**
   * The default inline CSS styles used to display links.
   */
  mention: InlineCSSString;
  /**
   * The default inline CSS styles used to display mentions.
   */
  link: InlineCSSString;
};

const baseStyles: ConvertCommentBodyAsHTMLStyles = {
  paragraph: "font-size:14px;",
  text: {
    strong: "font-weight:500;",
    code: 'font-family:ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Mono", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Consolas", "Courier New", monospace;background-color:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);border-radius:4px;',
  },
  mention: "color:blue;",
  link: "text-decoration:underline;",
};

/** @internal */
const getCommentBodyAsHTMLStyles = (
  styles: Partial<ConvertCommentBodyAsHTMLStyles> = {}
): ConvertCommentBodyAsHTMLStyles => {
  return {
    paragraph: styles.paragraph
      ? sanitizeInlineCSS(styles.paragraph)
      : baseStyles.paragraph,
    text: {
      strong: styles.text?.strong
        ? sanitizeInlineCSS(styles.text.strong)
        : baseStyles.text.strong,
      code: styles.text?.code
        ? sanitizeInlineCSS(styles.text.code)
        : baseStyles.text.code,
    },
    mention: styles.mention
      ? sanitizeInlineCSS(styles.mention)
      : baseStyles.mention,
    link: styles.link ? sanitizeInlineCSS(styles.link) : baseStyles.link,
  };
};

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
  const styles = getCommentBodyAsHTMLStyles(options?.styles);

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
          children = html`<strong style="${styles.text.strong}">${children}</strong>`;
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
          children = html`<code style="${styles.text.code}">${children}</code>`;
        }

        return children;
      },
      link: ({ element, href }) => {
        // prettier-ignore
        return html`<a href="${href}" target="_blank" rel="noopener noreferrer" style="${styles.link}">${element.text ?? element.url}</a>`;
      },
      mention: ({ element, user }) => {
        // prettier-ignore
        return html`<span data-mention style="${styles.mention}">@${user?.name ?? element.id}</span>`;
      },
    },
  });

  return htmlBody;
}
