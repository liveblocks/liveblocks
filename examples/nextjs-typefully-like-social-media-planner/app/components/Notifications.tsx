"use client";

import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
  ClientSideSuspense,
  useDeleteAllInboxNotifications,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { Loading } from "./Loading";
import * as Dialog from "@radix-ui/react-dialog";
import { InboxIcon } from "../icons/InboxIcon";
import { MailReadIcon } from "../icons/MailReadIcon";
import { MailDeleteIcon } from "../icons/MailDeleteIcon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Render a Radix UI dialog with notifications inside
export function Notifications() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="flex relative items-center justify-between whitespace-nowrap rounded-md font-medium transition-colors w-full px-2 py-1.5 hover:bg-gray-200/80">
        <div className="flex items-center gap-1.5 flex-1 text-sm text-gray-700 pointer-events-none">
          <InboxIcon className="w-5 h-5" />
          Inbox
        </div>

        <ClientSideSuspense fallback={null}>
          <UnreadNotificationsCount />
        </ClientSideSuspense>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content className="bg-white shadow-xl border-r text-sm overflow-hidden w-[380px] z-20 fixed top-0 left-[240px] bottom-0">
          <VisuallyHidden>
            <Dialog.Title>Notifications</Dialog.Title>
          </VisuallyHidden>
          <ClientSideSuspense fallback={<Loading />}>
            <Inbox />
          </ClientSideSuspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Show number of unread notifications in a badge
function UnreadNotificationsCount() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) {
    return null;
  }

  return (
    <span className="text-[10px] inline-flex items-center p-1 bg-blue-500 text-white justify-center rounded w-4 h-4">
      {count}
    </span>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();
  const markAllNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
  const deleteAllNotifications = useDeleteAllInboxNotifications();
  const { count } = useUnreadInboxNotificationsCount();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar with buttons */}
      <div className="flex py-1.5 px-3 border-b border-border justify-end gap-1.5 flex-0">
        <button
          className="inline-flex gap-1.5 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
          disabled={count === 0}
          onClick={markAllNotificationsAsRead}
        >
          <MailReadIcon className="w-4 h-4 opacity-70" />
          Mark all as read
        </button>
        <button
          className="inline-flex gap-1.5 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-2 hover:bg-gray-100 text-red-600 hover:text-red-700"
          disabled={inboxNotifications.length === 0}
          onClick={deleteAllNotifications}
        >
          <MailDeleteIcon className="w-4 h-4 opacity-70" />
          Delete all
        </button>
      </div>

      {/* Render a list of notifications */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          {inboxNotifications.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <InboxNotificationList>
              {inboxNotifications.map((inboxNotification) => {
                return (
                  <InboxNotification
                    key={inboxNotification.id}
                    inboxNotification={inboxNotification}
                    components={{
                      Anchor: (props) =>
                        // When clicking on a notification, use next/link component
                        props.href ? (
                          <Link {...props} href={props.href} />
                        ) : (
                          <a {...props} />
                        ),
                    }}
                  />
                );
              })}
            </InboxNotificationList>
          )}
        </div>
      </div>
    </div>
  );
}
