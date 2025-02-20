import type {
  Awaitable,
  BaseRoomInfo,
  BaseUserMeta,
  CommentBody,
  CommentData,
  DRI,
  DU,
  InboxNotificationData,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  generateCommentUrl,
  getMentionedIdsFromCommentBody,
} from "@liveblocks/core";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";
import type { ReactNode } from "react";

import type {
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body";
import {
  convertCommentBodyAsHtml,
  convertCommentBodyAsReact,
} from "./comment-body";
import type { CommentDataWithBody } from "./comment-with-body";
import { filterCommentsWithBody } from "./comment-with-body";
import { resolveAuthorsInfo } from "./lib/authors";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";
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

export type CommentEmailBaseData = {
  id: string;
  threadId: string;
  roomId: string;
  userId: string;
  createdAt: Date;
  url?: string;
  rawBody: CommentBody;
};

type PrepareThreadNotificationEmailBaseDataOptions = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (args: ResolveRoomInfoArgs) => Awaitable<DRI | undefined>;
};

export type ThreadNotificationEmailBaseData = (
  | { type: "unreadMention"; comment: CommentEmailBaseData }
  | { type: "unreadReplies"; comments: CommentEmailBaseData[] }
) & { roomInfo: DRI };

/** @internal */
export const makeCommentEmailBaseData = ({
  roomInfo,
  comment,
}: {
  roomInfo: BaseRoomInfo | undefined;
  comment: CommentDataWithBody;
}): CommentEmailBaseData => {
  const url = roomInfo?.url
    ? generateCommentUrl({
        roomUrl: roomInfo?.url,
        commentId: comment.id,
      })
    : undefined;

  return {
    id: comment.id,
    userId: comment.userId,
    threadId: comment.threadId,
    roomId: comment.roomId,
    createdAt: comment.createdAt,
    url,
    rawBody: comment.body,
  };
};

/** @internal */
export const prepareThreadNotificationEmailBaseData = async ({
  client,
  event,
  options = {},
}: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailBaseDataOptions;
}): Promise<ThreadNotificationEmailBaseData | null> => {
  const { roomId } = event.data;

  const roomInfo = options.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId })
    : undefined;
  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? roomId,
  };

  const data = await extractThreadNotificationData({ client, event });
  if (data === null) {
    return null;
  }

  switch (data.type) {
    case "unreadMention":
      return {
        type: "unreadMention",
        comment: makeCommentEmailBaseData({
          roomInfo,
          comment: data.comment,
        }),
        roomInfo: resolvedRoomInfo,
      };
    case "unreadReplies": {
      return {
        type: "unreadReplies",
        comments: data.comments.map((comment) =>
          makeCommentEmailBaseData({ roomInfo, comment })
        ),
        roomInfo: resolvedRoomInfo,
      };
    }
  }
};

export type CommentEmailAsHtmlData<U extends BaseUserMeta = DU> = Omit<
  CommentEmailBaseData,
  "userId" | "rawBody"
> & {
  author: U;
  htmlBody: string;
};

export type CommentEmailAsReactData<U extends BaseUserMeta = DU> = Omit<
  CommentEmailBaseData,
  "userId" | "rawBody"
> & {
  author: U;
  reactBody: ReactNode;
};

type ThreadNotificationEmailUnreadRepliesData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHtmlData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadReplies";
  comments: C[];
};

type ThreadNotificationEmailUnreadMentionsData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHtmlData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadMention";
  comment: C;
};

// Note: export for testing helpers
export type ThreadNotificationEmailData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHtmlData<U> | CommentEmailAsReactData<U>,
> = (
  | ThreadNotificationEmailUnreadRepliesData<U, C>
  | ThreadNotificationEmailUnreadMentionsData<U, C>
) & { roomInfo: DRI };

