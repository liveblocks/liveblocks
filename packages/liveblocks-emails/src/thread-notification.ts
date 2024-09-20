import type {
  BaseUserMeta,
  CommentData,
  InboxNotificationData,
} from "@liveblocks/core";
import { getMentionedIdsFromCommentBody } from "@liveblocks/core";

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
export const getLastCommentWithMention = ({
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
};

export type CommentEmailHTMLData<U extends BaseUserMeta> =
  CommentEmailData<U> & {
    htmlBody: string;
  };

export type CommentEmailReactData<U extends BaseUserMeta> =
  CommentEmailData<U> & {
    reactBody: JSX.Element;
  };
