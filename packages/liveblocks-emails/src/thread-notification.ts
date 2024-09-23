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

import type { CommentDataWithBody } from "./lib/comment-with-body";
import { filterCommentsWithBody } from "./lib/comment-with-body";

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

type PrepareThreadNotificationEmailRawDataOptions = {
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
  options?: PrepareThreadNotificationEmailRawDataOptions;
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
  if (data.type === "unreadMention") {
    return {
      type: "unreadMention",
      comment: makeCommentEmailBaseData({
        roomInfo,
        comment: data.comment,
      }),
      roomInfo: resolvedRoomInfo,
    };
  }

  return {
    type: "unreadReplies",
    comments: data.comments.map((comment) =>
      makeCommentEmailBaseData({ roomInfo, comment })
    ),
    roomInfo: resolvedRoomInfo,
  };
};

export type CommentEmailAsHTMLData<U extends BaseUserMeta> = Omit<
  CommentEmailBaseData,
  "userId"
> & {
  author: U;
  htmlBody: string;
};

export type CommentEmailAsReactData<U extends BaseUserMeta> = Omit<
  CommentEmailBaseData,
  "userId"
> & {
  author: U;
  reactBody: JSX.Element;
};

export type ThreadNotificationEmailUnreadRepliesData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadReplies";
  comments: C[];
};

export type ThreadNotificationEmailUnreadMentionsData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = {
  type: "unreadMention";
  comment: C;
};

export type ThreadNotificationEmailData<
  U extends BaseUserMeta,
  C extends CommentEmailAsHTMLData<U> | CommentEmailAsReactData<U>,
> = (
  | ThreadNotificationEmailUnreadRepliesData<U, C>
  | ThreadNotificationEmailUnreadMentionsData<U, C>
) & { roomInfo: DRI };

export type PrepareThreadNotificationEmailAsHTMLDataOptions<
  U extends BaseUserMeta = DU,
> = PrepareThreadNotificationEmailRawDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  // TEMP
  commentBodyStyles?: Record<string, string>;
};

// export async function prepareThreadNotificationEmailAsHTML(params: {
//   client: Liveblocks;
//   event: ThreadNotificationEvent;
//   options?: PrepareThreadNotificationEmailAsHTMLDataOptions<BaseUserMeta>;
// }): Promise<
//   ThreadNotificationEmailData<
//     BaseUserMeta,
//     CommentEmailAsHTMLData<BaseUserMeta>
//   >
// > {
//   const { client, event, options } = params;
//   const data = await prepareThreadNotificationEmailBaseData({
//     client,
//     event,
//     options: { resolveRoomInfo: options?.resolveRoomInfo },
//   });

//   if (data.type === "unreadMention") {
//     return {
//       type: "unreadMention",
//       roomInfo: data.roomInfo,
//     };
//   }

//   return {
//     type: "unreadReplies",
//     roomInfo: data.roomInfo,
//   };
// }
