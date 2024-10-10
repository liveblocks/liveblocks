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

import type { CSSProperties } from "./lib/css-properties";
import { toInlineCSSString } from "./lib/css-properties";

export type CommentBodyContainerComponentProps = {
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
   * The component used to act as a container to wrap comment body blocks,
   */
  Container: React.ComponentType<CommentBodyContainerComponentProps>;
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
  Container: ({ children }) => <div>{children}</div>,
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
    <Components.Container key={"lb-comment-body-container"}>
      {blocks}
    </Components.Container>
  );
}

export type ConvertCommentBodyAsHtmlStyles = {
  /**
   * The default inline CSS styles used to display paragraphs.
   */
  paragraph: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<strong />` elements.
   */
  strong: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<code />` elements.
   */
  code: CSSProperties;
  /**
   * The default inline CSS styles used to display links.
   */
  mention: CSSProperties;
  /**
   * The default inline CSS styles used to display mentions.
   */
  link: CSSProperties;
};

const baseStyles: ConvertCommentBodyAsHtmlStyles = {
  paragraph: {
    fontSize: "14px",
  },
  strong: {
    fontWeight: 500,
  },
  code: {
    fontFamily:
      'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Mono", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Consolas", "Courier New", monospace',
    backgroundColor: "rgba(0,0,0,0.05)",
    border: "solid 1px rgba(0,0,0,0.1)",
    borderRadius: "4px",
  },
  mention: {
    color: "blue",
  },
  link: {
    textDecoration: "underline",
  },
};

export type ConvertCommentBodyAsHtmlOptions<U extends BaseUserMeta = DU> = {
  /**
   * The styles used to customize the html elements in the resulting html safe string.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertCommentBodyAsHtmlStyles>;
  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
};

/**
 * Convert a `CommentBody` into an html safe string
 * with inline css styles
 */
export async function convertCommentBodyAsHtml(
  body: CommentBody,
  options?: ConvertCommentBodyAsHtmlOptions<BaseUserMeta>
): Promise<string> {
  const styles = { ...baseStyles, ...options?.styles };

  const htmlBody = await stringifyCommentBody(body, {
    format: "html",
    resolveUsers: options?.resolveUsers,
    elements: {
      // NOTE: using prettier-ignore to preserve template strings
      paragraph: ({ children }) =>
        // prettier-ignore
        children ? html`<p style="${toInlineCSSString(styles.paragraph)}">${htmlSafe(children)}</p>` : children,
      text: ({ element }) => {
        // Note: construction following the schema 👇
        // <code><s><em><strong>{element.text}</strong></s></em></code>
        let children = element.text;

        if (!children) {
          return children;
        }

        if (element.bold) {
          // prettier-ignore
          children = html`<strong style="${toInlineCSSString(styles.strong)}">${children}</strong>`;
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
          children = html`<code style="${toInlineCSSString(styles.code)}">${children}</code>`;
        }

        return children;
      },
      link: ({ element, href }) => {
        // prettier-ignore
        return html`<a href="${href}" target="_blank" rel="noopener noreferrer" style="${toInlineCSSString(styles.link)}">${element.text ?? element.url}</a>`;
      },
      mention: ({ element, user }) => {
        // prettier-ignore
        return html`<span data-mention style="${toInlineCSSString(styles.mention)}">@${user?.name ?? element.id}</span>`;
      },
    },
  });

  return htmlBody;
}
