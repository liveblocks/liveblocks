"use client";

import { Suspense } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { BellIcon } from "lucide-react";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { Button } from "@/components/ui/button";

export function NotificationsPopover() {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
          <Suspense fallback={null}>
            <UnreadBadge />
          </Suspense>
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-1000 w-[380px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <Inbox />
          </Suspense>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function UnreadBadge() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) {
    return null;
  }

  return (
    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <>
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={inboxNotifications.length === 0}
          onClick={markAllAsRead}
        >
          Mark all as read
        </Button>
      </div>

      <div className="max-h-[480px] overflow-auto">
        {inboxNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <InboxNotificationList>
            {inboxNotifications.map((inboxNotification) => (
              <InboxNotification
                key={inboxNotification.id}
                inboxNotification={inboxNotification}
              />
            ))}
          </InboxNotificationList>
        )}
      </div>
    </>
  );
}
