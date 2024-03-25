"use client";

import type {
  InboxNotificationCustomData,
  InboxNotificationData,
  InboxNotificationThreadData,
} from "@liveblocks/core";
import { assertNever, kInternal } from "@liveblocks/core";
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
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { generateURL } from "../utils/url";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Dropdown, DropdownItem, DropdownTrigger } from "./internal/Dropdown";
import {
  generateInboxNotificationThreadContents,
  INBOX_NOTIFICATION_THREAD_MAX_COMMENTS,
  InboxNotificationComment,
} from "./internal/InboxNotificationThread";
import { List } from "./internal/List";
import { Room } from "./internal/Room";
import { Tooltip } from "./internal/Tooltip";
import { User } from "./internal/User";

export type InboxNotificationKinds = Record<
  string,
  ComponentType<InboxNotificationCustomProps>
> & {
  thread: ComponentType<InboxNotificationThreadProps>;
};

type AddRefToComponents<T, R> = {
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
  extends Omit<ComponentPropsWithoutRef<"a">, "title">,
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
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationThreadData;

  /**
   * Whether to show the room name in the title.
   */
  showRoomName?: boolean;
}

export interface InboxNotificationCustomProps
  extends Omit<InboxNotificationProps, "kinds">,
    InboxNotificationSharedProps {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationCustomData;

  /**
   * TODO: JSDoc
   */
  title?: ReactNode;

  /**
   * TODO: JSDoc
   */
  body?: ReactNode;

  /**
   * TODO: JSDoc
   */
  aside?: ReactNode;
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
    const { unread, date, aside, title, content, commentId } = useMemo(() => {
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
            showRoomName ? <Room roomId={thread.roomId} /> : undefined
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
    }, [$, currentUserId, inboxNotification, overrides, showRoomName, thread]);
    // Add the thread ID and comment ID to the `href`.
    // And use URL from `resolveRoomsInfo` if `href` isn't set.
    const resolvedHref = useMemo(() => {
      const resolvedHref = href ?? info?.url;

      return resolvedHref
        ? generateURL(resolvedHref, undefined, commentId)
        : undefined;
    }, [commentId, href, info?.url]);

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

// TODO: Remove `as any`
const defaultInboxNotificationKinds: InboxNotificationKinds = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  thread: InboxNotificationThread as any,
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
      const { thread: InboxNotificationThread, ...resolvedKinds } = useMemo(
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
              inboxNotification={
                inboxNotification as InboxNotificationThreadData
              }
              {...props}
              ref={forwardedRef}
            />
          );

        default: {
          const InboxNotificationCustom = resolvedKinds[inboxNotification.kind];

          if (!InboxNotificationCustom) {
            // TODO: Don't render null, render an empty notification instead with just the time and dropdown.
            // TODO: Warn in the console that this kind wasn't handled.

            return null;
          }

          return (
            <InboxNotificationCustom
              inboxNotification={
                inboxNotification as InboxNotificationCustomData
              }
              {...props}
              ref={forwardedRef}
            />
          );
        }
      }
    }
  ),
  {
    Thread: InboxNotificationThread,
  }
);
