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
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  sanitizeUrl,
} from "@liveblocks/core";

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

export type ConvertCommentBodyOptions<T, U extends BaseUserMeta = DU> = {
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
  options: ConvertCommentBodyOptions<T, U>
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
                const href = sanitizeUrl(inline.url);

                // If the URL is invalid, its text/URL are used as plain text.
                if (href === null) {
                  return options.elements.text(
                    {
                      element: { text: inline.text ?? inline.url },
                    },
                    inlineIndex
                  );
                }

                return options.elements.link(
                  {
                    element: inline,
                    href,
                  },
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
