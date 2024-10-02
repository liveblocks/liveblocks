import type {
  BaseRoomInfo,
  BaseUserMeta,
  CommentBody,
  CommentData,
  DRI,
  DU,
  InboxNotificationData,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";
import {
  generateCommentUrl,
  getMentionedIdsFromCommentBody,
} from "@liveblocks/core";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";
import React from "react";

import type {
  ConvertCommentBodyAsHTMLStyles,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body";
import {
  convertCommentBodyAsHTML,
  convertCommentBodyAsReact,
} from "./comment-body";
import type { CommentDataWithBody } from "./comment-with-body";
import { filterCommentsWithBody } from "./comment-with-body";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";

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
  const readAt = inboxNotification.readAt;

  return commentsWithBody
    .filter((c) => c.userId !== userId)
    .filter((c) =>
      readAt
        ? c.createdAt > readAt && c.createdAt <= inboxNotification.notifiedAt
        : c.createdAt <= inboxNotification.notifiedAt
    );
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

export type ResolveRoomInfoArgs = {
  /**
   * The ID of the room to resolve
   */
  roomId: string;
};

type PrepareThreadNotificationEmailBaseDataOptions = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (
    args: ResolveRoomInfoArgs
  ) => OptionalPromise<DRI | undefined>;
};

export type ThreadNotificationBaseData = (
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
  options,
}: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailBaseDataOptions;
}): Promise<ThreadNotificationBaseData | null> => {
  const { roomId } = event.data;

  const roomInfo = options?.resolveRoomInfo
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

/** @internal */
const resolveAuthorsInfo = async <U extends BaseUserMeta>({
  comments,
  resolveUsers,
}: {
  comments: CommentEmailBaseData[];
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
}): Promise<Map<string, U["info"]>> => {
  const resolvedAuthors = new Map<string, U["info"]>();
  if (!resolveUsers) {
    return resolvedAuthors;
  }

  const userIds = comments.map((c) => c.userId);
  const users = await resolveUsers({ userIds });

  for (const [index, userId] of userIds.entries()) {
    const user = users?.[index];
    if (user) {
      resolvedAuthors.set(userId, user);
    }
  }

  return resolvedAuthors;
};

export type CommentEmailAsHTMLData<U extends BaseUserMeta = DU> = Omit<
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
  reactBody: React.ReactNode;
};

type ThreadNotificationEmailUnreadRepliesData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadReplies";
  comments: C[];
};

type ThreadNotificationEmailUnreadMentionsData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadMention";
  comment: C;
};

// Note: export for testing helpers
export type ThreadNotificationEmailData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = (
  | ThreadNotificationEmailUnreadRepliesData<U, C>
  | ThreadNotificationEmailUnreadMentionsData<U, C>
) & { roomInfo: DRI };

export type PrepareThreadNotificationEmailAsHTMLOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  /**
   * The styles used to customize the html elements in the resulting HTML safe string.
   * Each styles has priority over the base styles inherited.
   */
  commentBodyStyles?: Partial<ConvertCommentBodyAsHTMLStyles>;
};

export type ThreadNotificationEmailDataAsHTML = ThreadNotificationEmailData<
  BaseUserMeta,
  CommentEmailAsHTMLData
>;

/**
 * Prepares data from a `ThreadNotificationEvent` and convert comment bodies as an HTML safe string
 *
 * @param params.client The `Liveblocks` node client
 * @param params.event The `ThreadNotificationEvent` received in the webhook handler
 * @param params.options The options to provides to resolve users, resolve room info
 * and customize bodies html elements styles with inline css.
 *
 * It returns `null` if there are no unread comments (mention or replies).
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareThreadNotificationEmailAsHTML } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareThreadNotificationEmailAsHTML({
 *  client: liveblocks,
 *  event,
 *  options: {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    commentBodyStyles,
 *  }
 * })
 *
 */
