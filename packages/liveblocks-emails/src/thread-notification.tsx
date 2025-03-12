import type {
  Awaitable,
  BaseUserMeta,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyText,
  CommentData,
  DRI,
  DU,
  InboxNotificationData,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  generateCommentUrl,
  getMentionedIdsFromCommentBody,
  html,
  htmlSafe,
} from "@liveblocks/core";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";
import type { ComponentType, ReactNode } from "react";

import type { ConvertCommentBodyElements } from "./comment-body";
import { convertCommentBody } from "./comment-body";
import type { CommentDataWithBody } from "./comment-with-body";
import { filterCommentsWithBody } from "./comment-with-body";
import { resolveAuthorsInfo } from "./lib/authors";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";
import { MENTION_CHARACTER } from "./lib/constants";
import type { CSSProperties } from "./lib/css-properties";
import { toInlineCSSString } from "./lib/css-properties";
import type { ResolveRoomInfoArgs } from "./lib/types";

/** @internal */
export const getUnreadComments = ({
  comments,
  inboxNotification,
  userId,
}: {
  comments: CommentData[];
  inboxNotification: InboxNotificationData;
  userId: string;
}): CommentDataWithBody[] => {
  const commentsWithBody = filterCommentsWithBody(comments);
  const otherUserComments = commentsWithBody.filter((c) => c.userId !== userId);

  const readAt = inboxNotification.readAt;

  return otherUserComments.filter((c) => {
    // If the notification was read, we only want to comments created after the readAt date
    // and before (or equal) the notifiedAt date of the inbox notification.
    //
    // Same behavior as in the `InboxNotificationThread` component.
    // See → https://github.com/liveblocks/liveblocks/blob/a2e621ce5e0db2b810413e8711c227a759141820/packages/liveblocks-react-ui/src/components/internal/InboxNotificationThread.tsx#L162
    if (readAt !== null) {
      return (
        c.createdAt > readAt && c.createdAt <= inboxNotification.notifiedAt
      );
    }

    // Otherwise takes every comments created before (or equal) the notifiedAt date of the inbox notification.
    //
    // Same behavior as in the `InboxNotificationThread` component.
    // See → https://github.com/liveblocks/liveblocks/blob/a2e621ce5e0db2b810413e8711c227a759141820/packages/liveblocks-react-ui/src/components/internal/InboxNotificationThread.tsx#L162
    return c.createdAt <= inboxNotification.notifiedAt;
  });
};

/** @internal */
export const getLastUnreadCommentWithMention = ({
  comments,
  mentionedUserId,
}: {
  comments: CommentDataWithBody[];
  mentionedUserId: string;
}): CommentDataWithBody | null => {
  return (
    Array.from(comments)
      .reverse()
      .filter((c) => c.userId !== mentionedUserId)
      .find((c) => {
        const mentionedUserIds = getMentionedIdsFromCommentBody(c.body);
        return mentionedUserIds.includes(mentionedUserId);
      }) ?? null
  );
};

export type ThreadNotificationData =
  | { type: "unreadMention"; comment: CommentDataWithBody }
  | { type: "unreadReplies"; comments: CommentDataWithBody[] };

