import {
  type CommentBody,
  type CommentData,
  getMentionedIdsFromCommentBody,
} from "@liveblocks/core";

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

/**
 * Get the last unread comment containing a mention
 * from a list of thread notification comments
 *
 * @internal
 */
export function getLastUnreadCommentWithMention({
  unreadComments,
  mentionUserId,
}: {
  unreadComments: ThreadNotificationCommentData[];
  mentionUserId: string;
}): ThreadNotificationCommentData | null {
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
}
