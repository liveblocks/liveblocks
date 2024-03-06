"use client";

import type {
  BaseMetadata,
  CommentData,
  InboxNotificationData,
  InboxNotificationThreadData,
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
  ComponentType,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import type { GlobalComponents } from "../components";
import { useComponents } from "../components";
import { CheckIcon } from "../icons/Check";
import { EllipsisIcon } from "../icons/Ellipsis";
import type {
  CommentOverrides,
  GlobalOverrides,
  InboxNotificationOverrides,
} from "../overrides";
import { useOverrides } from "../overrides";
import * as CommentPrimitive from "../primitives/Comment";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { setQueryParams } from "../utils/query-params";
import {
  CommentMention,
  CommentNonInteractiveLink,
  CommentNonInteractiveReaction,
} from "./Comment";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Dropdown, DropdownItem, DropdownTrigger } from "./internal/Dropdown";
import { List } from "./internal/List";
import { Room } from "./internal/Room";
import { Tooltip } from "./internal/Tooltip";
import { User } from "./internal/User";

const INBOX_NOTIFICATION_THREAD_MAX_COMMENTS = 3;
const THREAD_ID_QUERY_PARAM = "thread";
const COMMENT_ID_QUERY_PARAM = "comment";

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

export type InboxNotificationKinds = {
  thread: ComponentType<InboxNotificationThreadProps>;
};

export type AddRefToComponents<T, R> = {
  [K in keyof T]: T[K] extends ComponentType<infer P>
    ? ComponentType<P & { ref: R }>
    : T[K];
};

type InboxNotificationKindsWithRef = AddRefToComponents<
  InboxNotificationKinds,
  ComponentProps<"a">["ref"]
>;

interface InboxNotificationSharedProps {
  /**
   * How to show or hide the actions.
   */
  showActions?: boolean | "hover";
}

