import type {
  Awaitable,
  BaseUserMeta,
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
  DU,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  html,
  htmlSafe,
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  toAbsoluteUrl,
} from "@liveblocks/core";
import type { ComponentType, ReactNode } from "react";

import { MENTION_CHARACTER } from "./lib/constants";
import type { CSSProperties } from "./lib/css-properties";
import { toInlineCSSString } from "./lib/css-properties";
import { exists } from "./lib/utils";

export type CommentBodyContainerElementArgs<T> = {
  /**
   * The blocks of the comment body
   */
  children: T[];
};

export type CommentBodyParagraphElementArgs<T> = {
  /**
   * The paragraph element.
   */
  element: CommentBodyParagraph;
  /**
   * The text content of the paragraph.
   */
  children: T[];
};

export type CommentBodyTextElementArgs = {
  /**
   * The text element.
   */
  element: CommentBodyText;
};

export type CommentBodyLinkElementArgs = {
  /**
   * The link element.
   */
  element: CommentBodyLink;

  /**
   * The absolute URL of the link.
   */
  href: string;
};

export type CommentBodyMentionElementArgs<U extends BaseUserMeta = DU> = {
  /**
   * The mention element.
   */
  element: CommentBodyMention;

  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
};

/**
 * Protocol:
 * Comment body elements to be converted to a custom format `T`
 */
export type ConvertCommentBodyElements<T, U extends BaseUserMeta = DU> = {
  /**
   * The container element used to display comment body blocks.
   */
  container: (args: CommentBodyContainerElementArgs<T>) => T;
  /**
   * The paragraph element used to display paragraphs.
   */
  paragraph: (args: CommentBodyParagraphElementArgs<T>, index: number) => T;
  /**
   * The text element used to display text elements.
   */
  text: (args: CommentBodyTextElementArgs, index: number) => T;
  /**
   * The link element used to display links.
   */
  link: (args: CommentBodyLinkElementArgs, index: number) => T;
  /**
   * The mention element used to display mentions.
   */
  mention: (args: CommentBodyMentionElementArgs<U>, index: number) => T;
};

export type ConvertCommentBody<T, U extends BaseUserMeta = DU> = {
  /**
   * A function that returns user info from user IDs.
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * The elements used to customize the resulting format `T`.
   */
  elements: ConvertCommentBodyElements<T, U>;
};

/**
 * Convert a `CommentBody` into a custom format `T`
 */
export async function convertCommentBody<T, U extends BaseUserMeta = DU>(
  body: CommentBody,
  options: ConvertCommentBody<T, U>
): Promise<T> {
  const resolvedUsers = await resolveUsersInCommentBody(
    body,
    options?.resolveUsers
  );

  const blocks: T[] = body.content
    .map((block, index) => {
      switch (block.type) {
        case "paragraph": {
          const children: T[] = block.children
            .map((inline, inlineIndex) => {
              if (isCommentBodyMention(inline)) {
                return options.elements.mention(
                  {
                    element: inline,
                    user: resolvedUsers.get(inline.id),
                  },
                  inlineIndex
                );
              }

              if (isCommentBodyLink(inline)) {
                const href = toAbsoluteUrl(inline.url) ?? inline.url;
                return options.elements.link(
                  { element: inline, href },
                  inlineIndex
                );
              }

              if (isCommentBodyText(inline)) {
                return options.elements.text({ element: inline }, inlineIndex);
              }

              return null;
            })
            .filter(exists);

          return options.elements.paragraph(
            { element: block, children },
            index
          );
        }
        default:
          console.warn(
            `Unsupported comment body block type: "${JSON.stringify(block.type)}"`
          );
          return null;
      }
    })
    .filter(exists);

  return options.elements.container({ children: blocks });
}

export type CommentBodyContainerComponentProps = {
  /**
   * The blocks of the comment body
   */
  children: ReactNode;
};

export type CommentBodyParagraphComponentProps = {
  /**
   * The text content of the paragraph.
   */
  children: ReactNode;
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
  Container: ComponentType<CommentBodyContainerComponentProps>;
  /**
   * The component used to display paragraphs.
   */
  Paragraph: ComponentType<CommentBodyParagraphComponentProps>;

  /**
   * The component used to display text elements.
   */
  Text: ComponentType<CommentBodyTextComponentProps>;

  /**
   * The component used to display links.
   */
  Link: ComponentType<CommentBodyLinkComponentProps>;

  /**
   * The component used to display mentions.
   */
  Mention: ComponentType<CommentBodyMentionComponentProps<U>>;
};

const baseComponents: ConvertCommentBodyAsReactComponents<BaseUserMeta> = {
  Container: ({ children }) => <div>{children}</div>,
  Paragraph: ({ children }) => <p>{children}</p>,
  Text: ({ element }) => {
    // Note: construction following the schema 👇
    // <code><s><em><strong>{element.text}</strong></s></em></code>
    let children: ReactNode = element.text;

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
    <span data-mention>
      {MENTION_CHARACTER}
      {user?.name ?? element.id}
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
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
};

/**
 * Convert a `CommentBody` into React elements
 */
export async function convertCommentBodyAsReact(
  body: CommentBody,
  options?: ConvertCommentBodyAsReactOptions<BaseUserMeta>
): Promise<ReactNode> {
  const Components = {
    ...baseComponents,
    ...options?.components,
  };
  const reactBody = await convertCommentBody<ReactNode, BaseUserMeta>(body, {
    resolveUsers: options?.resolveUsers,
    elements: {
      container: ({ children }) => (
        <Components.Container key={"lb-comment-body-container"}>
          {children}
        </Components.Container>
      ),
      paragraph: ({ children }, index) => (
        <Components.Paragraph key={`lb-comment-body-paragraph-${index}`}>
          {children}
        </Components.Paragraph>
      ),
      text: ({ element }, index) => (
        <Components.Text
          key={`lb-comment-body-text-${index}`}
          element={element}
        />
      ),
      link: ({ element, href }, index) => (
        <Components.Link
          key={`lb-comment-body-link-${index}`}
          element={element}
          href={href}
        />
      ),
      mention: ({ element, user }, index) =>
        element.id ? (
          <Components.Mention
            key={`lb-comment-body-mention-${index}`}
            element={element}
            user={user}
          />
        ) : null,
    },
  });

  return reactBody;
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
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
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

  const htmlBody = await convertCommentBody<string, BaseUserMeta>(body, {
    resolveUsers: options?.resolveUsers,
    // NOTE: using prettier-ignore to preserve template strings
    elements: {
      container: ({ children }) => children.join("\n"),
      paragraph: ({ children }) => {
        const unsafe = children.join("");
        // prettier-ignore
        return unsafe ? html`<p style="${toInlineCSSString(styles.paragraph)}">${htmlSafe(unsafe)}</p>` : unsafe;
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

        return html`${children}`;
      },
      link: ({ element, href }) => {
        // prettier-ignore
        return html`<a href="${href}" target="_blank" rel="noopener noreferrer" style="${toInlineCSSString(styles.link)}">${element.text ? html`${element.text}` : element.url}</a>`;
      },
      mention: ({ element, user }) => {
        // prettier-ignore
        return html`<span data-mention style="${toInlineCSSString(styles.mention)}">${MENTION_CHARACTER}${user?.name ? html`${user?.name}` : element.id}</span>`;
      },
    },
  });

  return htmlBody;
}
