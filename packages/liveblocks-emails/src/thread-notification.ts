import type {
  BaseUserMeta,
  CommentData,
  DRI,
  // DU,
  InboxNotificationData,
} from "@liveblocks/core";
import { getMentionedIdsFromCommentBody } from "@liveblocks/core";
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

export type CommentEmailData<U extends BaseUserMeta> = {
  id: string;
  threadId: string;
  roomId: string;
  author: U;
  url?: string;
};

export type CommentEmailHTMLData<U extends BaseUserMeta> =
  CommentEmailData<U> & {
    htmlBody: string;
  };

export type CommentEmailReactData<U extends BaseUserMeta> =
  CommentEmailData<U> & {
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

/** @internal */
export const extractThreadNotificationData = async ({
  client,
  event,
}: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
}): Promise<
  | { type: "unreadMention"; comment: CommentDataWithBody }
  | { type: "unreadReplies"; comments: CommentDataWithBody[] }
> => {
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

// export async function prepareThreadNotificationEmailHTMLData<
//   U extends BaseUserMeta = DU,
// >(): Promise<ThreadNotificationEmailData<U, CommentEmailHTMLData<U>>> {}

// export async function prepareThreadNotificationEmailReactData<
//   U extends BaseUserMeta = DU,
// >(): Promise<ThreadNotificationEmailData<U, CommentEmailReactData<U>>> {}
