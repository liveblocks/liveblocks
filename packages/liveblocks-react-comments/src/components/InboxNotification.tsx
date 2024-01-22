"use client";

import type {
  BaseMetadata,
  CommentData,
  InboxNotificationData,
  ThreadData,
  ThreadInboxNotificationData,
} from "@liveblocks/core";
import {
  assertNever,
  getMentionedIdsFromCommentBody,
  kInternal,
} from "@liveblocks/core";
import { useLiveblocksContextBundle } from "@liveblocks/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import React, { forwardRef, useMemo } from "react";

import { useOverrides } from "../overrides";
import * as CommentPrimitive from "../primitives/Comment";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { CommentLink, CommentMention } from "./Comment";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { List } from "./internal/List";
import { Room } from "./internal/Room";
import { User } from "./internal/User";

const THREAD_INBOX_NOTIFICATION_MAX_COMMENTS = 3;

type ThreadInboxNotificationCommentsContents = {
  type: "comments";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

type ThreadInboxNotificationMentionContents = {
  type: "mention";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

type ThreadInboxNotificationContents =
  | ThreadInboxNotificationCommentsContents
  | ThreadInboxNotificationMentionContents;

export interface InboxNotificationProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationData;
}

interface InboxNotificationLayoutProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  aside: ReactNode;
  title: ReactNode;
  date: Date | string | number;
  unread?: boolean;
  interactive?: boolean;
}

type InboxNotificationAvatarProps = AvatarProps;

interface InboxNotificationCommentProps extends ComponentProps<"div"> {
  comment: CommentData;
  showHeader?: boolean;
}

const InboxNotificationLayout = forwardRef<
  HTMLDivElement,
  InboxNotificationLayoutProps
>(
  (
    {
      children,
      aside,
      title,
      date,
      unread,
      interactive = true,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides();

    return (
      <TooltipProvider>
        <div
          className={classNames("lb-root lb-inbox-notification", className)}
          dir={$.dir}
          data-unread={unread ? "" : undefined}
          data-interactive={interactive ? "" : undefined}
          {...props}
          ref={forwardedRef}
        >
          <div className="lb-inbox-notification-aside">{aside}</div>
          <div className="lb-inbox-notification-content">
            <div className="lb-inbox-notification-header">
              <span className="lb-inbox-notification-title">{title}</span>
              <div className="lb-inbox-notification-details">
                <span className="lb-inbox-notification-details-labels">
                  <Timestamp
                    date={date}
                    className="lb-inbox-notification-date"
                  />
                  {unread && (
                    <span
                      className="lb-inbox-notification-unread-indicator"
                      role="presentation"
                    />
                  )}
                </span>
              </div>
            </div>
            <div className="lb-inbox-notification-body">{children}</div>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);

function InboxNotificationAvatar({
  className,
  ...props
}: InboxNotificationAvatarProps) {
  return (
    <Avatar
      className={classNames("lb-inbox-notification-avatar", className)}
      {...props}
    />
  );
}

function InboxNotificationComment({
  comment,
  showHeader = true,
  className,
  ...props
}: InboxNotificationCommentProps) {
  const $ = useOverrides();

  return (
    <div
      className={classNames(
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
                Mention: CommentMention,
                Link: CommentLink,
              }}
            />
            {/* [comments-unread] TODO: Add reactions */}
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
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];

    if (comment.userId === mentionedId) {
      continue;
    }

    if (comment.body) {
      const mentionedIds = getMentionedIdsFromCommentBody(comment.body);

      if (mentionedIds.includes(mentionedId)) {
        return comment;
      }
    }
  }

  return;
}

function getUserIdsFromComments(comments: CommentData[]) {
  return Array.from(new Set(comments.map((comment) => comment.userId)));
}

function generateThreadInboxNotificationContents(
  inboxNotification: ThreadInboxNotificationData,
  thread: ThreadData<BaseMetadata>,
  userId: string
): ThreadInboxNotificationContents {
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
      .slice(-THREAD_INBOX_NOTIFICATION_MAX_COMMENTS);

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
    -THREAD_INBOX_NOTIFICATION_MAX_COMMENTS
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

const ThreadInboxNotification = forwardRef<
  HTMLDivElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  const {
    [kInternal]: { useThreadFromCache },
  } = useLiveblocksContextBundle();
  const thread = useThreadFromCache(inboxNotification.threadId);

  // [comments-unread] TODO: How do we get the current user ID?
  const { unread, date, aside, title, content } = useMemo(() => {
    const contents = generateThreadInboxNotificationContents(
      inboxNotification,
      thread,
      "[comments-unread] TODO: get current user's ID"
    );

    switch (contents.type) {
      case "comments": {
        const reversedUserIds = [...contents.userIds].reverse();
        const firstUserId = reversedUserIds[0];

        const aside = <InboxNotificationAvatar userId={firstUserId} />;
        // [comments-unread] TODO: Support overrides via $ instead of hard-coding English (look at CommentReaction)
        const title = (
          <>
            <List
              values={reversedUserIds.map((userId, index) => (
                <User key={userId} userId={userId} capitalize={index === 0} />
              ))}
              // formatRemaining={$.COMMENT_REACTION_REMAINING}
              truncate={THREAD_INBOX_NOTIFICATION_MAX_COMMENTS - 1}
            />{" "}
            commented on <Room roomId={thread.roomId} />
          </>
        );
        const content = (
          <div className="lb-inbox-notification-comments">
            {contents.comments.map((comment) => (
              <InboxNotificationComment
                key={comment.id}
                comment={comment}
                showHeader={contents.comments.length > 1}
              />
            ))}
          </div>
        );

        return {
          unread: contents.unread,
          date: contents.date,
          aside,
          title,
          content,
        };
      }

      case "mention": {
        const mentionUserId = contents.userIds[0];
        const mentionComment = contents.comments[0];

        const aside = <InboxNotificationAvatar userId={mentionUserId} />;
        // [comments-unread] TODO: Support overrides via $ instead of hard-coding English (look at CommentReaction)
        const title = (
          <>
            <User key={mentionUserId} userId={mentionUserId} capitalize />{" "}
            mentioned you on <Room roomId={thread.roomId} />
          </>
        );
        const content = (
          <div className="lb-inbox-notification-comments">
            <InboxNotificationComment
              key={mentionComment.id}
              comment={mentionComment}
              showHeader={false}
            />
          </div>
        );

        return {
          unread: contents.unread,
          date: contents.date,
          aside,
          title,
          content,
        };
      }

      default:
        return assertNever(
          contents,
          "Unexpected thread inbox notification type"
        );
    }
  }, [inboxNotification]);

  return (
    <InboxNotificationLayout
      aside={aside}
      title={title}
      date={date}
      unread={unread}
      {...props}
      ref={forwardedRef}
    >
      {content}
    </InboxNotificationLayout>
  );
});

/**
 * Displays a single inbox notification.
 *
 * @example
 * <>
 *   {inboxNotifications.map((inboxNotification) => (
 *     <InboxNotification key={inboxNotification.id} inboxNotification={inboxNotification} />
 *   ))}
 * </>
 */
export const InboxNotification = forwardRef<
  HTMLDivElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  switch (inboxNotification.kind) {
    case "thread":
      return (
        <ThreadInboxNotification
          inboxNotification={inboxNotification}
          {...props}
          ref={forwardedRef}
        />
      );
  }
});