export type PrepareThreadNotificationEmailAsHtmlOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
  /**
   * The styles used to customize the html elements in the resulting html safe string inside a comment body.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertCommentBodyAsHtmlStyles>;
};

export type ThreadNotificationEmailDataAsHtml = ThreadNotificationEmailData<
  BaseUserMeta,
  CommentEmailAsHtmlData
>;

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
  const data = await prepareThreadNotificationEmailBaseData({
    client,
    event,
    options: { resolveRoomInfo: options.resolveRoomInfo },
  });

  if (data === null) {
    return null;
  }

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options.resolveUsers,
    callerName: "prepareThreadNotificationEmailAsHtml",
  });

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: [comment.userId],
        resolveUsers: batchUsersResolver.resolveUsers,
      });
      const commentBodyPromise = convertCommentBodyAsHtml(comment.rawBody, {
        resolveUsers: batchUsersResolver.resolveUsers,
        styles: options.styles,
      });

      await batchUsersResolver.resolve();

      const [authorsInfo, commentBodyHtml] = await Promise.all([
        authorsInfoPromise,
        commentBodyPromise,
      ]);
      const authorInfo = authorsInfo.get(comment.userId);

      return {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: comment.threadId,
          roomId: comment.roomId,
          author: {
            id: comment.userId,
            info: authorInfo ?? { name: comment.userId },
          },
          createdAt: comment.createdAt,
          url: comment.url,
          htmlBody: commentBodyHtml,
        },
        roomInfo: data.roomInfo,
      };
    }
    case "unreadReplies": {
      const { comments } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: comments.map((c) => c.userId),
        resolveUsers: batchUsersResolver.resolveUsers,
      });
      const commentBodiesPromises = comments.map((c) =>
        convertCommentBodyAsHtml(c.rawBody, {
          resolveUsers: batchUsersResolver.resolveUsers,
          styles: options.styles,
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
          const commentBodyHtml = commentBodies[index];

          return {
            id: comment.id,
            threadId: comment.threadId,
            roomId: comment.roomId,
            author: {
              id: comment.userId,
              info: authorInfo ?? { name: comment.userId },
            },
            createdAt: comment.createdAt,
            url: comment.url,
            htmlBody: commentBodyHtml ?? "",
          };
        }),
        roomInfo: data.roomInfo,
      };
    }
  }
}

export type PrepareThreadNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
  /**
   * The components used to customize the resulting React nodes inside a comment body.
   * Each components has priority over the base components inherited internally defined.
   */
  components?: Partial<ConvertCommentBodyAsReactComponents<U>>;
};

export type ThreadNotificationEmailDataAsReact = ThreadNotificationEmailData<
  BaseUserMeta,
  CommentEmailAsReactData
>;

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
  const data = await prepareThreadNotificationEmailBaseData({
    client,
    event,
    options: { resolveRoomInfo: options.resolveRoomInfo },
  });

  if (data === null) {
    return null;
  }

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options.resolveUsers,
    callerName: "prepareThreadNotificationEmailAsReact",
  });

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: [comment.userId],
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodyPromise = convertCommentBodyAsReact(comment.rawBody, {
        resolveUsers: batchUsersResolver.resolveUsers,
        components: options.components,
      });

      await batchUsersResolver.resolve();

      const [authorsInfo, commentBodyReact] = await Promise.all([
        authorsInfoPromise,
        commentBodyPromise,
      ]);
      const authorInfo = authorsInfo.get(comment.userId);

      return {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: comment.threadId,
          roomId: comment.roomId,
          author: {
            id: comment.userId,
            info: authorInfo ?? { name: comment.userId },
          },
          createdAt: comment.createdAt,
          url: comment.url,
          reactBody: commentBodyReact,
        },
        roomInfo: data.roomInfo,
      };
    }
    case "unreadReplies": {
      const { comments } = data;
      const authorsInfoPromise = resolveAuthorsInfo({
        userIds: comments.map((c) => c.userId),
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodiesPromises = comments.map((c) =>
        convertCommentBodyAsReact(c.rawBody, {
          resolveUsers: batchUsersResolver.resolveUsers,
          components: options.components,
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
          const commentBodyReact = commentBodies[index];

          return {
            id: comment.id,
            threadId: comment.threadId,
            roomId: comment.roomId,
            author: {
              id: comment.userId,
              info: authorInfo ?? { name: comment.userId },
            },
            createdAt: comment.createdAt,
            url: comment.url,
            reactBody: commentBodyReact ?? null,
          };
        }),
        roomInfo: data.roomInfo,
      };
    }
  }
}
