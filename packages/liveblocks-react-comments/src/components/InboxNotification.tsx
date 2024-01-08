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

interface InboxNotificationLayoutProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * TODO: JSDoc
   */
  aside: ReactNode;

  /**
   * TODO: JSDoc
   */
  description: ReactNode;

  /**
   * TODO: JSDoc
   */
  date: Date | string | number;
}

const InboxNotificationLayout = forwardRef<
  HTMLDivElement,
  InboxNotificationLayoutProps
>(
  (
    { children, aside, description, date, className, ...props },
    forwardedRef
  ) => {
    const $ = useOverrides();

    return (
      <div
        className={classNames("lb-root lb-inbox-notification", className)}
        dir={$.dir}
        {...props}
        ref={forwardedRef}
      >
        <div className="lb-inbox-notification-aside">{aside}</div>
        <div className="lb-inbox-notification-content">
          <div className="lb-inbox-notification-header">
            <span className="lb-inbox-notification-description">
              {description}
            </span>
            <div className="lb-inbox-notification-date">
              <Timestamp
                date={date}
                className="lb-inbox-notification-date-timestamp"
              />
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
      description="TODO"
      date="TODO"
      {...props}
      ref={forwardedRef}
    >
      content: list of comments
    </InboxNotificationLayout>
  );
});
