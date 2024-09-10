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
export const getLastUnreadCommentWithMention = ({
  unreadComments,
  mentionUserId,
}: {
  unreadComments: ThreadNotificationCommentData[];
  mentionUserId: string;
}): ThreadNotificationCommentData | null => {
  const startIndex = unreadComments.length - 1;
  for (let i = startIndex; i >= 0; i--) {
    const comment = unreadComments[i];
    if (comment) {
      const { userId, body } = comment;

      if (userId !== mentionUserId) {
        const mentionedIds = getMentionedIdsFromCommentBody(body);

        if (mentionedIds.includes(mentionUserId)) {
          return comment;
        }
      }
    }
  }

  return null;
};

/**
 * Get thread notification data helper.
 *
 * It returns either an object containing a list of unread replies for a thread
 * or either an object containing a list of one unread comment containing a mentioned user.
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

  const lastUnreadCommentWithMention = getLastUnreadCommentWithMention({
    unreadComments,
    mentionUserId: userId,
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
