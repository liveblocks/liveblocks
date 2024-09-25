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
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  toAbsoluteUrl,
} from "@liveblocks/core";
import React from "react";

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
  Slot: ({ children }) => <div>{children}</div>,
  Paragraph: ({ children }, index) => (
    <p key={`lb-comment-body-paragraph-${index}`}>{children}</p>
  ),
  Text: ({ element }) => {
    // Note: construction following the schema 👇
    // <code><s><em><strong>{element.text}</strong></s></em></code>
    let children: React.ReactNode = element.text;
    if (!children) {
      return children;
    }

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

    return children;
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
   * The elements used to customize the resulting string. Each element has
   * priority over the defaults inherited from the `format` option.
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

  return components.Slot({ children: blocks });
}