/** @internal */
export const extractThreadNotificationData = async ({
  client,
  event,
}: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
}): Promise<ThreadNotificationData | null> => {
  const { threadId, roomId, userId, inboxNotificationId } = event.data;
  const [thread, inboxNotification] = await Promise.all([
    client.getThread({ roomId, threadId }),
    client.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  const unreadComments = getUnreadComments({
    comments: thread.comments,
    inboxNotification,
    userId,
  });

  if (unreadComments.length <= 0) {
    return null;
  }

  const lastUnreadCommentWithMention = getLastUnreadCommentWithMention({
    comments: unreadComments,
    mentionedUserId: userId,
  });
  if (lastUnreadCommentWithMention !== null) {
    return { type: "unreadMention", comment: lastUnreadCommentWithMention };
  }

  return {
    type: "unreadReplies",
    comments: unreadComments,
  };
};

export type CommentEmailData<BodyType, U extends BaseUserMeta = DU> = {
  id: string;
  threadId: string;
  roomId: string;
  createdAt: Date;
  url?: string;
  author: U;
  body: BodyType;
};

export type ThreadNotificationEmailData<
  BodyType,
  U extends BaseUserMeta = DU,
  // Keeping backward compatibility with the `reactBody` and `htmlBody` properties
  // that was used in the previous versions.
  C extends CommentEmailData<BodyType, U> = CommentEmailData<BodyType, U>,
> = (
  | {
      type: "unreadReplies";
      comments: C[];
    }
  | {
      type: "unreadMention";
      comment: C;
    }
) & { roomInfo: DRI };

export type CommentEmailAsHtmlData<U extends BaseUserMeta = DU> =
  CommentEmailData<string, U> & {
    /** @deprecated Use `body` property instead. */
    htmlBody: string;
  };

export type CommentEmailAsReactData<U extends BaseUserMeta = DU> =
  CommentEmailData<ReactNode, U> & {
    /** @deprecated Use `body` property instead. */
    reactBody: ReactNode;
  };

type PrepareThreadNotificationEmailOptions<U extends BaseUserMeta = DU> = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (args: ResolveRoomInfoArgs) => Awaitable<DRI | undefined>;

  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
};

/**
 * @internal
 * exported for testing purposes.
 */
export async function prepareThreadNotificationEmail<
  BodyType,
  U extends BaseUserMeta = DU,
>(
  client: Liveblocks,
  event: ThreadNotificationEvent,
  options: PrepareThreadNotificationEmailOptions<U>,
  elements: ConvertCommentBodyElements<BodyType, U>,
  callerName: string
): Promise<ThreadNotificationEmailData<BodyType, U> | null> {
  const data = await extractThreadNotificationData({ client, event });
  if (data === null) {
    return null;
  }

  const roomInfo = options.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId: event.data.roomId })
    : undefined;

  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? event.data.roomId,
  };

  const batchUsersResolver = createBatchUsersResolver<U>({
    resolveUsers: options.resolveUsers,
    callerName,
  });

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: [comment.userId],
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodyPromise = convertCommentBody<BodyType, U>(comment.body, {
        resolveUsers: batchUsersResolver.resolveUsers,
        elements,
      });

      await batchUsersResolver.resolve();

      const [authorsInfo, commentBody] = await Promise.all([
        authorsInfoPromise,
        commentBodyPromise,
      ]);

      const authorInfo = authorsInfo.get(comment.userId);
      const url = roomInfo?.url
        ? generateCommentUrl({
            roomUrl: roomInfo?.url,
            commentId: comment.id,
          })
        : undefined;

      return {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: comment.threadId,
          roomId: comment.roomId,
          author: {
            id: comment.userId,
            info: authorInfo ?? { name: comment.userId },
          } as U,
          createdAt: comment.createdAt,
          url,
          body: commentBody as BodyType,
        },
        roomInfo: resolvedRoomInfo,
      };
    }
    case "unreadReplies": {
      const { comments } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: comments.map((c) => c.userId),
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodiesPromises = comments.map((c) =>
        convertCommentBody<BodyType, U>(c.body, {
          resolveUsers: batchUsersResolver.resolveUsers,
          elements,
        })
      );

      await batchUsersResolver.resolve();

      const [authorsInfo, ...commentBodies] = await Promise.all([
        authorsInfoPromise,
        ...commentBodiesPromises,
      ]);

      return {
        type: "unreadReplies",
        comments: comments.map((comment, index) => {
          const authorInfo = authorsInfo.get(comment.userId);
          const commentBody = commentBodies[index] as BodyType;

          const url = roomInfo?.url
            ? generateCommentUrl({
                roomUrl: roomInfo?.url,
                commentId: comment.id,
              })
            : undefined;

          return {
            id: comment.id,
            threadId: comment.threadId,
            roomId: comment.roomId,
            author: {
              id: comment.userId,
              info: authorInfo ?? { name: comment.userId },
            } as U,
            createdAt: comment.createdAt,
            url,
            body: commentBody,
          };
        }),
        roomInfo: resolvedRoomInfo,
      };
    }
  }
}

/**
 * The styles used to customize the html elements in the resulting html safe string.
 * Each styles has priority over the base styles inherited.
 */
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

