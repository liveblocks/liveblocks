"use client";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { formatTime } from "@/components/message";
import type { ChatMessage } from "@/lib/activity";
import { InlineMarkdown } from "@/lib/markdown";

// One row in a list of conversations or notifications: an avatar, a title
// line with a timestamp and unread indicator, and a preview underneath.
// Shared by the Activity panel and the DMs tab so they look the same.
export function PreviewRow({
  active,
  unread,
  user,
  online,
  title,
  time,
  indicator,
  actions,
  onOpen,
  children,
}: {
  active: boolean;
  unread: boolean;
  user: Liveblocks["UserMeta"] | undefined;
  // When set, draws a presence dot on the avatar
  online?: boolean;
  title: ReactNode;
  time?: number;
  // Shown at the end of the title line while unread, e.g. a dot or a count
  indicator?: ReactNode;
  // Hover-only controls, positioned over the indicator's spot
  actions?: ReactNode;
  onOpen: () => void;
  // The preview underneath the title
  children: ReactNode;
}) {
  return (
    <li
      className={clsx(
        "group relative",
        active ? "bg-neutral-100" : unread ? "bg-brand-50/60" : undefined
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={clsx(
          "flex w-full items-start gap-2.5 px-4 py-3 text-left transition",
          active
            ? "hover:bg-neutral-100"
            : unread
              ? "hover:bg-brand-50"
              : "hover:bg-neutral-50"
        )}
      >
        <Avatar
          user={user}
          size="lg"
          online={online}
          className={clsx("mt-0.5", !unread && "opacity-75")}
          ringClassName={
            active
              ? "border-neutral-100"
              : unread
                ? "border-brand-50"
                : "border-white"
          }
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={clsx(
                "flex min-w-0 flex-1 items-center gap-2 text-sm",
                unread ? "font-semibold text-neutral-800" : "text-neutral-500"
              )}
            >
              {title}
            </span>
            {time !== undefined ? (
              <time
                className={clsx(
                  "shrink-0 text-xs",
                  unread
                    ? "font-semibold text-neutral-700"
                    : "text-neutral-500"
                )}
                dateTime={new Date(time).toISOString()}
              >
                {formatTime(time)}
              </time>
            ) : null}
            {unread && indicator ? (
              <span
                className={clsx(
                  "flex h-5 min-w-5 shrink-0 items-center justify-center",
                  // Make room for the hover actions
                  actions && "group-hover:invisible"
                )}
              >
                {indicator}
              </span>
            ) : null}
          </span>
          <span
            className={clsx(
              "mt-0.5 block text-sm",
              unread ? "font-semibold text-neutral-800" : "text-neutral-600"
            )}
          >
            {children}
          </span>
        </span>
      </button>
      {actions ? (
        <span className="absolute right-4 top-3 flex h-5 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {actions}
        </span>
      ) : null}
    </li>
  );
}

export function UnreadDot() {
  return <span className="size-2 rounded-full bg-brand-500" aria-hidden />;
}

// The body of a chat message, condensed to a couple of lines
export function MessagePreview({
  message,
  prefix,
}: {
  message: ChatMessage;
  prefix?: ReactNode;
}) {
  if (message.data.streaming && !message.data.content) {
    return (
      <span className="flex items-center gap-2 text-neutral-500">
        <LoaderCircle className="size-4 animate-spin" />
        Thinking…
      </span>
    );
  }

  return (
    <span className="line-clamp-2">
      {prefix}
      <InlineMarkdown content={message.data.content} />
    </span>
  );
}

export function PreviewSkeleton() {
  return (
    <span className="inline-block h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
  );
}
