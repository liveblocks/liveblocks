import {
  type CommentBody,
  type CommentData,
  getMentionedIdsFromCommentBody,
} from "@liveblocks/core";

import type { Liveblocks } from "./client";
import type { ThreadNotificationEvent } from "./webhooks";

export type ThreadNotificationCommentData = Omit<
  CommentData,
  "body" | "deletedAt"
> & {
  body: CommentBody;
  deletedAt?: never;
};

export type ThreadNotificationUnreadReplies = {
  type: "unreadReplies";
  comments: ThreadNotificationCommentData[];
};

export type ThreadNotificationUnreadMention = {
  type: "unreadMention";
  comments: ThreadNotificationCommentData[];
};

export type ThreadNotificationData =
  | ThreadNotificationUnreadReplies
  | ThreadNotificationUnreadMention;

/** @internal */
export const getLastCommentWithMention = ({
  comments,
  mentionedUserId,
}: {
  comments: ThreadNotificationCommentData[];
  mentionedUserId: string;
}): ThreadNotificationCommentData | null => {
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

/**
 * Get thread notification data helper.
 *
 * It returns either an object containing a list of unread replies for a thread
 * or either an object containing a list of the last unread comment where the notification
 * receiver was mentioned in.
 *
 * @param params.event The thread notification event
 * @returns A thread notification data object
 * @example
 * {
 *  type: "unreadReplies",
 *  comments: [unread_comment_0, unread_comment_1, ...],
 * }
 *
 * @example
 * {
 *  type: "unreadMentions",
 *  comments: [unread_comment_with_mention]
 * }
 */
export async function getThreadNotificationData(params: {
  client: Liveblocks;
  event: ThreadNotificationEvent;
}): Promise<ThreadNotificationData> {
  const { client, event } = params;
  const { threadId, roomId, userId, inboxNotificationId } = event.data;

  const [thread, inboxNotification] = await Promise.all([
    client.getThread({ roomId, threadId }),
    client.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  const readAt = inboxNotification.readAt;
  const unreadComments = thread.comments
    .filter((c) => c.userId !== userId)
    .filter((c) => c.body !== undefined && c.deletedAt === undefined)
    .filter((c) =>
      readAt
        ? c.createdAt > readAt && c.createdAt <= inboxNotification.notifiedAt
        : c.createdAt <= inboxNotification.notifiedAt
    ) as ThreadNotificationCommentData[];

  const lastUnreadCommentWithMention = getLastCommentWithMention({
    comments: unreadComments,
    mentionedUserId: userId,
  });

  if (lastUnreadCommentWithMention !== null) {
    return {
      type: "unreadMention",
      comments: [lastUnreadCommentWithMention],
    };
  }

  return {
    type: "unreadReplies",
    comments: unreadComments,
  };
}
