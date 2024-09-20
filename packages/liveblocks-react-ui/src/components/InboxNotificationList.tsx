"use client";

import type { ComponentPropsWithoutRef } from "react";
import React, { Children, forwardRef, useRef } from "react";

import { classNames } from "../utils/class-names";
import { useVisibleCallback } from "../utils/use-visible";

export interface InboxNotificationListProps
  extends ComponentPropsWithoutRef<"ol"> {
  onReachEnd?: () => void;
}

function ReachEndMarker({
  enabled,
  onReachEnd,
}: {
  enabled: boolean;
  onReachEnd: () => void;
}) {
  const markerRef = useRef<HTMLDivElement>(null);

  useVisibleCallback(markerRef, onReachEnd, {
    enabled,
  });

  return <div ref={markerRef} style={{ height: 0 }} />;
}

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
>(({ onReachEnd, children, className, ...props }, forwardedRef) => {
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
      {/* Render an invisible marker at the end which is tied to an IntersectionObserver to be alerted when the end of the list has been reached */}
      {onReachEnd && (
        <ReachEndMarker
          onReachEnd={onReachEnd}
          enabled={Children.count(children) > 0}
        />
      )}
    </ol>
  );
});