export async function prepareThreadNotificationEmailAsHTML(params: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailAsHTMLOptions<BaseUserMeta>;
}): Promise<ThreadNotificationEmailDataAsHTML | null> {
  const { client, event, options } = params;
  const data = await prepareThreadNotificationEmailBaseData({
    client,
    event,
    options: { resolveRoomInfo: options?.resolveRoomInfo },
  });

  if (data === null) {
    return null;
  }

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options?.resolveUsers,
    callerName: "prepareThreadNotificationEmailAsHTML",
  });

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        comments: [comment],
        resolveUsers: batchUsersResolver.resolveUsers,
      });
      const commentBodyPromise = convertCommentBodyAsHTML(comment.rawBody, {
        resolveUsers: batchUsersResolver.resolveUsers,
        styles: options?.commentBodyStyles,
      });

      await batchUsersResolver.resolve();

      const [authorsInfo, commentBodyHTML] = await Promise.all([
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
          author: authorInfo
            ? { id: comment.userId, info: authorInfo }
            : { id: comment.userId, info: { name: comment.userId } },
          createdAt: comment.createdAt,
          url: comment.url,
          htmlBody: commentBodyHTML,
        },
        roomInfo: data.roomInfo,
      };
    }
    case "unreadReplies": {
      const { comments } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        comments,
        resolveUsers: batchUsersResolver.resolveUsers,
      });
      const commentBodiesPromises = comments.map((c) =>
        convertCommentBodyAsHTML(c.rawBody, {
          resolveUsers: batchUsersResolver.resolveUsers,
          styles: options?.commentBodyStyles,
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
          const commentBodyHTML = commentBodies[index];

          return {
            id: comment.id,
            threadId: comment.threadId,
            roomId: comment.roomId,
            author: authorInfo
              ? { id: comment.userId, info: authorInfo }
              : { id: comment.userId, info: { name: comment.userId } },
            createdAt: comment.createdAt,
            url: comment.url,
            htmlBody: commentBodyHTML ?? "",
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
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  commentBodyComponents?: Partial<ConvertCommentBodyAsReactComponents<U>>;
};

export type ThreadNotificationEmailDataAsReact = ThreadNotificationEmailData<
  BaseUserMeta,
  CommentEmailAsReactData
>;

/**
 * Prepares data from a `ThreadNotificationEvent` and convert comment bodies as React nodes.
 *
 * @param params.client The `Liveblocks` node client
 * @param params.event The `ThreadNotificationEvent` received in the webhook handler
 * @param params.options The options to provides to resolve users, resolve room info and customize comment bodies React components.
 *
 * It returns `null` if there are no unread comments (mention or replies).
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareThreadNotificationEmailAsReact({
 *  client: liveblocks,
 *  event,
 *  options: {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    commentBodyComponents,
 *  }
 * })
 *
 */
export async function prepareThreadNotificationEmailAsReact(params: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailAsReactOptions<BaseUserMeta>;
}): Promise<ThreadNotificationEmailDataAsReact | null> {
  const { client, event, options } = params;
  const data = await prepareThreadNotificationEmailBaseData({
    client,
    event,
    options: { resolveRoomInfo: options?.resolveRoomInfo },
  });

  if (data === null) {
    return null;
  }

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options?.resolveUsers,
    callerName: "prepareThreadNotificationEmailAsReact",
  });

  switch (data.type) {
    case "unreadMention": {
      const { comment } = data;

      const authorsInfoPromise = resolveAuthorsInfo({
        comments: [comment],
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodyPromise = convertCommentBodyAsReact(comment.rawBody, {
        resolveUsers: batchUsersResolver.resolveUsers,
        components: options?.commentBodyComponents,
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
          author: authorInfo
            ? { id: comment.userId, info: authorInfo }
            : { id: comment.userId, info: { name: comment.userId } },
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
        comments,
        resolveUsers: batchUsersResolver.resolveUsers,
      });

      const commentBodiesPromises = comments.map((c) =>
        convertCommentBodyAsReact(c.rawBody, {
          resolveUsers: batchUsersResolver.resolveUsers,
          components: options?.commentBodyComponents,
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
            author: authorInfo
              ? { id: comment.userId, info: authorInfo }
              : { id: comment.userId, info: { name: comment.userId } },
            createdAt: comment.createdAt,
            url: comment.url,
            reactBody: commentBodyReact ?? <React.Fragment />,
          };
        }),
        roomInfo: data.roomInfo,
      };
    }
  }
}
