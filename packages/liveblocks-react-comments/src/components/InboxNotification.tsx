"use client";

import type {
  BaseMetadata,
  CommentData,
  InboxNotificationData,
  InboxNotificationThreadData,
  ResolveUrlsResource,
  ThreadData,
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

import type { GlobalComponents } from "../components";
import { useComponents } from "../components";
import type {
  CommentOverrides,
  GlobalOverrides,
  InboxNotificationOverrides,
} from "../overrides";
import { useOverrides } from "../overrides";
import * as CommentPrimitive from "../primitives/Comment";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { CommentLink, CommentMention, CommentReactionShared } from "./Comment";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { List } from "./internal/List";
import { Room } from "./internal/Room";
import { User } from "./internal/User";

const THREAD_INBOX_NOTIFICATION_MAX_COMMENTS = 3;

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

type InboxNotificationThreadContents =
  | InboxNotificationThreadCommentsContents
  | InboxNotificationThreadMentionContents;

export interface InboxNotificationProps extends ComponentPropsWithoutRef<"a"> {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationData;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides & InboxNotificationOverrides & CommentOverrides
  >;

  /**
   * Override the component's components.
   */
  components?: Partial<GlobalComponents>;
}

interface InboxNotificationThreadProps extends InboxNotificationProps {
  /**
   * Whether to show the room name in the title.
   */
  showRoomName?: boolean;
}

interface InboxNotificationLayoutProps
  extends Omit<ComponentPropsWithoutRef<"a">, "title"> {
  aside: ReactNode;
  title: ReactNode;
  date: Date | string | number;
  unread?: boolean;
  overrides?: Partial<GlobalOverrides & InboxNotificationOverrides>;
  components?: Partial<GlobalComponents>;
}

type InboxNotificationAvatarProps = AvatarProps;

interface InboxNotificationCommentProps extends ComponentProps<"div"> {
  comment: CommentData;
  showHeader?: boolean;
  overrides?: Partial<GlobalOverrides & CommentOverrides>;
}

const InboxNotificationLayout = forwardRef<
  HTMLAnchorElement,
  InboxNotificationLayoutProps
>(
  (
    {
      children,
      aside,
      title,
      date,
      unread,
      overrides,
      components,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const { Anchor } = useComponents(components);

    return (
      <TooltipProvider>
        <Anchor
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
        </Anchor>
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
  overrides,
  className,
  ...props
}: InboxNotificationCommentProps) {
  const $ = useOverrides(overrides);

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
            {comment.reactions.length > 0 && (
              <div className="lb-comment-reactions">
                {comment.reactions.map((reaction) => (
                  <CommentReactionShared
                    key={reaction.emoji}
                    reaction={reaction}
                    overrides={overrides}
                    disabled
                  />
                ))}
              </div>
            )}
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

function generateInboxNotificationThreadContents(
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

const InboxNotificationThread = forwardRef<
  HTMLAnchorElement,
  InboxNotificationThreadProps
>(
  (
    { inboxNotification, showRoomName = true, overrides, ...props },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const {
      [kInternal]: { useThreadFromCache, useCurrentUserId, useUrl },
    } = useLiveblocksContextBundle();
    const thread = useThreadFromCache(inboxNotification.threadId);
    const currentUserId = useCurrentUserId();
    const { unread, date, aside, title, content, resource } = useMemo(() => {
      const contents = generateInboxNotificationThreadContents(
        inboxNotification,
        thread,
        currentUserId ?? ""
      );

      switch (contents.type) {
        case "comments": {
          const reversedUserIds = [...contents.userIds].reverse();
          const firstUserId = reversedUserIds[0];

          const aside = <InboxNotificationAvatar userId={firstUserId} />;
          const title = $.INBOX_NOTIFICATION_THREAD_COMMENTS_LIST(
            <List
              values={reversedUserIds.map((userId, index) => (
                <User
                  key={userId}
                  userId={userId}
                  capitalize={index === 0}
                  replaceSelf
                />
              ))}
              formatRemaining={$.LIST_REMAINING_USERS}
              truncate={THREAD_INBOX_NOTIFICATION_MAX_COMMENTS - 1}
            />,
            showRoomName ? <Room roomId={thread.roomId} /> : undefined,
            reversedUserIds.length
          );
          const content = (
            <div className="lb-inbox-notification-comments">
              {contents.comments.map((comment) => (
                <InboxNotificationComment
                  key={comment.id}
                  comment={comment}
                  showHeader={contents.comments.length > 1}
                  overrides={overrides}
                />
              ))}
            </div>
          );
          const resource: ResolveUrlsResource = {
            type: "thread",
            roomId: thread.roomId,
            threadId: thread.id,
            commentId: contents.comments[contents.comments.length - 1]?.id,
          };

          return {
            unread: contents.unread,
            date: contents.date,
            aside,
            title,
            content,
            resource,
          };
        }

        case "mention": {
          const mentionUserId = contents.userIds[0];
          const mentionComment = contents.comments[0];

          const aside = <InboxNotificationAvatar userId={mentionUserId} />;
          const title = $.INBOX_NOTIFICATION_THREAD_MENTION(
            <User key={mentionUserId} userId={mentionUserId} capitalize />,
            <Room roomId={thread.roomId} />
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
          const resource: ResolveUrlsResource = {
            type: "thread",
            roomId: thread.roomId,
            threadId: thread.id,
            commentId: mentionComment.id,
          };

          return {
            unread: contents.unread,
            date: contents.date,
            aside,
            title,
            content,
            resource,
          };
        }

        default:
          return assertNever(
            contents,
            "Unexpected thread inbox notification type"
          );
      }
    }, [$, currentUserId, inboxNotification, overrides, showRoomName, thread]);
    const { url } = useUrl(resource);

    return (
      <InboxNotificationLayout
        aside={aside}
        title={title}
        date={date}
        unread={unread}
        overrides={overrides}
        href={url}
        {...props}
        ref={forwardedRef}
      >
        {content}
      </InboxNotificationLayout>
    );
  }
);

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
  HTMLAnchorElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  switch (inboxNotification.kind) {
    case "thread":
      return (
        <InboxNotificationThread
          inboxNotification={inboxNotification}
          {...props}
          ref={forwardedRef}
        />
      );
  }
});
