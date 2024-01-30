"use client";

import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";
import * as Popover from "@radix-ui/react-popover";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "../../liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Loading } from "./Loading";
import { ComponentPropsWithoutRef, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import clsx from "clsx";
import { Link } from "./Link";
import { usePathname } from "next/navigation";
import { getDocumentFromRoomId } from "../utils/ids";

function InboxList(props: ComponentPropsWithoutRef<"ol">) {
  const { inboxNotifications } = useInboxNotifications();

  return inboxNotifications.length === 0 ? (
    <div className="empty">There aren’t any notifications yet.</div>
  ) : (
    <InboxNotificationList {...props}>
      {inboxNotifications.map((inboxNotification) => {
        const href = getDocumentFromRoomId(inboxNotification.roomId);

        return (
          <InboxNotification
            key={inboxNotification.id}
            inboxNotification={inboxNotification}
            components={{ Anchor: Link }}
            href={href}
          />
        );
      })}
    </InboxNotificationList>
  );
}

function InboxPopoverUnreadCount() {
  const { count } = useUnreadInboxNotificationsCount();

  return count ? <div className="inbox-unread-count">{count}</div> : null;
}

export function InboxPopover({
  className,
  ...props
}: Popover.PopoverContentProps) {
  const pathname = usePathname();
  const [isOpen, setOpen] = useState(false);
  const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();

  // Close the popover when navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger className="button square">
        <ErrorBoundary fallback={null}>
          <ClientSideSuspense fallback={null}>
            {() => <InboxPopoverUnreadCount />}
          </ClientSideSuspense>
        </ErrorBoundary>
        <svg
          width="20"
          height="20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m3.6 9.8 1.9-4.6A2 2 0 0 1 7.3 4h5.4a2 2 0 0 1 1.8 1.2l2 4.6V13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 10h3c.3 0 .6.1.8.4l.9 1.2c.2.3.5.4.8.4h2c.3 0 .6-.1.8-.4l.9-1.2c.2-.3.5-.4.8-.4h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={clsx(className, "inbox")}
          collisionPadding={16}
          sideOffset={8}
          // Keep the popover open when interacting outside to debug some scenarios
          onInteractOutside={(event) => event.preventDefault()}
          {...props}
        >
          <div className="inbox-header">
            <span className="inbox-title">Notifications</span>
            <button
              className="button"
              onClick={markAllInboxNotificationsAsRead}
            >
              Mark all as read
            </button>
          </div>
          <ErrorBoundary
            fallback={
              <div className="error">
                There was an error while getting notifications.
              </div>
            }
          >
            <ClientSideSuspense fallback={<Loading />}>
              {() => <InboxList />}
            </ClientSideSuspense>
          </ErrorBoundary>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
