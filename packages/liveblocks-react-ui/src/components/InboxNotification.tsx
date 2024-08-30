"use client";

import type {
  InboxNotificationCustomData,
  InboxNotificationData,
  InboxNotificationTextMentionData,
  InboxNotificationThreadData,
  KDAD,
} from "@liveblocks/core";
import { assertNever, console } from "@liveblocks/core";
import {
  useDeleteInboxNotification,
  useInboxNotificationThread,
  useMarkInboxNotificationAsRead,
  useRoomInfo,
} from "@liveblocks/react";
import { Slot } from "@radix-ui/react-slot";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentType,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import type { GlobalComponents } from "../components";
import { useComponents } from "../components";
import { CheckIcon } from "../icons/Check";
import { DeleteIcon } from "../icons/Delete";
import { EllipsisIcon } from "../icons/Ellipsis";
import { MissingIcon } from "../icons/Missing";
import type {
  CommentOverrides,
  GlobalOverrides,
  InboxNotificationOverrides,
} from "../overrides";
import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives/Timestamp";
import { useCurrentUserId } from "../shared";
import type { SlotProp } from "../types";
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

type ComponentTypeWithRef<
  T extends keyof JSX.IntrinsicElements,
  P,
> = ComponentType<P & Pick<ComponentProps<T>, "ref">>;

type InboxNotificationKinds<KS extends KDAD = KDAD> = {
  // For some reason, we cannot directly use KDAD in the mapped type line
  // below, because it will result in '{}' rather than picking up the
  // definition from the user-provided 'ActivitiesData'. Might be an internal
  // TS optimization, so we're making it a param to defer the resolution.
  [K in KS]: ComponentTypeWithRef<"a", InboxNotificationCustomKindProps<K>>;
} & {
  thread: ComponentTypeWithRef<"a", InboxNotificationThreadKindProps>;
  textMention: ComponentTypeWithRef<"a", InboxNotificationTextMentionKindProps>;
};

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
  extends Omit<InboxNotificationProps, "kinds" | "children">,
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

export interface InboxNotificationTextMentionProps
  extends Omit<InboxNotificationProps, "kinds">,
    InboxNotificationSharedProps {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationTextMentionData;

  /**
   * Whether to show the room name in the title.
   */
  showRoomName?: boolean;
}

export interface InboxNotificationCustomProps
  extends Omit<InboxNotificationProps, "kinds">,
    InboxNotificationSharedProps,
    SlotProp {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationCustomData;

  /**
   * The inbox notification's content.
   */
  children: ReactNode;

  /**
   * The inbox notification's title.
   */
  title: ReactNode;

  /**
   * The inbox notification's aside content.
   * Can be combined with `InboxNotification.Icon` or `InboxNotification.Avatar` to easily follow default styles.
   */
  aside?: ReactNode;

  /**
   * Whether to mark the inbox notification as read when clicked.
   */
  markAsReadOnClick?: boolean;
}

export type InboxNotificationThreadKindProps = Omit<
  InboxNotificationProps,
  "kinds"
> & {
  inboxNotification: InboxNotificationThreadData;
};

export type InboxNotificationTextMentionKindProps = Omit<
  InboxNotificationProps,
  "kinds"
> & {
  inboxNotification: InboxNotificationTextMentionData;
};

export type InboxNotificationCustomKindProps<K extends KDAD = KDAD> = Omit<
  InboxNotificationProps,
  "kinds"
> & {
  inboxNotification: InboxNotificationCustomData<K>;
};

interface InboxNotificationLayoutProps
  extends Omit<ComponentPropsWithoutRef<"a">, "title">,
    InboxNotificationSharedProps,
    SlotProp {
  inboxNotification: InboxNotificationData;
  aside: ReactNode;
  title: ReactNode;
  date: Date | string | number;
  unread?: boolean;
  overrides?: Partial<GlobalOverrides & InboxNotificationOverrides>;
  components?: Partial<GlobalComponents>;
  markAsReadOnClick?: boolean;
}

export type InboxNotificationIconProps = ComponentProps<"div">;

export type InboxNotificationAvatarProps = AvatarProps;

const InboxNotificationLayout = forwardRef<
  HTMLAnchorElement,
  InboxNotificationLayoutProps
