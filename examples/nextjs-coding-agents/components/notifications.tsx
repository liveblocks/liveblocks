"use client";

import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import type { InboxNotificationData } from "@liveblocks/client";
import clsx from "clsx";
import {
  BellIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  GitPullRequestIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AI_USER } from "@/app/database";
import { formatRelative } from "@/components/chat-list";

export function NotificationsButton({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { count } = useUnreadInboxNotificationsCount();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        title="Notifications"
        aria-expanded={open}
        className={clsx(
          "relative flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground",
          open && "bg-panel-hover text-foreground"
        )}
      >
        <BellIcon className="size-4" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute z-50 w-80 overflow-hidden rounded-lg border border-border bg-background shadow-xl",
            collapsed ? "left-full top-0 ml-2" : "left-0 top-[calc(100%+4px)]"
          )}
        >
          <NotificationsPanel onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function NotificationsPanel({ onNavigate }: { onNavigate: () => void }) {
  const { inboxNotifications } = useInboxNotifications();
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();
  const hasUnread = inboxNotifications.some((n) => n.readAt === null);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold">Notifications</span>
        <button
          type="button"
          onClick={() => markAllAsRead()}
          disabled={!hasUnread}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-panel-hover hover:text-foreground disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <CheckCheckIcon className="size-3" />
          Mark all read
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {inboxNotifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-subtle">
            You&apos;ll be notified here when the agent finishes a chat you took
            part in.
          </p>
        ) : (
          <ul>
            {inboxNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: InboxNotificationData;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const markAsRead = useMarkInboxNotificationAsRead();

  if (notification.kind !== "$agentRunCompleted") {
    return null;
  }

  const data = notification.activities[0]?.data;
  if (!data) {
    return null;
  }

  const unread = notification.readAt === null;

  const handleClick = () => {
    if (unread) {
      markAsRead(notification.id);
    }
    router.push(`/chat/${data.feedId}`);
    onNavigate();
  };

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={handleClick}
        className={clsx(
          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-panel-hover",
          unread && "bg-accent-soft/40"
        )}
      >
        <img
          src={AI_USER.info.avatar}
          alt=""
          className="mt-0.5 size-7 shrink-0 rounded-md bg-panel object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {data.chatTitle || "New chat"}
            </span>
            <span className="shrink-0 text-[11px] text-subtle">
              {formatRelative(notification.notifiedAt.getTime())}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
            {data.failed ? (
              <CircleAlertIcon className="mr-1 inline size-3 text-danger" />
            ) : null}
            {data.summary}
          </span>
          {data.prUrl ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-success">
              <GitPullRequestIcon className="size-3" />
              Pull request opened
            </span>
          ) : null}
        </span>
        {unread ? (
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
        ) : null}
      </button>
    </li>
  );
}
