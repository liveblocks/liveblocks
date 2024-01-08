"use client";

import {
  type CommentData,
  getMentionedIdsFromCommentBody,
  type InboxNotificationData,
} from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { List } from "./internal/List";
import { User } from "./internal/User";

const THREAD_INBOX_NOTIFICATION_MAX_COMMENTS = 3;

// TODO: showDeletedComments option?
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
}

const InboxNotificationLayout = forwardRef<
  HTMLDivElement,
  InboxNotificationLayoutProps
>(
  (
    { children, aside, title, date, unread, className, ...props },
    forwardedRef
  ) => {
    const $ = useOverrides();

    return (
      <div
        className={classNames("lb-root lb-inbox-notification", className)}
        dir={$.dir}
        data-unread={unread ? "" : undefined}
        {...props}
        ref={forwardedRef}
      >
        <div className="lb-inbox-notification-aside">{aside}</div>
        <div className="lb-inbox-notification-content">
          <div className="lb-inbox-notification-header">
            <span className="lb-inbox-notification-title">{title}</span>
            <div className="lb-inbox-notification-details">
              <span className="lb-inbox-notification-details-labels">
                <Timestamp date={date} className="lb-inbox-notification-date" />
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
    );
  }
);

function InboxNotificationAvatar({ className, ...props }: AvatarProps) {
  return (
    <Avatar
      className={classNames("lb-inbox-notification-avatar", className)}
      {...props}
    />
  );
}

function findLastCommentWithMentionedId(
  comments: CommentData[],
  mentionedId: string
) {
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];

    if (comment.body) {
      const mentionedIds = getMentionedIdsFromCommentBody(comment.body);

      if (mentionedIds.includes(mentionedId)) {
        return comment;
      }
    }
  }

  return;
}

function generateThreadInboxNotificationContent(
  inboxNotification: InboxNotificationData,
  userId: string
) {
  const unreadComments = inboxNotification.thread.comments.filter((comment) =>
    inboxNotification.readAt
      ? comment.createdAt > inboxNotification.readAt &&
        comment.createdAt <= inboxNotification.notifiedAt
      : comment.createdAt <= inboxNotification.notifiedAt
  );

  // If the thread is read, show the last comments.
  if (unreadComments.length === 0) {
    return {
      unread: false,
      comments: inboxNotification.thread.comments.slice(
        -THREAD_INBOX_NOTIFICATION_MAX_COMMENTS
      ),
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
      unread: true,
      comments: [commentWithMention],
      date: commentWithMention.createdAt,
      userId: commentWithMention.userId,
    };
  }

  // Otherwise, show the last comments.
  return {
    unread: true,
    comments: inboxNotification.thread.comments.slice(
      -THREAD_INBOX_NOTIFICATION_MAX_COMMENTS
    ),
    date: inboxNotification.notifiedAt,
  };
}

const ThreadInboxNotification = forwardRef<
  HTMLDivElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  // TODO: How do we get the current user ID?
  const { unread, comments, date } = useMemo(
    () => generateThreadInboxNotificationContent(inboxNotification, "TODO"),
    [inboxNotification]
  );
  const { avatarUserId, title } = useMemo(() => {
    const reversedComments = [...comments].reverse();

    const avatarUserId = comments[0]?.userId;
    // TODO: Support overrides via $ instead of hard-coding English (look at CommentReaction)
    // TODO: Don't show self in title?
    const title = (
      <>
        <List
          values={reversedComments.map((users, index) => (
            <User key={users.id} userId={users.id} capitalize={index === 0} />
          ))}
          // formatRemaining={$.COMMENT_REACTION_REMAINING}
          truncate={THREAD_INBOX_NOTIFICATION_MAX_COMMENTS}
        />{" "}
        commented on <span>Document</span>
      </>
    );

    return {
      avatarUserId,
      title,
    };
  }, [comments]);

  return (
    <InboxNotificationLayout
      aside={<InboxNotificationAvatar userId={avatarUserId} />}
      title={title}
      date={date}
      unread={unread}
      {...props}
      ref={forwardedRef}
    >
      {comments.map((comment) => (
        <p key={comment.id}>comment.id</p>
      ))}
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