>(
  (
    {
      inboxNotification,
      children,
      aside,
      title,
      date,
      unread,
      markAsReadOnClick,
      onClick,
      href,
      showActions,
      overrides,
      components,
      className,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const { Anchor } = useComponents(components);
    const Component = asChild ? Slot : Anchor;
    const [isMoreActionOpen, setMoreActionOpen] = useState(false);
    const markInboxNotificationAsRead = useMarkInboxNotificationAsRead();
    const deleteInboxNotification = useDeleteInboxNotification();

    const handleClick = useCallback(
      (event: ReactMouseEvent<HTMLAnchorElement, MouseEvent>) => {
        onClick?.(event);

        const shouldMarkAsReadOnClick = markAsReadOnClick ?? Boolean(href);

        if (unread && shouldMarkAsReadOnClick) {
          markInboxNotificationAsRead(inboxNotification.id);
        }
      },
      [
        href,
        inboxNotification.id,
        markAsReadOnClick,
        markInboxNotificationAsRead,
        onClick,
        unread,
      ]
    );

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

    const handleMoreClick = useCallback((event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setMoreActionOpen((open) => !open);
    }, []);

    const handleMarkAsRead = useCallback(() => {
      markInboxNotificationAsRead(inboxNotification.id);
    }, [inboxNotification.id, markInboxNotificationAsRead]);

    const handleDelete = useCallback(() => {
      deleteInboxNotification(inboxNotification.id);
    }, [inboxNotification.id, deleteInboxNotification]);

    return (
      <TooltipProvider>
        <Component
          className={classNames(
            "lb-root lb-inbox-notification",
            showActions === "hover" &&
              "lb-inbox-notification:show-actions-hover",
            isMoreActionOpen && "lb-inbox-notification:action-open",
            className
          )}
          dir={$.dir}
          data-unread={unread ? "" : undefined}
          data-kind={inboxNotification.kind}
          onClick={handleClick}
          href={href}
          {...props}
          ref={forwardedRef}
        >
          {aside && <div className="lb-inbox-notification-aside">{aside}</div>}
          <div className="lb-inbox-notification-content">
            <div className="lb-inbox-notification-header">
              <span className="lb-inbox-notification-title">{title}</span>
              <div className="lb-inbox-notification-details">
                <span className="lb-inbox-notification-details-labels">
                  <Timestamp
                    locale={$.locale}
                    date={date}
                    className="lb-date lb-inbox-notification-date"
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
                        {unread ? (
                          <DropdownItem
                            onSelect={handleMarkAsRead}
                            onClick={stopPropagation}
                          >
                            <CheckIcon className="lb-dropdown-item-icon" />
                            {$.INBOX_NOTIFICATION_MARK_AS_READ}
                          </DropdownItem>
                        ) : null}
                        <DropdownItem
                          onSelect={handleDelete}
                          onClick={stopPropagation}
                        >
                          <DeleteIcon className="lb-dropdown-item-icon" />
                          {$.INBOX_NOTIFICATION_DELETE}
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
        </Component>
      </TooltipProvider>
    );
  }
);

function InboxNotificationIcon({
  className,
  ...props
}: InboxNotificationIconProps) {
  return (
    <div
      className={classNames("lb-inbox-notification-icon", className)}
      {...props}
    />
  );
}

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
    const thread = useInboxNotificationThread(inboxNotification.id);
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
              values={reversedUserIds.map((userId) => (
                <User key={userId} userId={userId} replaceSelf />
              ))}
              formatRemaining={$.LIST_REMAINING_USERS}
              truncate={INBOX_NOTIFICATION_THREAD_MAX_COMMENTS - 1}
              locale={$.locale}
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
            <User key={mentionUserId} userId={mentionUserId} />,
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
        inboxNotification={inboxNotification}
        aside={aside}
        title={title}
        date={date}
        unread={unread}
        overrides={overrides}
        href={resolvedHref}
        showActions={showActions}
        markAsReadOnClick={false}
        {...props}
        ref={forwardedRef}
      >
        {content}
      </InboxNotificationLayout>
    );
  }
);

/**
 * Displays a text mention notification kind.
 */
const InboxNotificationTextMention = forwardRef<
  HTMLAnchorElement,
  InboxNotificationTextMentionProps
