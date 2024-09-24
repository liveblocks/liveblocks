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
  stringifyCommentBody,
} from "@liveblocks/core";
import type { Liveblocks, ThreadNotificationEvent } from "@liveblocks/node";

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
}): Promise<ThreadNotificationData> => {
  const { threadId, roomId, userId, inboxNotificationId } = event.data;
  const [thread, inboxNotification] = await Promise.all([
    client.getThread({ roomId, threadId }),
    client.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  const comments = getUnreadComments({
    comments: thread.comments,
    inboxNotification,
    userId,
  });

  const lastUnreadCommentWithMention = getLastUnreadCommentWithMention({
    comments,
    mentionedUserId: userId,
  });
  if (lastUnreadCommentWithMention !== null) {
    return { type: "unreadMention", comment: lastUnreadCommentWithMention };
  }

  return {
    type: "unreadReplies",
    comments,
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
}): Promise<ThreadNotificationBaseData> => {
  const { roomId } = event.data;

  const roomInfo = options?.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId })
    : undefined;
  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? roomId,
  };

  const data = await extractThreadNotificationData({ client, event });
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

type CommentEmailAsHTMLData<U extends BaseUserMeta> = Omit<
  CommentEmailBaseData,
  "userId" | "rawBody"
> & {
  author: U;
  htmlBody: string;
};

type CommentEmailAsReactData<U extends BaseUserMeta> = Omit<
  CommentEmailBaseData,
  "userId" | "rawBody"
> & {
  author: U;
  reactBody: JSX.Element;
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

type ThreadNotificationEmailData<
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
  // TEMP
  commentBodyStyles?: Record<string, string>;
};

export type ThreadNotificationEmailAsHTML = ThreadNotificationEmailData<
  BaseUserMeta,
  CommentEmailAsHTMLData<BaseUserMeta>
>;

/**
 * TODO add jsdoc
 */
export async function prepareThreadNotificationEmailAsHTML(params: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailAsHTMLOptions<BaseUserMeta>;
}): Promise<ThreadNotificationEmailAsHTML> {
  const { client, event, options } = params;
  const data = await prepareThreadNotificationEmailBaseData({
    client,
    event,
    options: { resolveRoomInfo: options?.resolveRoomInfo },
  });

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
      const commentBodyPromise = stringifyCommentBody(comment.rawBody, {
        format: "html",
        resolveUsers: batchUsersResolver.resolveUsers,
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
      const baseComments = data.comments;

      const authorsInfoPromise = resolveAuthorsInfo({
        comments: baseComments,
        resolveUsers: batchUsersResolver.resolveUsers,
      });
      const commentBodiesPromises = baseComments.map((c) =>
        stringifyCommentBody(c.rawBody, {
          format: "html",
          resolveUsers: batchUsersResolver.resolveUsers,
        })
      );

      await batchUsersResolver.resolve();

      const authorsInfo = await authorsInfoPromise;
      const commentBodies = await Promise.all(commentBodiesPromises);

      return {
        type: "unreadReplies",
        comments: baseComments.map((comment, index) => {
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
