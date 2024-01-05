"use client";

import type { InboxNotificationData } from "@liveblocks/core";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef } from "react";

import { useOverrides } from "../overrides";
import { classNames } from "../utils/class-names";

export interface InboxNotificationProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationData;
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
>(({ inboxNotification, className, ...props }, forwardedRef) => {
  const $ = useOverrides();

  return (
    <div
      className={classNames("lb-root lb-inbox-notification", className)}
      dir={$.dir}
      {...props}
      ref={forwardedRef}
    >
      {inboxNotification.id}
    </div>
  );
});