>(
  (
    {
      inboxNotification,
      showActions = "hover",
      showRoomName = true,
      overrides,
      ...props
    },
    ref
  ) => {
    const $ = useOverrides(overrides);

    const unread = useMemo(() => {
      return (
        !inboxNotification.readAt ||
        inboxNotification.notifiedAt > inboxNotification.readAt
      );
    }, [inboxNotification.notifiedAt, inboxNotification.readAt]);

    return (
      <InboxNotificationLayout
        inboxNotification={inboxNotification}
        aside={<InboxNotificationAvatar userId={inboxNotification.createdBy} />}
        title={$.INBOX_NOTIFICATION_TEXT_MENTION(
          <User
            key={inboxNotification.createdBy}
            userId={inboxNotification.createdBy}
          />,
          showRoomName ? <Room roomId={inboxNotification.roomId} /> : undefined
        )}
        date={inboxNotification.notifiedAt}
        unread={unread}
        overrides={overrides}
        showActions={showActions}
        {...props}
        ref={ref}
      />
    );
  }
);

/**
 * Displays a custom notification kind.
 */
const InboxNotificationCustom = forwardRef<
  HTMLAnchorElement,
  InboxNotificationCustomProps
>(
  (
    {
      inboxNotification,
      showActions = "hover",
      title,
      aside,
      children,
      overrides,
      ...props
    },
    forwardedRef
  ) => {
    const unread = useMemo(() => {
      return (
        !inboxNotification.readAt ||
        inboxNotification.notifiedAt > inboxNotification.readAt
      );
    }, [inboxNotification.notifiedAt, inboxNotification.readAt]);

    return (
      <InboxNotificationLayout
        inboxNotification={inboxNotification}
        aside={aside}
        title={title}
        date={inboxNotification.notifiedAt}
        unread={unread}
        overrides={overrides}
        showActions={showActions}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </InboxNotificationLayout>
    );
  }
);

const InboxNotificationCustomMissing = forwardRef<
  HTMLAnchorElement,
  Omit<InboxNotificationCustomProps, "children" | "title" | "aside">
>(({ inboxNotification, ...props }, forwardedRef) => {
  return (
    <InboxNotificationCustom
      inboxNotification={inboxNotification}
      {...props}
      title={
        <>
          Custom notification kind <code>{inboxNotification.kind}</code> is not
          handled
        </>
      }
      aside={
        <InboxNotificationIcon>
          <MissingIcon />
        </InboxNotificationIcon>
      }
      ref={forwardedRef}
      data-missing=""
    >
      {/* TODO: Add link to the docs */}
      Notifications of this kind won’t be displayed in production. Use the{" "}
      <code>kinds</code> prop to define how they should be rendered.
    </InboxNotificationCustom>
  );
});

// Keeps track of which inbox notification kinds it has warned about already.
const inboxNotificationKindsWarnings: Set<string> = new Set();

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
      switch (inboxNotification.kind) {
        case "thread": {
          const ResolvedInboxNotificationThread =
            kinds?.thread ?? InboxNotificationThread;

          return (
            <ResolvedInboxNotificationThread
              inboxNotification={inboxNotification}
              {...props}
              ref={forwardedRef}
            />
          );
        }

        case "textMention": {
          const ResolvedInboxNotificationTextMention =
            kinds?.textMention ?? InboxNotificationTextMention;

          return (
            <ResolvedInboxNotificationTextMention
              inboxNotification={inboxNotification}
              {...props}
              ref={forwardedRef}
            />
          );
        }

        default: {
          const ResolvedInboxNotificationCustom =
            kinds?.[inboxNotification.kind];

          if (!ResolvedInboxNotificationCustom) {
            if (process.env.NODE_ENV !== "production") {
              if (!inboxNotificationKindsWarnings.has(inboxNotification.kind)) {
                inboxNotificationKindsWarnings.add(inboxNotification.kind);
                // TODO: Add link to the docs
                console.warn(
                  `Custom notification kind "${inboxNotification.kind}" is not handled so notifications of this kind will not be displayed in production. Use the kinds prop to define how they should be rendered.`
                );
              }

              return (
                <InboxNotificationCustomMissing
                  inboxNotification={inboxNotification}
                  {...props}
                  ref={forwardedRef}
                />
              );
            } else {
              // Don't render anything in production if this inbox notification kind is not defined.
              return null;
            }
          }

          return (
            <ResolvedInboxNotificationCustom
              inboxNotification={inboxNotification}
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
    TextMention: InboxNotificationTextMention,
    Custom: InboxNotificationCustom,
    Icon: InboxNotificationIcon,
    Avatar: InboxNotificationAvatar,
  }
);