export type PrepareThreadNotificationEmailAsHtmlOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailOptions<U> & {
  /**
   * The styles used to customize the html elements in the resulting html safe string inside a comment body.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertCommentBodyAsHtmlStyles>;
};

export type ThreadNotificationEmailDataAsHtml<U extends BaseUserMeta = DU> =
  ThreadNotificationEmailData<string, U, CommentEmailAsHtmlData<U>>;

/**
 * Prepares data from a `ThreadNotificationEvent` and convert comment bodies as an html safe string.
 *
 * @param client The `Liveblocks` node client
 * @param event The `ThreadNotificationEvent` received in the webhook handler
 * @param options The optional options to provide to resolve users, resolve room info
 * and customize comment bodies html elements styles with inline CSS.
 *
 * It returns a `ThreadNotificationEmailDataAsHtml` or `null` if there are no unread comments (mention or replies).
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareThreadNotificationEmailAsHtml } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareThreadNotificationEmailAsHtml(
 *  liveblocks,
 *  event,
 *  {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    styles,
 *  }
 * )
 *
 */
export async function prepareThreadNotificationEmailAsHtml(
  client: Liveblocks,
  event: ThreadNotificationEvent,
  options: PrepareThreadNotificationEmailAsHtmlOptions<BaseUserMeta> = {}
): Promise<ThreadNotificationEmailDataAsHtml | null> {
  const styles = { ...baseStyles, ...options?.styles };
  const data = await prepareThreadNotificationEmail<string, BaseUserMeta>(
    client,
    event,
    {
      resolveUsers: options.resolveUsers,
      resolveRoomInfo: options.resolveRoomInfo,
    },
    {
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
    "prepareThreadNotificationEmailAsHtml"
  );

  // Keeping backward compatibility with the `htmlBody` property
  // that was used in the previous versions.
  if (data === null) {
    return null;
  }

  switch (data.type) {
    case "unreadMention": {
      return {
        ...data,
        comment: { ...data.comment, htmlBody: data.comment.body },
      };
    }
    case "unreadReplies": {
      return {
        ...data,
        comments: data.comments.map((comment) => ({
          ...comment,
          htmlBody: comment.body,
        })),
      };
    }
  }
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

export type PrepareThreadNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailOptions<U> & {
  /**
   * The components used to customize the resulting React nodes inside a comment body.
   * Each components has priority over the base components inherited internally defined.
   */
  components?: Partial<ConvertCommentBodyAsReactComponents<U>>;
};

export type ThreadNotificationEmailDataAsReact<U extends BaseUserMeta = DU> =
  ThreadNotificationEmailData<ReactNode, U, CommentEmailAsReactData<U>>;

/**
 * Prepares data from a `ThreadNotificationEvent` and convert comment bodies as React nodes.
 *
 * @param client The `Liveblocks` node client
 * @param event The `ThreadNotificationEvent` received in the webhook handler
 * @param options The optional options to provide to resolve users, resolve room info and customize comment bodies React components.
 *
 * It returns a `ThreadNotificationEmailDataAsReact` or `null` if there are no unread comments (mention or replies).
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareThreadNotificationEmailAsReact(
 *  liveblocks,
 *  event,
 *  {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    components,
 *  }
 * )
 *
 */
export async function prepareThreadNotificationEmailAsReact(
  client: Liveblocks,
  event: ThreadNotificationEvent,
  options: PrepareThreadNotificationEmailAsReactOptions<BaseUserMeta> = {}
): Promise<ThreadNotificationEmailDataAsReact | null> {
  const Components = { ...baseComponents, ...options?.components };
  const data = await prepareThreadNotificationEmail<ReactNode, BaseUserMeta>(
    client,
    event,
    {
      resolveUsers: options.resolveUsers,
      resolveRoomInfo: options.resolveRoomInfo,
    },
    {
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
    "prepareThreadNotificationEmailAsReact"
  );

  // Keeping backward compatibility with the `reactBody` property
  // that was used in the previous versions.
  if (data === null) {
    return null;
  }

  switch (data.type) {
    case "unreadMention": {
      return {
        ...data,
        comment: { ...data.comment, reactBody: data.comment.body },
      };
    }
    case "unreadReplies": {
      return {
        ...data,
        comments: data.comments.map((comment) => ({
          ...comment,
          reactBody: comment.body,
        })),
      };
    }
  }
}