export interface InboxNotificationProps
  extends ComponentPropsWithoutRef<"a">,
    InboxNotificationSharedProps {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationData;

  /**
   * Override specific kinds of inbox notifications.
   */
  kinds?: Partial<InboxNotificationKinds>;

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

export interface InboxNotificationThreadProps
  extends Omit<InboxNotificationProps, "kinds">,
    InboxNotificationSharedProps {
  /**
   * Whether to show the room name in the title.
   */
  showRoomName?: boolean;
}

interface InboxNotificationLayoutProps
  extends Omit<ComponentPropsWithoutRef<"a">, "title">,
    InboxNotificationSharedProps {
  inboxNotificationId: string;
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
      inboxNotificationId,
      children,
      aside,
      title,
      date,
      unread,
      showActions,
      overrides,
      components,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const { Anchor } = useComponents(components);
    const [isMoreActionOpen, setMoreActionOpen] = useState(false);
    const { useMarkInboxNotificationAsRead } = useLiveblocksContextBundle();
    const markInboxNotificationAsRead = useMarkInboxNotificationAsRead();

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const preventDefaultAndStopPropagation = useCallback(
      (event: SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
      },
      []
    );

    const handleMoreClick = useCallback((event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setMoreActionOpen((open) => !open);
    }, []);

    const handleMarkAsRead = useCallback(() => {
      markInboxNotificationAsRead(inboxNotificationId);
    }, [inboxNotificationId, markInboxNotificationAsRead]);

    return (
      <TooltipProvider>
        <Anchor
          className={classNames(
            "lb-root lb-inbox-notification",
            showActions === "hover" &&
              "lb-inbox-notification:show-actions-hover",
            isMoreActionOpen && "lb-inbox-notification:action-open",
            className
          )}
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
                    locale={$.locale}
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
              {showActions && (
                <div className="lb-inbox-notification-actions">
                  <Dropdown
                    open={isMoreActionOpen}
                    onOpenChange={setMoreActionOpen}
                    align="end"
                    content={
                      <>
                        <DropdownItem
                          onSelect={handleMarkAsRead}
                          onClick={stopPropagation}
                          disabled={!unread}
                        >
                          <CheckIcon className="lb-dropdown-item-icon" />
                          {$.INBOX_NOTIFICATION_MARK_AS_READ}
                        </DropdownItem>
                      </>
                    }
                  >
                    <Tooltip content={$.INBOX_NOTIFICATION_MORE}>
                      <DropdownTrigger asChild>
                        <Button
                          className="lb-inbox-notification-action"
                          onClick={handleMoreClick}
                          onPointerDown={preventDefaultAndStopPropagation}
                          onPointerUp={preventDefaultAndStopPropagation}
                          aria-label={$.INBOX_NOTIFICATION_MORE}
                        >
                          <EllipsisIcon className="lb-button-icon" />
                        </Button>
                      </DropdownTrigger>
                    </Tooltip>
                  </Dropdown>
                </div>
              )}
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
                Link: CommentNonInteractiveLink,
              }}
            />
            {comment.reactions.length > 0 && (
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

/**
 * Displays a thread inbox notification.
 */
const InboxNotificationThread = forwardRef<
  HTMLAnchorElement,
  InboxNotificationThreadProps
>(
  (
    {
      inboxNotification,
      href,
      showRoomName = true,
      showActions = "hover",
      overrides,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const {
      useRoomInfo,
      [kInternal]: { useThreadFromCache, useCurrentUserId },
    } = useLiveblocksContextBundle();
    const thread = useThreadFromCache(inboxNotification.threadId);
    const currentUserId = useCurrentUserId();
    // TODO: If you provide `href` (or plan to), we shouldn't run this hook. We should find a way to conditionally run it.
    //       Because of batching and the fact that the same hook will be called within <Room /> in the notification's title,
    //       it's not a big deal, the only scenario where it would be superfluous would be if the user provides their own
    //       `href` AND disables room names in the title via `showRoomName={false}`.
    const { info } = useRoomInfo(inboxNotification.roomId);
    const { unread, date, aside, title, content, threadId, commentId } =
      useMemo(() => {
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
                truncate={INBOX_NOTIFICATION_THREAD_MAX_COMMENTS - 1}
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

            return {
              unread: contents.unread,
              date: contents.date,
              aside,
              title,
              content,
              threadId: thread.id,
              commentId: contents.comments[contents.comments.length - 1].id,
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

            return {
              unread: contents.unread,
              date: contents.date,
              aside,
              title,
              content,
              threadId: thread.id,
              commentId: mentionComment.id,
            };
          }

          default:
            return assertNever(
              contents,
              "Unexpected thread inbox notification type"
            );
        }
      }, [
        $,
        currentUserId,
        inboxNotification,
        overrides,
        showRoomName,
        thread,
      ]);
    // Add the thread ID and comment ID to the `href`.
    // And use URL from `resolveRoomsInfo` if `href` isn't set.
    const resolvedHref = useMemo(() => {
      const resolvedHref = href ?? info?.url;

      return resolvedHref
        ? setQueryParams(resolvedHref, {
            [THREAD_ID_QUERY_PARAM]: threadId,
            [COMMENT_ID_QUERY_PARAM]: commentId,
          })
        : undefined;
    }, [commentId, href, threadId, info?.url]);

    return (
      <InboxNotificationLayout
        inboxNotificationId={inboxNotification.id}
        aside={aside}
        title={title}
        date={date}
        unread={unread}
        overrides={overrides}
        href={resolvedHref}
        showActions={showActions}
        {...props}
        ref={forwardedRef}
      >
        {content}
      </InboxNotificationLayout>
    );
  }
);

const defaultInboxNotificationKinds: InboxNotificationKinds = {
  thread: InboxNotificationThread,
};

/**
 * Displays a single inbox notification.
 *
 * @example
 * <>
 *   {inboxNotifications.map((inboxNotification) => (
 *     <InboxNotification
 *       key={inboxNotification.id}
 *       inboxNotification={inboxNotification}
 *       href={`/rooms/${inboxNotification.roomId}`
 *     />
 *   ))}
 * </>
 */
export const InboxNotification = Object.assign(
  forwardRef<HTMLAnchorElement, InboxNotificationProps>(
    ({ inboxNotification, kinds, ...props }, forwardedRef) => {
      const { thread: InboxNotificationThread } = useMemo(
        () =>
          ({
            ...defaultInboxNotificationKinds,
            ...kinds,
          }) as InboxNotificationKindsWithRef,
        [kinds]
      );

      switch (inboxNotification.kind) {
        case "thread":
          return (
            <InboxNotificationThread
              inboxNotification={inboxNotification}
              {...props}
              ref={forwardedRef}
            />
          );

        default:
          return assertNever(
            inboxNotification.kind,
            "Unexpected inbox notification kind"
          );
      }
    }
  ),
  {
    Thread: InboxNotificationThread,
  }
);
