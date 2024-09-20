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

import type { CommentDataWithBody } from "./comment-with-body";
import { filterCommentsWithBody } from "./comment-with-body";

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

export type CommentEmailBaseData<U extends BaseUserMeta = DU> = {
  id: string;
  threadId: string;
  roomId: string;
  author: U;
  createdAt: Date;
  url?: string;
};

export type CommentEmailRawData = Omit<CommentEmailBaseData, "author"> & {
  userId: string;
  rawBody: CommentBody;
};

export type ResolveRoomInfoArgs = {
  /**
   * The ID of the room to resolve
   */
  roomId: string;
};

type PrepareThreadNotificationEmailRawDataOptions = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (
    args: ResolveRoomInfoArgs
  ) => OptionalPromise<DRI | undefined>;
};

export type ThreadNotificationRawData = (
  | { type: "unreadMention"; comment: CommentEmailRawData }
  | { type: "unreadReplies"; comments: CommentEmailRawData[] }
) & { roomInfo: DRI };

/** @internal */
export const makeCommentEmailRawData = ({
  roomInfo,
  comment,
}: {
  roomInfo: BaseRoomInfo | undefined;
  comment: CommentDataWithBody;
}): CommentEmailRawData => {
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
export const prepareThreadNotificationEmailRawData = async ({
  client,
  event,
  options,
}: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
  options?: PrepareThreadNotificationEmailRawDataOptions;
}): Promise<ThreadNotificationRawData> => {
  const { roomId } = event.data;

  const roomInfo = options?.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId })
    : undefined;
  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? roomId,
  };

  const extracted = await extractThreadNotificationData({ client, event });
  if (extracted.type === "unreadMention") {
    return {
      type: "unreadMention",
      comment: makeCommentEmailRawData({
        roomInfo,
        comment: extracted.comment,
      }),
      roomInfo: resolvedRoomInfo,
    };
  }

  return {
    type: "unreadReplies",
    comments: extracted.comments.map((comment) =>
      makeCommentEmailRawData({ roomInfo, comment })
    ),
    roomInfo: resolvedRoomInfo,
  };
};

export type CommentEmailHTMLData<U extends BaseUserMeta> =
  CommentEmailBaseData<U> & {
    htmlBody: string;
  };

export type CommentEmailReactData<U extends BaseUserMeta> =
  CommentEmailBaseData<U> & {
    reactBody: JSX.Element;
  };

export type ThreadNotificationEmailUnreadRepliesData<
  U extends BaseUserMeta,
  C extends CommentEmailHTMLData<U> | CommentEmailReactData<U>,
> = {
  type: "unreadReplies";
  comments: C[];
};

export type ThreadNotificationEmailUnreadMentionsData<
  U extends BaseUserMeta,
  C extends CommentEmailHTMLData<U> | CommentEmailReactData<U>,
> = {
  type: "unreadMention";
  comment: C;
};

export type ThreadNotificationEmailData<
  U extends BaseUserMeta,
  C extends CommentEmailHTMLData<U> | CommentEmailReactData<U>,
> = (
  | ThreadNotificationEmailUnreadRepliesData<U, C>
  | ThreadNotificationEmailUnreadMentionsData<U, C>
) & { roomInfo: DRI };

export type PrepareThreadNotificationEmailHTMLDataOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailRawDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  // TEMP
  commentBodyStyles: Record<string, string>;
};

// export async function prepareThreadNotificationEmailHTMLData(params: {
//   client: Liveblocks;
//   event: ThreadNotificationEvent;
//   options?: PrepareThreadNotificationEmailHTMLDataOptions<BaseUserMeta>;
// }): Promise<
//   ThreadNotificationEmailData<BaseUserMeta, CommentEmailHTMLData<BaseUserMeta>>
// > {}
