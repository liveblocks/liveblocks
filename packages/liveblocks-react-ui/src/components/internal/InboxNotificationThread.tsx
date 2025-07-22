import type {
  BaseMetadata,
  CommentData,
  InboxNotificationThreadData,
  ThreadData,
} from "@liveblocks/core";
import { getMentionsFromCommentBody } from "@liveblocks/core";
import type { ComponentProps } from "react";

import {
  type CommentOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as CommentPrimitive from "../../primitives/Comment";
import { cn } from "../../utils/cn";
import {
  CommentMention,
  CommentNonInteractiveFileAttachment,
  CommentNonInteractiveLink,
  CommentNonInteractiveReaction,
} from "../Comment";
import { User } from "./User";

type InboxNotificationThreadCommentsContents = {
  type: "comments";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

type InboxNotificationThreadMentionContents = {
  type: "mention";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

export const INBOX_NOTIFICATION_THREAD_MAX_COMMENTS = 3;

type InboxNotificationThreadContents =
  | InboxNotificationThreadCommentsContents
  | InboxNotificationThreadMentionContents;

interface InboxNotificationCommentProps extends ComponentProps<"div"> {
  comment: CommentData;
  showHeader?: boolean;
  showAttachments?: boolean;
  showReactions?: boolean;
  overrides?: Partial<GlobalOverrides & CommentOverrides>;
}

export function InboxNotificationComment({
  comment,
  showHeader = true,
  showAttachments = true,
  showReactions = true,
  overrides,
  className,
  ...props
}: InboxNotificationCommentProps) {
  const $ = useOverrides(overrides);

  return (
    <div
      className={cn(
        "lb-root lb-inbox-notification-comment lb-comment",
        className
      )}
      {...props}
    >
      {showHeader && (
        <div className="lb-comment-header">
          <User className="lb-comment-author" userId={comment.userId} />
        </div>
      )}
      <div className="lb-comment-content">
        {comment.body ? (
          <>
            <CommentPrimitive.Body
              className="lb-comment-body"
              body={comment.body}
              components={{
                Mention: (props) => (
                  <CommentMention showGroupTooltip={false} {...props} />
                ),
                Link: CommentNonInteractiveLink,
              }}
            />
            {showReactions && comment.reactions.length > 0 && (
              <div className="lb-comment-reactions">
                {comment.reactions.map((reaction) => (
                  <CommentNonInteractiveReaction
                    key={reaction.emoji}
                    reaction={reaction}
                    overrides={overrides}
                    disabled
                  />
                ))}
              </div>
            )}
            {showAttachments && comment.attachments.length > 0 ? (
              <div className="lb-comment-attachments">
                <div className="lb-attachments">
                  {comment.attachments.map((attachment) => (
                    <CommentNonInteractiveFileAttachment
                      key={attachment.id}
                      attachment={attachment}
                      overrides={overrides}
                      roomId={comment.roomId}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="lb-comment-body">
            <p className="lb-comment-deleted">{$.COMMENT_DELETED}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Find the last comment with a mention for the given user ID,
 * unless the comment was created by the user themselves.
 */
function findLastCommentWithMentionedId(
  comments: CommentData[],
  mentionedId: string
) {
  if (!comments.length) {
    return;
  }

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]!;

    if (comment.userId === mentionedId) {
      continue;
    }

    if (comment.body) {
      const mentions = getMentionsFromCommentBody(
        comment.body,
        (mention) => mention.kind === "user" && mention.id === mentionedId
      );

      if (mentions.length > 0) {
        return comment;
      }
    }
  }

  return;
}

function getUserIdsFromComments(comments: CommentData[]) {
  return Array.from(new Set(comments.map((comment) => comment.userId)));
}

export function generateInboxNotificationThreadContents(
  inboxNotification: InboxNotificationThreadData,
  thread: ThreadData<BaseMetadata>,
  userId: string
): InboxNotificationThreadContents {
  const unreadComments = thread.comments.filter((comment) => {
    if (!comment.body) {
      return false;
    }

    return inboxNotification.readAt
      ? comment.createdAt > inboxNotification.readAt &&
          comment.createdAt <= inboxNotification.notifiedAt
      : comment.createdAt <= inboxNotification.notifiedAt;
  });

  // If the thread is read, show the last comments.
  if (unreadComments.length === 0) {
    const lastComments = thread.comments
      .filter((comment) => comment.body)
      .slice(-INBOX_NOTIFICATION_THREAD_MAX_COMMENTS);

    return {
      type: "comments",
      unread: false,
      comments: lastComments,
      userIds: getUserIdsFromComments(lastComments),
      date: inboxNotification.notifiedAt,
    };
  }

  const commentWithMention = findLastCommentWithMentionedId(
    unreadComments,
    userId
  );

  // If the thread contains one or more mentions for the current user, show the last comment with a mention.
  if (commentWithMention) {
    return {
      type: "mention",
      unread: true,
      comments: [commentWithMention],
      userIds: [commentWithMention.userId],
      date: commentWithMention.createdAt,
    };
  }

  const lastUnreadComments = unreadComments.slice(
    -INBOX_NOTIFICATION_THREAD_MAX_COMMENTS
  );

  // Otherwise, show the last unread comments.
  return {
    type: "comments",
    unread: true,
    comments: lastUnreadComments,
    userIds: getUserIdsFromComments(unreadComments),
    date: inboxNotification.notifiedAt,
  };
}
