import type {
  Awaitable,
  BaseGroupInfo,
  BaseUserMeta,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyText,
  CommentData,
  DGI,
  DRI,
  DU,
  InboxNotificationData,
  ResolveGroupsInfoArgs,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  generateUrl,
  getMentionsFromCommentBody,
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
  notificationTriggerAt,
  userId,
}: {
  comments: CommentData[];
  inboxNotification: InboxNotificationData;
  notificationTriggerAt: Date;
  userId: string;
}): CommentDataWithBody[] => {
  // Let's get only not deleted comments with a body.
  const commentsWithBody = filterCommentsWithBody(comments);
  // Let's filter out comments written by the user that received the notification.
  const notAuthoredComments = commentsWithBody.filter(
    (c) => c.userId !== userId
  );

  const readAt = inboxNotification.readAt;
  // This behavior is different from the `InboxNotificationThread` component
  // because we in the front-end we want the always the last activity.
  // In this case then we want to do a sequential reading of the activity.
  // It allow us to determine much more precisely which comments was created between
  // the moment the inbox notification is created and the moment the webhook event is received.
  return notAuthoredComments.filter((c) => {
    // If the inbox notification is read, because of the 1:1 relationship between an
    // and inbox notification and a thread, we must not include comments created
    // strictly after the `readAt` date. It means the inbox notification can be updated
    // in the db after the `readAt` date.
    if (readAt !== null) {
      return (
        c.createdAt > readAt &&
        c.createdAt >= notificationTriggerAt &&
        c.createdAt <= inboxNotification.notifiedAt
      );
    }
    // Otherwise we can include all comments created between the inbox notification
    // creation date (`triggeredAt`) and the inbox notification `notifiedAt` date.
    return (
      c.createdAt >= notificationTriggerAt &&
      c.createdAt <= inboxNotification.notifiedAt
    );
  });
};

// TODO: Update to handle group mentions
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
        const mentions = getMentionsFromCommentBody(
          c.body,
          (mention) => mention.kind === "user" && mention.id === mentionedUserId
        );
        return mentions.length > 0;
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

  const notificationTriggerAt = new Date(event.data.triggeredAt);
  const unreadComments = getUnreadComments({
    comments: thread.comments,
    inboxNotification,
    userId,
    notificationTriggerAt,
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

/**
 * @internal
 * Set the comment ID as the URL hash and a query param.
 */
function generateCommentUrl({
  roomUrl,
  commentId,
}: {
  roomUrl: string | undefined;
  commentId: string;
}): string | undefined {
  if (!roomUrl) {
    return;
  }

  return generateUrl(roomUrl, undefined, commentId);
}

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
  CommentEmailData<string, U>;

export type CommentEmailAsReactData<U extends BaseUserMeta = DU> =
  CommentEmailData<ReactNode, U>;

type PrepareThreadNotificationEmailOptions<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (args: ResolveRoomInfoArgs) => Awaitable<DRI | undefined>;

  /**
   * A function that returns user info from user IDs.
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * A function that returns group info from group IDs.
   * You should return a list of group info objects of the same size, in the same order.
   */
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(GI | undefined)[] | undefined>;
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

  // TODO: Add resolveGroupsInfo

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: [comment.userId],
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodyPromise = convertCommentBody<BodyType, U>(comment.body, {
        resolveUsers: batchUsersResolver.resolveUsers,
        // TODO: resolveGroupsInfo: batchGroupsResolver.resolveGroupsInfo,
        elements,
      });

      await batchUsersResolver.resolve();

      const [authorsInfo, commentBody] = await Promise.all([
        authorsInfoPromise,
        commentBodyPromise,
      ]);

      const authorInfo = authorsInfo.get(comment.userId);
      const url = generateCommentUrl({
        roomUrl: roomInfo?.url,
        commentId: comment.id,
      });

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
          // TODO: resolveGroupsInfo: batchGroupsResolver.resolveGroupsInfo,
          elements,
        })
      );

      await batchUsersResolver.resolve();
      // TODO: await batchGroupsResolver.resolve();

      const [authorsInfo, ...commentBodies] = await Promise.all([
        authorsInfoPromise,
        ...commentBodiesPromises,
      ]);

      return {
        type: "unreadReplies",
        comments: comments.map((comment, index) => {
          const authorInfo = authorsInfo.get(comment.userId);
          const commentBody = commentBodies[index] as BodyType;

          const url = generateCommentUrl({
            roomUrl: roomInfo?.url,
            commentId: comment.id,
          });

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
      resolveGroupsInfo: options.resolveGroupsInfo,
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
      mention: ({ element, user, group }) => {
        // prettier-ignore
        return html`<span data-mention style="${toInlineCSSString(styles.mention)}">${MENTION_CHARACTER}${user?.name ? html`${user?.name}` : group?.name ? html`${group?.name}` : element.id}</span>`;
      },
    },
    "prepareThreadNotificationEmailAsHtml"
  );

  if (data === null) {
    return null;
  }

  return data;
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

export type CommentBodyMentionComponentProps<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * The mention element.
   */
  element: CommentBodyMention;

  /**
   * The mention's user info, if the mention is a user mention and the `resolvedUsers` option was provided.
   */
  user?: U["info"];

  /**
   * The mention's group info, if the mention is a group mention and the `resolvedGroupsInfo` option was provided.
   */
  group?: GI;
};

export type ConvertCommentBodyAsReactComponents<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
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
  Mention: ComponentType<CommentBodyMentionComponentProps<U, GI>>;
};

const baseComponents: ConvertCommentBodyAsReactComponents<BaseUserMeta, DGI> = {
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
  Mention: ({ element, user, group }) => (
    <span data-mention>
      {MENTION_CHARACTER}
      {user?.name ?? group?.name ?? element.id}
    </span>
  ),
};

export type PrepareThreadNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = PrepareThreadNotificationEmailOptions<U, GI> & {
  /**
   * The components used to customize the resulting React nodes inside a comment body.
   * Each components has priority over the base components inherited internally defined.
   */
  components?: Partial<ConvertCommentBodyAsReactComponents<U, GI>>;
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
      resolveGroupsInfo: options.resolveGroupsInfo,
      resolveRoomInfo: options.resolveRoomInfo,
    },
    {
      container: ({ children }) => (
        <Components.Container key="lb-comment-body-container">
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
      mention: ({ element, user, group }, index) =>
        element.id ? (
          <Components.Mention
            key={`lb-comment-body-mention-${index}`}
            element={element}
            user={user}
            group={group}
          />
        ) : null,
    },
    "prepareThreadNotificationEmailAsReact"
  );

  if (data === null) {
    return null;
  }

  return data;
}
