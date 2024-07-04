"use client";

import type { ComponentPropsWithoutRef } from "react";
import React, { Children, forwardRef } from "react";

import { classNames } from "../utils/class-names";

export type InboxNotificationListProps = ComponentPropsWithoutRef<"ol">;

/**
 * Displays inbox notifications as a list.
 *
 * @example
 * <InboxNotificationList>
 *   {inboxNotifications.map((inboxNotification) => (
 *     <InboxNotification key={inboxNotification.id} inboxNotification={inboxNotification} />
 *   ))}
 * </InboxNotificationList>
 */
export const InboxNotificationList = forwardRef<
  HTMLOListElement,
  InboxNotificationListProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ol
      className={classNames("lb-root lb-inbox-notification-list", className)}
      {...props}
      ref={forwardedRef}
    >
      {Children.map(children, (child, index) => (
        <li key={index} className="lb-inbox-notification-list-item">
          {child}
        </li>
      ))}
    </ol>
  );
});
