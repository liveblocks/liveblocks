"use client";

import type { InboxNotificationData } from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import React, { forwardRef } from "react";

import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { Avatar, type AvatarProps } from "./internal/Avatar";

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
  return (
    <InboxNotificationLayout
      aside={<InboxNotificationAvatar userId="TODO" />}
      title="Lorem Ipsum commented on Lorem Ipsum"
      date="01-01-01"
      {...props}
      ref={forwardedRef}
    >
      content: list of comments
    </InboxNotificationLayout>
  );
});
